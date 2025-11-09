#!/usr/bin/env node
/**
 * Permanent fix for duplicate email issue in Launchmass
 * 
 * Actions:
 * 1. Delete all but one user with sso@doneisbetter.com (keep the admin one)
 * 2. Create unique index on email field to prevent future duplicates
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

async function fixPermanently() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');
    
    // Find all users with sso@doneisbetter.com
    const duplicates = await usersCollection
      .find({ email: 'sso@doneisbetter.com' })
      .sort({ createdAt: 1 }) // Oldest first
      .toArray();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CURRENT STATE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (duplicates.length === 0) {
      console.log('❌ No users found with sso@doneisbetter.com\n');
      rl.close();
      return;
    }
    
    if (duplicates.length === 1) {
      console.log('✅ Only ONE user found - no duplicates!');
      console.log(`   Name: ${duplicates[0].name}`);
      console.log(`   SSO User ID: ${duplicates[0].ssoUserId}\n`);
    } else {
      console.log(`⚠️  Found ${duplicates.length} users with sso@doneisbetter.com:\n`);
      for (let i = 0; i < duplicates.length; i++) {
        const user = duplicates[i];
        console.log(`${i + 1}. ${user._id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   SSO User ID: ${user.ssoUserId}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log(`   Last Login: ${user.lastLoginAt || 'Never'}`);
        console.log('');
      }
    }
    
    // Check for unique index
    const indexes = await usersCollection.indexes();
    const hasEmailIndex = indexes.some(idx => 
      idx.key && idx.key.email && idx.unique === true
    );
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('INDEX STATUS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Unique email index: ${hasEmailIndex ? '✅ EXISTS' : '❌ MISSING'}\n`);
    
    if (duplicates.length === 1 && hasEmailIndex) {
      console.log('✅ Everything is already fixed!\n');
      rl.close();
      return;
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PROPOSED FIX');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (duplicates.length > 1) {
      // Keep the oldest user (Owner) which has SSO admin user ID
      const userToKeep = duplicates.find(
        u => u.ssoUserId === 'eea56c57-d8c0-431a-8cff-181817646777'
      ) || duplicates[0]; // Fallback to oldest
      
      const usersToDelete = duplicates.filter(u => u._id.toString() !== userToKeep._id.toString());
      
      console.log('KEEP:');
      console.log(`  ${userToKeep.name} (${userToKeep.ssoUserId})\n`);
      
      console.log(`DELETE (${usersToDelete.length}):`);
      for (const user of usersToDelete) {
        console.log(`  ${user.name} (${user.ssoUserId})`);
      }
      console.log('');
    }
    
    if (!hasEmailIndex) {
      console.log('CREATE unique index on email field to prevent future duplicates\n');
    }
    
    const answer = await question('Proceed with fix? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled');
      rl.close();
      return;
    }
    
    // Delete duplicates
    if (duplicates.length > 1) {
      console.log('\n⏳ Deleting duplicate users...');
      const userToKeep = duplicates.find(
        u => u.ssoUserId === 'eea56c57-d8c0-431a-8cff-181817646777'
      ) || duplicates[0];
      
      const result = await usersCollection.deleteMany({
        email: 'sso@doneisbetter.com',
        _id: { $ne: userToKeep._id }
      });
      
      console.log(`✅ Deleted ${result.deletedCount} duplicate user(s)`);
    }
    
    // Create unique index
    if (!hasEmailIndex) {
      console.log('\n⏳ Creating unique index on email...');
      await usersCollection.createIndex(
        { email: 1 },
        { unique: true, sparse: true }
      );
      console.log('✅ Unique index created');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ FIX COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('The email field now has a unique constraint.');
    console.log('This will PREVENT duplicate emails from being created in the future.\n');
    console.log('📋 Next steps:');
    console.log('  1. Clear ALL browser cookies for doneisbetter.com domain');
    console.log('  2. Go to https://sso.doneisbetter.com and logout');
    console.log('  3. Close all browser tabs');
    console.log('  4. Open new tab and login to SSO with sso@doneisbetter.com');
    console.log('  5. Navigate to Launchmass\n');
    
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

fixPermanently();
