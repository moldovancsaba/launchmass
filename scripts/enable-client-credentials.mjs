#!/usr/bin/env node
/**
 * Enable client_credentials grant for Launchmass OAuth client
 * 
 * WHAT: Updates SSO oauthClients collection to enable client_credentials grant
 * WHY: Required for bidirectional permission sync (Phase 5)
 * HOW: Adds "client_credentials" to grant_types and "manage_permissions" to allowed_scopes
 */

import { MongoClient } from 'mongodb';

const SSO_MONGODB_URI = 'mongodb+srv://thanperfect:CuW54NNNFKnGQtt6@doneisbetter.49s2z.mongodb.net';
const LAUNCHMASS_CLIENT_ID = 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f';

async function updateOAuthClient() {
  const client = new MongoClient(SSO_MONGODB_URI);
  
  try {
    console.log('Connecting to SSO database...');
    await client.connect();
    
    const db = client.db('sso');
    const oauthClients = db.collection('oauthClients');
    
    console.log(`Updating OAuth client: ${LAUNCHMASS_CLIENT_ID}`);
    
    // Update the client
    const result = await oauthClients.updateOne(
      { client_id: LAUNCHMASS_CLIENT_ID },
      {
        $addToSet: {
          grant_types: 'client_credentials',
          allowed_scopes: 'manage_permissions'
        }
      }
    );
    
    if (result.matchedCount === 0) {
      console.error('❌ OAuth client not found!');
      console.error(`   Client ID: ${LAUNCHMASS_CLIENT_ID}`);
      process.exit(1);
    }
    
    console.log(`✅ OAuth client updated successfully`);
    console.log(`   Matched: ${result.matchedCount}`);
    console.log(`   Modified: ${result.modifiedCount}`);
    
    // Verify the update
    console.log('\nVerifying update...');
    const updatedClient = await oauthClients.findOne(
      { client_id: LAUNCHMASS_CLIENT_ID },
      { projection: { name: 1, grant_types: 1, allowed_scopes: 1, _id: 0 } }
    );
    
    console.log('\n📋 Updated OAuth Client:');
    console.log(JSON.stringify(updatedClient, null, 2));
    
    // Check if both were added
    const hasClientCredentials = updatedClient.grant_types?.includes('client_credentials');
    const hasManagePermissions = updatedClient.allowed_scopes?.includes('manage_permissions');
    
    if (hasClientCredentials && hasManagePermissions) {
      console.log('\n✅ SUCCESS: Both grant_types and allowed_scopes updated correctly');
      console.log('   ✓ grant_types includes "client_credentials"');
      console.log('   ✓ allowed_scopes includes "manage_permissions"');
      console.log('\n🎉 Launchmass can now sync permissions to SSO!');
    } else {
      console.log('\n⚠️  WARNING: Update incomplete');
      if (!hasClientCredentials) console.log('   ✗ "client_credentials" not in grant_types');
      if (!hasManagePermissions) console.log('   ✗ "manage_permissions" not in allowed_scopes');
    }
    
  } catch (error) {
    console.error('❌ Error updating OAuth client:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the update
updateOAuthClient();
