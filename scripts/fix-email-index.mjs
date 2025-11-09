#!/usr/bin/env node
/**
 * Fix email index - drop non-unique and create unique
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

async function fixIndex() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');
    
    // List all indexes
    const indexes = await usersCollection.indexes();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CURRENT INDEXES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    for (const idx of indexes) {
      console.log(`Index: ${idx.name}`);
      console.log(`  Keys: ${JSON.stringify(idx.key)}`);
      console.log(`  Unique: ${idx.unique || false}`);
      console.log('');
    }
    
    // Find email index
    const emailIndex = indexes.find(idx => idx.key && idx.key.email);
    
    if (!emailIndex) {
      console.log('❌ No email index found\n');
      console.log('Creating unique email index...\n');
    } else if (emailIndex.unique) {
      console.log('✅ Email index is already unique!\n');
      rl.close();
      return;
    } else {
      console.log(`⚠️  Email index "${emailIndex.name}" exists but is NOT unique\n`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('PROPOSED FIX');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`1. Drop existing index: ${emailIndex.name}`);
      console.log('2. Create new UNIQUE index on email field\n');
      
      const answer = await question('Proceed? (yes/no): ');
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Operation cancelled');
        rl.close();
        return;
      }
      
      console.log(`\n⏳ Dropping index "${emailIndex.name}"...`);
      await usersCollection.dropIndex(emailIndex.name);
      console.log('✅ Index dropped');
    }
    
    // Create unique index
    console.log('\n⏳ Creating unique email index...');
    await usersCollection.createIndex(
      { email: 1 },
      { unique: true, sparse: true, name: 'email_unique' }
    );
    console.log('✅ Unique email index created');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ INDEX FIX COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('The email field now has a UNIQUE constraint.');
    console.log('Duplicate emails can NO LONGER be created.\n');
    
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

fixIndex();
