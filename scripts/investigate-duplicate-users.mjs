#!/usr/bin/env node
/**
 * Investigate duplicate sso@doneisbetter.com users in Launchmass
 * 
 * This script finds all users with the email sso@doneisbetter.com
 * in the Launchmass database.
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'launchmass';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function investigateDuplicates() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');
    
    // Find all users with email sso@doneisbetter.com
    const duplicateUsers = await usersCollection
      .find({ email: 'sso@doneisbetter.com' })
      .toArray();
    
    console.log(`\n📊 Found ${duplicateUsers.length} users with email sso@doneisbetter.com in Launchmass\n`);
    
    for (const user of duplicateUsers) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`MongoDB _id: ${user._id}`);
      console.log(`SSO User ID: ${user.ssoUserId || 'N/A'}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Status: ${user.status}`);
      console.log(`Created: ${user.createdAt}`);
      console.log(`Last Login: ${user.lastLoginAt || 'Never'}`);
      console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Check for duplicate emails in general
    const duplicateEmails = await usersCollection.aggregate([
      { $group: { _id: '$email', count: { $sum: 1 }, users: { $push: { name: '$name', ssoUserId: '$ssoUserId', role: '$role', status: '$status' } } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    if (duplicateEmails.length > 0) {
      console.log('⚠️  FOUND DUPLICATE EMAILS IN LAUNCHMASS:\n');
      for (const dup of duplicateEmails) {
        console.log(`  Email: ${dup._id}`);
        console.log(`  Count: ${dup.count}`);
        console.log(`  Users:`);
        for (const u of dup.users) {
          console.log(`    - ${u.name} (SSO ID: ${u.ssoUserId || 'N/A'}, Role: ${u.role}, Status: ${u.status})`);
        }
        console.log('');
      }
      
      console.log('\n💡 RECOMMENDED ACTION:');
      console.log('   1. Identify the primary user (usually the one with the most recent activity)');
      console.log('   2. Delete the duplicate user(s)');
      console.log('   3. Ensure the primary user has the correct role and ssoUserId\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

investigateDuplicates();
