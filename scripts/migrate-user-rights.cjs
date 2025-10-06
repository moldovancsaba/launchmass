// Functional: Idempotent migration script for user rights management system
// Strategic: Adds organizationMembers collection with indexes and isSuperAdmin field to users;
// seeds initial super admins from environment variable or defaults to first user by createdAt;
// designed to be run multiple times safely without data corruption

// Why CommonJS: Migration scripts run in Node.js directly (not Next.js) and need CommonJS
// for compatibility with existing database connection patterns in other migration scripts

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// Functional: ISO 8601 UTC timestamp with milliseconds (project standard)
// Strategic: Consistent timestamp format across all database records for compliance
function nowISO() {
  return new Date().toISOString();
}

// Functional: Main migration execution function
// Strategic: Wraps all migration logic for clean error handling and connection cleanup
async function migrate() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'launchmass';

  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  console.log('🚀 Starting user rights migration...');
  console.log(`📦 Database: ${dbName}`);

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);

    // ===================================================================
    // Step 1: Create organizationMembers collection and indexes
    // ===================================================================

    console.log('\n📋 Step 1: organizationMembers collection');

    const orgMembersCol = db.collection('organizationMembers');

    // Functional: Check if collection already has documents (idempotency check)
    // Strategic: Skip index creation only if collection is non-empty; allows re-running after partial failures
    let existingMemberCount = 0;
    try {
      existingMemberCount = await orgMembersCol.countDocuments({});
      console.log(`ℹ️  Collection exists with ${existingMemberCount} documents`);
    } catch (err) {
      // Functional: Collection doesn't exist yet, that's okay
      // Strategic: MongoDB creates collections on first insert, but we create it explicitly for indexes
      console.log('ℹ️  Collection doesn\'t exist yet, will be created');
    }

    // Functional: List existing indexes to avoid duplicate creation
    // Strategic: createIndex with unique constraint fails if index exists, so we check first
    let existingIndexes = [];
    try {
      existingIndexes = await orgMembersCol.indexes();
    } catch (err) {
      // Collection doesn't exist yet, no indexes
      existingIndexes = [];
    }
    const indexNames = existingIndexes.map(idx => idx.name);

    console.log('📊 Existing indexes:', indexNames.join(', '));

    // Functional: Create unique compound index on orgUuid + ssoUserId
    // Strategic: Enforces one membership per user per org; enables fast membership lookups
    if (!indexNames.includes('orgUuid_1_ssoUserId_1')) {
      console.log('🔧 Creating unique compound index { orgUuid: 1, ssoUserId: 1 }...');
      await orgMembersCol.createIndex(
        { orgUuid: 1, ssoUserId: 1 },
        { unique: true, name: 'orgUuid_1_ssoUserId_1' }
      );
      console.log('✅ Compound index created');
    } else {
      console.log('✓ Compound index already exists');
    }

    // Functional: Create secondary index on ssoUserId for user-scoped queries
    // Strategic: Enables fast "list all orgs for user" queries
    if (!indexNames.includes('ssoUserId_1')) {
      console.log('🔧 Creating index { ssoUserId: 1 }...');
      await orgMembersCol.createIndex({ ssoUserId: 1 });
      console.log('✅ ssoUserId index created');
    } else {
      console.log('✓ ssoUserId index already exists');
    }

    // Functional: Create compound index on orgUuid + role for admin counts
    // Strategic: Optimizes countOrgAdmins() query for last-admin protection
    if (!indexNames.includes('orgUuid_1_role_1')) {
      console.log('🔧 Creating index { orgUuid: 1, role: 1 }...');
      await orgMembersCol.createIndex({ orgUuid: 1, role: 1 });
      console.log('✅ orgUuid+role index created');
    } else {
      console.log('✓ orgUuid+role index already exists');
    }

    // ===================================================================
    // Step 2: Add isSuperAdmin field to users collection
    // ===================================================================

    console.log('\n👥 Step 2: users collection - add isSuperAdmin field');

    const usersCol = db.collection('users');

    // Functional: Count users missing isSuperAdmin field (idempotency check)
    // Strategic: Only update users that haven't been migrated yet
    const usersWithoutField = await usersCol.countDocuments({ isSuperAdmin: { $exists: false } });

    if (usersWithoutField > 0) {
      console.log(`🔧 Adding isSuperAdmin: false to ${usersWithoutField} users...`);
      const result = await usersCol.updateMany(
        { isSuperAdmin: { $exists: false } },
        { $set: { isSuperAdmin: false, updatedAt: nowISO() } }
      );
      console.log(`✅ Updated ${result.modifiedCount} users`);
    } else {
      console.log('✓ All users already have isSuperAdmin field');
    }

    // ===================================================================
    // Step 3: Seed initial super admins
    // ===================================================================

    console.log('\n🔑 Step 3: Seed super admins');

    // Functional: Read SUPERADMINS from env (comma-separated emails or ssoUserIds)
    // Strategic: Allows explicit super admin designation; production safety via env config
    const superAdminsEnv = process.env.SUPERADMINS || '';
    const superAdminList = superAdminsEnv
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (superAdminList.length > 0) {
      console.log(`📝 SUPERADMINS env found: ${superAdminList.length} entries`);
      let promoted = 0;

      for (const identifier of superAdminList) {
        // Functional: Try matching by email first (more user-friendly), fallback to ssoUserId
        // Strategic: Supports both email and ssoUserId formats for flexibility
        const query = identifier.includes('@')
          ? { email: identifier }
          : { ssoUserId: identifier };

        const updateResult = await usersCol.updateOne(
          { ...query, isSuperAdmin: { $ne: true } },
          { $set: { isSuperAdmin: true, updatedAt: nowISO() } }
        );

        if (updateResult.modifiedCount > 0) {
          console.log(`✅ Promoted ${identifier} to super admin`);
          promoted++;
        } else {
          // Functional: Check if user exists but is already super admin
          const existing = await usersCol.findOne(query);
          if (existing?.isSuperAdmin) {
            console.log(`✓ ${identifier} is already super admin`);
          } else {
            console.log(`⚠️  User not found: ${identifier}`);
          }
        }
      }

      console.log(`\n✅ Super admin setup complete: ${promoted} newly promoted`);
    } else {
      console.log('ℹ️  No SUPERADMINS env variable found');
      
      // Functional: Fallback to promoting the first user by createdAt
      // Strategic: Ensures at least one super admin exists for system bootstrapping
      const firstUser = await usersCol.findOne({}, { sort: { createdAt: 1 } });

      if (firstUser) {
        if (!firstUser.isSuperAdmin) {
          console.log(`🔧 Promoting first user to super admin: ${firstUser.email}`);
          await usersCol.updateOne(
            { _id: firstUser._id },
            { $set: { isSuperAdmin: true, updatedAt: nowISO() } }
          );
          console.log('✅ First user promoted to super admin');
        } else {
          console.log(`✓ First user (${firstUser.email}) is already super admin`);
        }
      } else {
        console.log('⚠️  No users found in database - super admin will be set on first SSO login');
      }
    }

    // ===================================================================
    // Step 4: Migration complete summary
    // ===================================================================

    console.log('\n📊 Migration Summary:');
    const finalSuperAdminCount = await usersCol.countDocuments({ isSuperAdmin: true });
    const finalMemberCount = await orgMembersCol.countDocuments({});
    const finalUserCount = await usersCol.countDocuments({});

    console.log(`  - Total users: ${finalUserCount}`);
    console.log(`  - Super admins: ${finalSuperAdminCount}`);
    console.log(`  - Organization memberships: ${finalMemberCount}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Restart your Next.js dev server (npm run dev)');
    console.log('  2. Visit /admin to verify super admin access');
    console.log('  3. Create organizations and assign members via admin UI');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Functional: Execute migration with top-level error handling
// Strategic: Ensures clean exit codes for CI/CD integration
migrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });

// ===================================================================
// ROLLBACK INSTRUCTIONS (for emergency use only)
// ===================================================================
// 
// To rollback this migration:
//
// 1. Remove isSuperAdmin field from all users:
//    db.users.updateMany({}, { $unset: { isSuperAdmin: "" } })
//
// 2. Drop organizationMembers collection:
//    db.organizationMembers.drop()
//
// 3. Restart API and admin UI to clear any cached permission checks
//
// WARNING: Rollback will break permission checks if new code is deployed.
// Only rollback if reverting to pre-permission-system codebase.
// ===================================================================
