#!/usr/bin/env node

/**
 * Organization Roles Migration Script
 * 
 * Purpose: Create organizationRoles collection and seed system roles for all organizations
 * Usage: node scripts/migrate-organization-roles.mjs
 * 
 * This script:
 * 1. Creates organizationRoles collection with indexes
 * 2. Defines system roles (admin, user) based on PERMISSIONS_DESIGN.md
 * 3. Seeds all existing organizations with system roles
 * 4. Maintains backward compatibility with existing admin/user role strings
 * 
 * Safe to run multiple times (idempotent)
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'launchmass';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// System role definitions from PERMISSIONS_DESIGN.md
const SYSTEM_ROLES = {
  admin: {
    roleId: 'admin',
    roleName: 'Administrator',
    isSystem: true,
    description: 'Full access to all organization resources and settings',
    permissions: [
      'org.read', 'org.write', 'org.delete',
      'cards.read', 'cards.create', 'cards.update', 'cards.delete', 'cards.reorder',
      'members.read', 'members.invite', 'members.remove', 'members.edit_roles',
      'roles.read', 'roles.write',
      'tags.read', 'tags.write'
    ]
  },
  user: {
    roleId: 'user',
    roleName: 'User',
    isSystem: true,
    description: 'Standard user access with card management permissions',
    permissions: [
      'cards.read', 'cards.create', 'cards.update', 'cards.delete',
      'members.read',
      'tags.read'
    ]
  }
};

async function migrateOrganizationRoles() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    const rolesCol = db.collection('organizationRoles');
    const orgsCol = db.collection('organizations');
    
    console.log('🏗️  Organization Roles Migration\n');
    console.log('═'.repeat(80));
    
    // Step 1: Create indexes for organizationRoles
    console.log('\n📊 Step 1: Creating indexes...');
    
    const indexes = [
      { keys: { orgUuid: 1, roleId: 1 }, options: { name: 'orgUuid_1_roleId_1', unique: true } },
      { keys: { orgUuid: 1, isSystem: 1 }, options: { name: 'orgUuid_1_isSystem_1' } }
    ];
    
    for (const { keys, options } of indexes) {
      try {
        await rolesCol.createIndex(keys, options);
        console.log(`   ✅ Created index: ${options.name}`);
      } catch (err) {
        if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
          console.log(`   ✓ Index ${options.name} already exists`);
        } else {
          throw err;
        }
      }
    }
    
    // Step 2: Get all organizations
    console.log('\n📦 Step 2: Loading organizations...');
    const organizations = await orgsCol.find({ isActive: true }).toArray();
    console.log(`   Found ${organizations.length} active organizations`);
    
    if (organizations.length === 0) {
      console.log('\n⚠️  No organizations found. Nothing to seed.');
      console.log('   Create organizations first, then run this migration.\n');
      return;
    }
    
    // Step 3: Seed system roles for each organization
    console.log('\n🌱 Step 3: Seeding system roles...');
    
    let created = 0;
    let existing = 0;
    let errors = 0;
    
    for (const org of organizations) {
      const orgUuid = org.uuid;
      const orgName = org.name || org.slug;
      
      console.log(`\n   Organization: ${orgName} (${orgUuid})`);
      
      for (const [roleId, roleData] of Object.entries(SYSTEM_ROLES)) {
        try {
          const existingRole = await rolesCol.findOne({ orgUuid, roleId });
          
          if (existingRole) {
            console.log(`      ✓ ${roleId} (already exists)`);
            existing++;
          } else {
            const now = new Date().toISOString();
            const roleDoc = {
              ...roleData,
              orgUuid,
              createdAt: now,
              updatedAt: now,
              createdBy: 'system' // System-created role
            };
            
            await rolesCol.insertOne(roleDoc);
            console.log(`      ✅ ${roleId} (created)`);
            created++;
          }
        } catch (err) {
          console.log(`      ❌ ${roleId} (error: ${err.message})`);
          errors++;
        }
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 Migration Summary:');
    console.log(`   Organizations processed: ${organizations.length}`);
    console.log(`   Roles created: ${created}`);
    console.log(`   Roles existing: ${existing}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total roles: ${created + existing}`);
    
    if (errors > 0) {
      console.log('\n⚠️  Some roles failed to create. Review errors above.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
    
    // Step 4: Verification
    console.log('\n🔍 Step 4: Verifying migration...');
    const totalRoles = await rolesCol.countDocuments({ isSystem: true });
    const expectedRoles = organizations.length * Object.keys(SYSTEM_ROLES).length;
    
    console.log(`   Expected: ${expectedRoles} system roles`);
    console.log(`   Found: ${totalRoles} system roles`);
    
    if (totalRoles === expectedRoles) {
      console.log(`   ✅ Verification passed!`);
    } else {
      console.log(`   ⚠️  Mismatch detected. Some roles may be missing.`);
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Run: node scripts/create-indexes.mjs');
    console.log('   2. Update lib/permissions.js with getOrgRole() function');
    console.log('   3. Test backward compatibility with existing admin/user roles\n');
    
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ Database connection closed\n');
  }
}

// Run migration
migrateOrganizationRoles();
