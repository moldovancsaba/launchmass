import { MongoClient } from 'mongodb';

// Functional: Lazily initialize the Mongo client to avoid throwing during build
// Strategic: Defers DB connection until actually needed; supports serverless with global caching
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI environment variable is not set');
}

let clientPromise;

// Functional: Get or create MongoDB client promise
// Strategic: Reuses connection in development via global cache; creates fresh in production
if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so the connection is reused across hot reloads
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;
