// Script to check default organization membership
// WHAT: Verify which users are members of the default organization
// WHY: Debug "Failed to set default" issue - user needs admin membership

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'launchmass';

async function check() {
  const client = new MongoClient(uri);
  await client.connect();
  console.log('✓ Connected to MongoDB');
  
  const db = client.db(dbName);
  
  // Get default org
  const org = await db.collection('organizations').findOne({ slug: 'default' });
  if (!org) {
    console.log('❌ Default organization not found');
    await client.close();
    return;
  }
  
  console.log('\n📋 Default Organization:');
  console.log('  Name:', org.name);
  console.log('  UUID:', org.uuid);
  console.log('  Slug:', org.slug);
  console.log('  isDefault:', org.isDefault);
  console.log('  useSlugAsPublicUrl:', org.useSlugAsPublicUrl);
  
  // Check members
  const members = await db.collection('organizationMembers').find({ orgUuid: org.uuid }).toArray();
  console.log('\n👥 Members:', members.length);
  if (members.length === 0) {
    console.log('  ❌ No members found!');
  } else {
    members.forEach(m => {
      console.log(`  - ${m.userEmail} (${m.role})`);
    });
  }
  
  // Check users
  const users = await db.collection('users').find({}).toArray();
  console.log('\n👤 All Users:', users.length);
  users.forEach(u => {
    console.log(`  - ${u.email} (ssoUserId: ${u.ssoUserId}, appStatus: ${u.appStatus}, appRole: ${u.appRole})`);
  });
  
  await client.close();
}

check().catch(console.error);
