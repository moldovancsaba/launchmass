#!/usr/bin/env node
/**
 * Find Launchmass OAuth client in SSO database
 */

import { MongoClient } from 'mongodb';

const SSO_MONGODB_URI = 'mongodb+srv://thanperfect:CuW54NNNFKnGQtt6@doneisbetter.49s2z.mongodb.net';

async function findClient() {
  const client = new MongoClient(SSO_MONGODB_URI);
  
  try {
    console.log('Connecting to SSO database...');
    await client.connect();
    
    const db = client.db('sso');
    const oauthClients = db.collection('oauthClients');
    
    // Search for Launchmass by name
    console.log('\nSearching for Launchmass OAuth client...\n');
    
    const launchmassClient = await oauthClients.findOne(
      { name: { $regex: /launchmass/i } }
    );
    
    if (launchmassClient) {
      console.log('✅ Found Launchmass OAuth client:');
      console.log(JSON.stringify({
        client_id: launchmassClient.client_id,
        name: launchmassClient.name,
        grant_types: launchmassClient.grant_types,
        allowed_scopes: launchmassClient.allowed_scopes,
        status: launchmassClient.status
      }, null, 2));
    } else {
      console.log('❌ No Launchmass OAuth client found');
      console.log('\nListing all OAuth clients:');
      const allClients = await oauthClients.find({}).project({ name: 1, client_id: 1, _id: 0 }).toArray();
      console.log(JSON.stringify(allClients, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

findClient();
