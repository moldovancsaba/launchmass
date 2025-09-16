import { MongoClient } from 'mongodb';

// Lazily initialize the Mongo client to avoid throwing during build when env vars
// may not be present. This defers failures to actual DB usage at runtime.
const uri = process.env.MONGODB_URI;

let client;
let clientPromise;

function getClientPromise() {
  if (!clientPromise) {
    if (!uri) {
      // Return a rejected promise that will surface a clear error only when DB is used
      clientPromise = Promise.reject(new Error('MONGODB_URI is not set'));
      return clientPromise;
    }
    if (process.env.NODE_ENV === 'development') {
      if (!global._mongoClientPromise) {
        client = new MongoClient(uri);
        global._mongoClientPromise = client.connect();
      }
      clientPromise = global._mongoClientPromise;
    } else {
      client = new MongoClient(uri);
      clientPromise = client.connect();
    }
  }
  return clientPromise;
}

export default getClientPromise();
