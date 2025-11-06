// Debug script to see full member records
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'launchmass';

async function check() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  
  const org = await db.collection('organizations').findOne({ slug: 'default' });
  const members = await db.collection('organizationMembers').find({ orgUuid: org.uuid }).toArray();
  
  console.log('Full member records:');
  console.log(JSON.stringify(members, null, 2));
  
  await client.close();
}

check().catch(console.error);
