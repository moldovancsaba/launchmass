/**
 * Migration script: Create default organization and assign existing cards
 * 
 * WHAT: Creates a 'default' organization and moves all orphaned cards to it
 * WHY: Existing cards need to belong to an organization for proper management
 * HOW: Creates org with admin membership, updates cards with orgUuid
 * 
 * Usage: node scripts/migrate-default-org.cjs
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function migrate() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'launchmass';
  
  if (!uri) {
    console.error('ERROR: MONGODB_URI not set in environment');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    const orgsCol = db.collection('organizations');
    const cardsCol = db.collection('cards');
    const membersCol = db.collection('organizationMembers');
    const usersCol = db.collection('users');
    
    // STEP 1: Check if default organization already exists
    console.log('\nStep 1: Checking for existing default organization...');
    let defaultOrg = await orgsCol.findOne({ slug: 'default' });
    
    if (defaultOrg) {
      console.log('✓ Default organization already exists:', defaultOrg.name);
    } else {
      // STEP 2: Create default organization
      console.log('\nStep 2: Creating default organization...');
      const now = new Date().toISOString();
      const uuid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      
      defaultOrg = {
        uuid,
        name: 'Default',
        slug: 'default',
        description: 'Default organization for existing cards',
        isActive: true,
        isDefault: true, // Mark as default view
        useSlugAsPublicUrl: true, // Enable slug-based URL
        createdAt: now,
        updatedAt: now,
      };
      
      await orgsCol.insertOne(defaultOrg);
      console.log('✓ Created default organization:', defaultOrg.name, '(UUID:', defaultOrg.uuid + ')');
      
      // STEP 3: Find a superadmin user to add as admin
      console.log('\nStep 3: Adding admin membership...');
      const superAdmin = await usersCol.findOne({ 
        $or: [
          { isSuperAdmin: true },
          { appRole: 'superadmin' }
        ]
      });
      
      if (superAdmin) {
        await membersCol.insertOne({
          orgUuid: defaultOrg.uuid,
          ssoUserId: superAdmin.ssoUserId,
          role: 'admin',
          addedBy: 'migration-script',
          addedAt: now,
          updatedAt: now,
        });
        console.log('✓ Added', superAdmin.email, 'as admin of default organization');
      } else {
        console.log('⚠ No superadmin found - you\'ll need to manually add an admin');
      }
    }
    
    // STEP 4: Count cards without orgUuid
    console.log('\nStep 4: Finding cards without organization...');
    const orphanedCards = await cardsCol.countDocuments({ 
      $or: [
        { orgUuid: { $exists: false } },
        { orgUuid: null },
        { orgUuid: '' }
      ]
    });
    
    console.log('Found', orphanedCards, 'cards without organization');
    
    if (orphanedCards > 0) {
      // STEP 5: Update cards to belong to default organization
      console.log('\nStep 5: Assigning cards to default organization...');
      const result = await cardsCol.updateMany(
        {
          $or: [
            { orgUuid: { $exists: false } },
            { orgUuid: null },
            { orgUuid: '' }
          ]
        },
        {
          $set: {
            orgUuid: defaultOrg.uuid,
            orgSlug: defaultOrg.slug,
            updatedAt: new Date().toISOString()
          }
        }
      );
      
      console.log('✓ Updated', result.modifiedCount, 'cards');
    } else {
      console.log('✓ All cards already have an organization');
    }
    
    // STEP 6: Summary
    console.log('\n' + '='.repeat(50));
    console.log('Migration completed successfully!');
    console.log('='.repeat(50));
    console.log('Default organization UUID:', defaultOrg.uuid);
    console.log('Default organization slug:', defaultOrg.slug);
    console.log('Cards in default org:', await cardsCol.countDocuments({ orgUuid: defaultOrg.uuid }));
    console.log('\nYou can now:');
    console.log('- View cards at: https://launchmass.doneisbetter.com/organization/default');
    console.log('- Manage cards at: https://launchmass.doneisbetter.com/organization/default/admin');
    console.log('- Or manage via: https://launchmass.doneisbetter.com/admin (select "Default" org)');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDatabase connection closed.');
  }
}

migrate();
