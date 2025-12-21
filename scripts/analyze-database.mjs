#!/usr/bin/env node

/**
 * Database Analysis Script for launchmass
 * 
 * Purpose: Analyze MongoDB collections, indexes, and query patterns
 * Usage: node scripts/analyze-database.mjs
 * 
 * Outputs:
 * - Collection statistics
 * - Index usage analysis
 * - Query pattern recommendations
 * - Missing index suggestions
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

async function analyzeDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`📊 Database: ${DB_NAME}`);
    console.log(`📁 Collections: ${collections.length}\n`);
    console.log('═'.repeat(80));
    
    for (const collInfo of collections) {
      const collName = collInfo.name;
      const coll = db.collection(collName);
      
      console.log(`\n📦 Collection: ${collName}`);
      console.log('─'.repeat(80));
      
      // Collection stats
      const stats = await coll.stats();
      console.log(`\n📈 Statistics:`);
      console.log(`   Documents: ${stats.count.toLocaleString()}`);
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   Avg Doc Size: ${stats.avgObjSize ? stats.avgObjSize.toFixed(2) : 0} bytes`);
      console.log(`   Storage Size: ${(stats.storageSize / 1024).toFixed(2)} KB`);
      console.log(`   Indexes: ${stats.nindexes}`);
      console.log(`   Index Size: ${(stats.totalIndexSize / 1024).toFixed(2)} KB`);
      
      // Indexes
      const indexes = await coll.indexes();
      console.log(`\n🔍 Indexes:`);
      for (const index of indexes) {
        const keys = Object.entries(index.key).map(([k, v]) => `${k}:${v}`).join(', ');
        const unique = index.unique ? ' [UNIQUE]' : '';
        const name = index.name === '_id_' ? `${index.name} [DEFAULT]` : index.name;
        console.log(`   ${name}: { ${keys} }${unique}`);
      }
      
      // Sample documents for schema analysis
      const sampleDocs = await coll.find({}).limit(3).toArray();
      if (sampleDocs.length > 0) {
        console.log(`\n📄 Sample Document Schema:`);
        const fields = Object.keys(sampleDocs[0]);
        for (const field of fields) {
          const value = sampleDocs[0][field];
          const type = Array.isArray(value) ? 'Array' : typeof value;
          const sample = Array.isArray(value) 
            ? `[${value.length} items]` 
            : type === 'object' && value !== null 
            ? `{...}` 
            : String(value).substring(0, 50);
          console.log(`   ${field}: ${type} (${sample})`);
        }
      }
      
      console.log('\n' + '═'.repeat(80));
    }
    
    // Query pattern analysis
    console.log('\n\n🔍 QUERY PATTERN ANALYSIS\n');
    console.log('═'.repeat(80));
    
    await analyzeQueryPatterns(db);
    
    // Index recommendations
    console.log('\n\n💡 INDEX RECOMMENDATIONS\n');
    console.log('═'.repeat(80));
    
    await recommendIndexes(db);
    
  } catch (err) {
    console.error('❌ Error analyzing database:', err);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Analysis complete\n');
  }
}

async function analyzeQueryPatterns(db) {
  const patterns = [];
  
  // Cards collection patterns
  patterns.push({
    collection: 'cards',
    query: 'Find by orgUuid + order',
    filter: '{ orgUuid, order }',
    recommendation: 'Compound index: { orgUuid: 1, order: 1 }',
    priority: 'HIGH'
  });
  
  patterns.push({
    collection: 'cards',
    query: 'Find by orgUuid + tags',
    filter: '{ orgUuid, tags }',
    recommendation: 'Compound index: { orgUuid: 1, tags: 1 }',
    priority: 'MEDIUM'
  });
  
  // Organizations patterns
  patterns.push({
    collection: 'organizations',
    query: 'Find by slug (unique)',
    filter: '{ slug }',
    recommendation: 'Unique index: { slug: 1 }',
    priority: 'HIGH'
  });
  
  patterns.push({
    collection: 'organizations',
    query: 'Find by uuid (unique)',
    filter: '{ uuid }',
    recommendation: 'Unique index: { uuid: 1 }',
    priority: 'HIGH'
  });
  
  // organizationMembers patterns
  patterns.push({
    collection: 'organizationMembers',
    query: 'Find by orgUuid + ssoUserId',
    filter: '{ orgUuid, ssoUserId }',
    recommendation: 'Compound unique index: { orgUuid: 1, ssoUserId: 1 }',
    priority: 'HIGH'
  });
  
  patterns.push({
    collection: 'organizationMembers',
    query: 'Find all members of org',
    filter: '{ orgUuid }',
    recommendation: 'Index: { orgUuid: 1 }',
    priority: 'HIGH'
  });
  
  patterns.push({
    collection: 'organizationMembers',
    query: 'Find user memberships',
    filter: '{ ssoUserId }',
    recommendation: 'Index: { ssoUserId: 1 }',
    priority: 'MEDIUM'
  });
  
  patterns.push({
    collection: 'organizationMembers',
    query: 'Count admins in org',
    filter: '{ orgUuid, role: "admin" }',
    recommendation: 'Compound index: { orgUuid: 1, role: 1 }',
    priority: 'MEDIUM'
  });
  
  // users patterns
  patterns.push({
    collection: 'users',
    query: 'Find by ssoUserId (unique)',
    filter: '{ ssoUserId }',
    recommendation: 'Unique index: { ssoUserId: 1 }',
    priority: 'HIGH'
  });
  
  patterns.push({
    collection: 'users',
    query: 'Find by email',
    filter: '{ email }',
    recommendation: 'Index: { email: 1 }',
    priority: 'MEDIUM'
  });
  
  patterns.push({
    collection: 'users',
    query: 'Find by appRole',
    filter: '{ appRole }',
    recommendation: 'Index: { appRole: 1 }',
    priority: 'LOW'
  });
  
  // authLogs patterns
  patterns.push({
    collection: 'authLogs',
    query: 'Find recent logs',
    filter: '{ createdAt }',
    recommendation: 'Index: { createdAt: -1 }',
    priority: 'MEDIUM'
  });
  
  patterns.push({
    collection: 'authLogs',
    query: 'Find user auth logs',
    filter: '{ ssoUserId, createdAt }',
    recommendation: 'Compound index: { ssoUserId: 1, createdAt: -1 }',
    priority: 'LOW'
  });
  
  console.log('\n📋 Common Query Patterns:\n');
  for (const pattern of patterns) {
    const priority = pattern.priority === 'HIGH' ? '🔴' : pattern.priority === 'MEDIUM' ? '🟡' : '🟢';
    console.log(`${priority} ${pattern.collection}`);
    console.log(`   Query: ${pattern.query}`);
    console.log(`   Filter: ${pattern.filter}`);
    console.log(`   Recommendation: ${pattern.recommendation}`);
    console.log('');
  }
}

async function recommendIndexes(db) {
  const recommendations = [];
  
  // Check each collection for missing indexes
  const collectionsToCheck = [
    { name: 'cards', indexes: ['orgUuid_1_order_1', 'orgUuid_1_tags_1'] },
    { name: 'organizations', indexes: ['slug_1', 'uuid_1', 'isActive_1'] },
    { name: 'organizationMembers', indexes: ['orgUuid_1_ssoUserId_1', 'ssoUserId_1', 'orgUuid_1_role_1'] },
    { name: 'users', indexes: ['ssoUserId_1', 'email_1', 'appRole_1', 'appStatus_1'] },
    { name: 'authLogs', indexes: ['createdAt_-1', 'ssoUserId_1_createdAt_-1'] }
  ];
  
  for (const collInfo of collectionsToCheck) {
    try {
      const coll = db.collection(collInfo.name);
      const existingIndexes = await coll.indexes();
      const existingNames = existingIndexes.map(idx => idx.name);
      
      for (const expectedIndex of collInfo.indexes) {
        if (!existingNames.includes(expectedIndex) && expectedIndex !== '_id_') {
          recommendations.push({
            collection: collInfo.name,
            index: expectedIndex,
            action: 'CREATE',
            reason: 'Missing recommended index for common query pattern'
          });
        }
      }
    } catch (err) {
      // Collection doesn't exist yet
      console.log(`⚠️  Collection ${collInfo.name} does not exist yet - will be created`);
    }
  }
  
  if (recommendations.length === 0) {
    console.log('✅ All recommended indexes are present\n');
  } else {
    console.log(`⚠️  Found ${recommendations.length} missing indexes:\n`);
    for (const rec of recommendations) {
      console.log(`📌 ${rec.collection}.${rec.index}`);
      console.log(`   Action: ${rec.action}`);
      console.log(`   Reason: ${rec.reason}`);
      console.log('');
    }
    
    console.log('\n💡 To create missing indexes, run:');
    console.log('   node scripts/create-indexes.mjs\n');
  }
}

// Run analysis
analyzeDatabase();
