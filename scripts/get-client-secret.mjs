#!/usr/bin/env node
/**
 * Get Launchmass OAuth client secret
 * WARNING: Secrets are bcrypt hashed, cannot retrieve plaintext
 */

import { MongoClient } from 'mongodb';

const SSO_MONGODB_URI = 'mongodb+srv://thanperfect:CuW54NNNFKnGQtt6@doneisbetter.49s2z.mongodb.net';
const LAUNCHMASS_CLIENT_ID = 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f';

async function getClientSecret() {
  const client = new MongoClient(SSO_MONGODB_URI);
  
  try {
    console.log('Connecting to SSO database...');
    await client.connect();
    
    const db = client.db('sso');
    const oauthClients = db.collection('oauthClients');
    
    const launchmassClient = await oauthClients.findOne(
      { client_id: LAUNCHMASS_CLIENT_ID }
    );
    
    if (launchmassClient) {
      console.log('\n✅ Launchmass OAuth Client Configuration:');
      console.log('─'.repeat(60));
      console.log(`Client ID:     ${launchmassClient.client_id}`);
      console.log(`Name:          ${launchmassClient.name}`);
      console.log(`Status:        ${launchmassClient.status}`);
      console.log(`Grant Types:   ${launchmassClient.grant_types.join(', ')}`);
      console.log(`Scopes:        ${launchmassClient.allowed_scopes.join(', ')}`);
      console.log('─'.repeat(60));
      console.log('\n⚠️  WARNING: Client secret is bcrypt hashed in database');
      console.log('   Cannot retrieve plaintext secret');
      console.log('   Secret hash: ' + launchmassClient.client_secret.substring(0, 20) + '...');
      console.log('\n📝 Options:');
      console.log('   1. Use existing secret if you have it saved');
      console.log('   2. Regenerate secret via SSO admin UI');
      console.log('   3. Check .env.local.backup for existing secret');
    } else {
      console.log('❌ Client not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

getClientSecret();
