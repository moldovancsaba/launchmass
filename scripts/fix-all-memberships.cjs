require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function fix() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(process.env.DB_NAME || 'launchmass');
    
    const ssoUserId = 'eea56c57-d8c0-431a-8cff-181817646777'; // sso@doneisbetter.com
    const now = new Date().toISOString();
    
    const allOrgs = await db.collection('organizations').find({}).toArray();
    console.log('Found', allOrgs.length, 'organizations\n');
    
    for (const org of allOrgs) {
      console.log(`Checking ${org.name} (${org.slug})...`);
      const exists = await db.collection('organizationMembers').findOne({ 
        orgUuid: org.uuid, 
        ssoUserId 
      });
      
      if (!exists) {
        await db.collection('organizationMembers').insertOne({
          orgUuid: org.uuid,
          ssoUserId,
          role: 'admin',
          addedBy: 'fix-script',
          addedAt: now,
          updatedAt: now,
        });
        console.log(`✓ Added membership to ${org.name}`);
      } else {
        console.log(`- Already a member of ${org.name}`);
      }
    }
    
    await client.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fix();
