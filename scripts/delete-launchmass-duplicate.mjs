#!/usr/bin/env node
/**
 * Delete duplicate sso@doneisbetter.com user from Launchmass
 * 
 * Deletes the newer duplicate user (SSO | User Login x Moldovan Csaba)
 * and keeps the original admin user (Owner).
 */

import { MongoClient } from 'mongodb';
import readline from 'readline';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'launchmass';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function deleteDuplicate() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');
    
    // Find both users
    const duplicateUsers = await usersCollection
      .find({ email: 'sso@doneisbetter.com' })
      .toArray();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CURRENT STATE IN LAUNCHMASS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (duplicateUsers.length === 0) {
      console.log('✅ No users found with sso@doneisbetter.com');
      console.log('   The cleanup may already be complete.\n');
      rl.close();
      return;
    }
    
    if (duplicateUsers.length === 1) {
      console.log('✅ Only ONE user found with sso@doneisbetter.com:');
      console.log(`   Name: ${duplicateUsers[0].name}`);
      console.log(`   SSO ID: ${duplicateUsers[0].ssoUserId}`);
      console.log('   The duplicate has already been removed!\n');
      rl.close();
      return;
    }
    
    console.log(`Found ${duplicateUsers.length} users:\n`);
    for (const user of duplicateUsers) {
      console.log(`  ${user._id}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  SSO User ID: ${user.ssoUserId}`);
      console.log(`  Last Login: ${user.lastLoginAt || 'Never'}`);
      console.log('');
    }
    
    // Identify which one to delete
    // The SSO public user ID was: 0c6f6cb3-a13a-49b5-a372-bce7881b84c8
    // This should be deleted
    const userToDelete = duplicateUsers.find(
      u => u.ssoUserId === '0c6f6cb3-a13a-49b5-a372-bce7881b84c8'
    );
    
    const userToKeep = duplicateUsers.find(
      u => u.ssoUserId === 'eea56c57-d8c0-431a-8cff-181817646777'
    );
    
    if (!userToDelete) {
      console.log('✅ The duplicate public user has already been deleted!\n');
      rl.close();
      return;
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PROPOSED ACTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('DELETE this user:');
    console.log(`  Name: ${userToDelete.name}`);
    console.log(`  SSO User ID: ${userToDelete.ssoUserId}`);
    console.log(`  MongoDB _id: ${userToDelete._id}\n`);
    
    if (userToKeep) {
      console.log('KEEP this user:');
      console.log(`  Name: ${userToKeep.name}`);
      console.log(`  SSO User ID: ${userToKeep.ssoUserId}`);
      console.log(`  MongoDB _id: ${userToKeep._id}\n`);
    }
    
    const answer = await question('Do you want to proceed? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled');
      rl.close();
      return;
    }
    
    console.log('\n⏳ Deleting duplicate user...');
    const result = await usersCollection.deleteOne({ _id: userToDelete._id });
    
    if (result.deletedCount === 1) {
      console.log('✅ Duplicate user deleted successfully!');
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('CLEANUP COMPLETE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('✅ SSO public user deleted from SSO database');
      console.log('✅ Duplicate Launchmass user deleted');
      console.log('\n📋 Next steps:');
      console.log('  1. Clear your browser cache and cookies');
      console.log('  2. Log out of Launchmass');
      console.log('  3. Log in again with sso@doneisbetter.com');
      console.log('  4. Verify you see "superadmin" role\n');
    } else {
      console.log('❌ Failed to delete user');
    }
    
    rl.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    rl.close();
    process.exit(1);
  } finally {
    await client.close();
  }
}

deleteDuplicate();
