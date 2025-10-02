// Functional: Idempotent database migration to ensure users and authLogs collections exist with proper indexes
// Strategic: Run once in dev/prod to guarantee indexes; safe to run multiple times (idempotent)
// 
// Usage:
//   node scripts/migrate-users-collection.cjs
//
// Requirements:
//   MONGODB_URI environment variable must be set

const { MongoClient } = require('mongodb');

async function migrate() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'launchmass';

  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is required');
    process.exit(1);
  }

  console.log('🔄 Starting database migration...');
  console.log(`📦 Database: ${dbName}`);

  let client;
  try {
    // Functional: Connect to MongoDB
    client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);

    // Functional: Ensure users collection exists with indexes
    // Strategic: Unique index on ssoUserId prevents duplicate user entries
    console.log('\n📋 Creating users collection indexes...');
    const usersCol = db.collection('users');
    
    await usersCol.createIndex({ ssoUserId: 1 }, { unique: true });
    console.log('  ✅ Unique index on { ssoUserId: 1 }');
    
    await usersCol.createIndex({ email: 1 });
    console.log('  ✅ Index on { email: 1 }');

    // Functional: Ensure authLogs collection exists with indexes
    // Strategic: Indexes enable efficient audit log queries by time and user
    console.log('\n📋 Creating authLogs collection indexes...');
    const authLogsCol = db.collection('authLogs');
    
    await authLogsCol.createIndex({ createdAt: -1 });
    console.log('  ✅ Index on { createdAt: -1 }');
    
    await authLogsCol.createIndex({ ssoUserId: 1, createdAt: -1 });
    console.log('  ✅ Compound index on { ssoUserId: 1, createdAt: -1 }');

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Collection stats:');
    
    const usersCount = await usersCol.countDocuments();
    const authLogsCount = await authLogsCol.countDocuments();
    console.log(`  Users: ${usersCount} documents`);
    console.log(`  Auth logs: ${authLogsCount} documents`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// Run migration
migrate().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
