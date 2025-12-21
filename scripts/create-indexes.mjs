#!/usr/bin/env node

/**
 * Index Creation and Optimization Script
 * 
 * Purpose: Create optimal indexes for launchmass collections
 * Usage: node scripts/create-indexes.mjs
 * 
 * Creates indexes for:
 * - Fast queries on common patterns
 * - Unique constraints
 * - Compound indexes for multi-field queries
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'launchmass';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

const INDEXES = {
  cards: [
    { keys: { orgUuid: 1, order: 1 }, options: { name: 'orgUuid_1_order_1' } },
    { keys: { orgUuid: 1, tags: 1 }, options: { name: 'orgUuid_1_tags_1' } },
    { keys: { orgUuid: 1 }, options: { name: 'orgUuid_1' } },
  ],
  organizations: [
    { keys: { slug: 1 }, options: { name: 'slug_1', unique: true } },
    { keys: { uuid: 1 }, options: { name: 'uuid_1', unique: true } },
    { keys: { isActive: 1 }, options: { name: 'isActive_1' } },
  ],
  organizationMembers: [
    { keys: { orgUuid: 1, ssoUserId: 1 }, options: { name: 'orgUuid_1_ssoUserId_1', unique: true } },
    { keys: { ssoUserId: 1 }, options: { name: 'ssoUserId_1' } },
    { keys: { orgUuid: 1, role: 1 }, options: { name: 'orgUuid_1_role_1' } },
  ],
  users: [
    { keys: { ssoUserId: 1 }, options: { name: 'ssoUserId_1', unique: true } },
    { keys: { email: 1 }, options: { name: 'email_1' } },
    { keys: { appRole: 1 }, options: { name: 'appRole_1' } },
    { keys: { appStatus: 1 }, options: { name: 'appStatus_1' } },
  ],
  authLogs: [
    { keys: { createdAt: -1 }, options: { name: 'createdAt_-1' } },
    { keys: { ssoUserId: 1, createdAt: -1 }, options: { name: 'ssoUserId_1_createdAt_-1' } },
  ],
  // New collections for v1.18.0+
  organizationRoles: [
    { keys: { orgUuid: 1, roleId: 1 }, options: { name: 'orgUuid_1_roleId_1', unique: true } },
    { keys: { orgUuid: 1, isSystem: 1 }, options: { name: 'orgUuid_1_isSystem_1' } },
  ],
  analyticsEvents: [
    { keys: { timestamp: -1 }, options: { name: 'timestamp_-1' } },
    { keys: { orgUuid: 1, timestamp: -1 }, options: { name: 'orgUuid_1_timestamp_-1' } },
    { keys: { eventType: 1, timestamp: -1 }, options: { name: 'eventType_1_timestamp_-1' } },
    { keys: { userId: 1, timestamp: -1 }, options: { name: 'userId_1_timestamp_-1' } },
  ],
};

async function createIndexes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    console.log('🔧 Creating/Verifying Indexes\n');
    console.log('═'.repeat(80));
    
    let created = 0;
    let existing = 0;
    let errors = 0;
    
    for (const [collName, indexes] of Object.entries(INDEXES)) {
      console.log(`\n📦 ${collName}`);
      console.log('─'.repeat(80));
      
      const coll = db.collection(collName);
      const existingIndexes = await coll.indexes();
      const existingNames = existingIndexes.map(idx => idx.name);
      
      for (const { keys, options } of indexes) {
        const indexName = options.name;
        
        if (existingNames.includes(indexName)) {
          console.log(`   ✓ ${indexName} (already exists)`);
          existing++;
        } else {
          try {
            await coll.createIndex(keys, options);
            console.log(`   ✅ ${indexName} (created)`);
            created++;
          } catch (err) {
            console.log(`   ❌ ${indexName} (error: ${err.message})`);
            errors++;
          }
        }
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created}`);
    console.log(`   Existing: ${existing}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${created + existing + errors}`);
    
    if (errors > 0) {
      console.log(`\n⚠️  Some indexes failed to create. Check errors above.`);
    } else {
      console.log(`\n✅ All indexes created successfully!`);
    }
    
  } catch (err) {
    console.error('❌ Error creating indexes:', err);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Done\n');
  }
}

createIndexes();
