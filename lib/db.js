import { MongoClient } from 'mongodb';

// Functional: Lazily initialize the Mongo client to avoid throwing during build
// Strategic: Defers DB connection until actually needed; supports serverless with global caching
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI environment variable is not set');
}

// Functional: Cache the client promise on globalThis in ALL environments.
// Strategic: On serverless (Vercel), each function instance re-imports this module; without
//   a global cache, every cold start opens a fresh connection pool and exhausts MongoDB's
//   connection limit under load. Reusing one promise per instance is the documented
//   Next.js + MongoDB pattern for both development and production.
if (!global._mongoClientPromise) {
  const client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}
const clientPromise = global._mongoClientPromise;

export default clientPromise;
