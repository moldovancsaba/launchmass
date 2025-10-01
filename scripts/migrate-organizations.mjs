#!/usr/bin/env node
// scripts/migrate-organizations.mjs
// Functional: Idempotent migration to introduce organizations and backfill existing cards.
// Strategic: Creates a default organization (slug: "default"), ensures indexes, and scopes legacy cards.

import clientPromise from '../lib/db.js';

function isoNow() { return new Date().toISOString(); }

function randomUUID() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // Fallback: not RFC4122-perfect, but sufficient for internal identity in migration
  return 'xxxxxxxxyxxx4xxxyyxxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function ensureOrgIndexes(db) {
  const col = db.collection('organizations');
  await Promise.all([
    col.createIndex({ slug: 1 }, { unique: true }),
    col.createIndex({ uuid: 1 }, { unique: true }),
    col.createIndex({ isActive: 1 })
  ]);
}

async function ensureCardIndexes(db) {
  const cards = db.collection('cards');
  await Promise.all([
    cards.createIndex({ orgUuid: 1, order: 1 }),
    cards.createIndex({ orgUuid: 1, tags: 1 }),
  ]);
}

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error(`[migrate] ${isoNow()} MONGODB_URI is not set`);
    process.exit(1);
  }
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');

    console.log(`[migrate] ${isoNow()} Ensuring indexes...`);
    await ensureOrgIndexes(db);
    await ensureCardIndexes(db);

    const orgs = db.collection('organizations');
    const cards = db.collection('cards');

    // Get or create default org
    let def = await orgs.findOne({ slug: 'default' });
    if (!def) {
      def = {
        uuid: randomUUID(),
        name: 'Default Organization',
        slug: 'default',
        description: 'Auto-created by migration',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const r = await orgs.insertOne(def);
      def._id = r.insertedId;
      console.log(`[migrate] ${isoNow()} Created default organization uuid=${def.uuid}`);
    } else {
      console.log(`[migrate] ${isoNow()} Found existing default organization uuid=${def.uuid}`);
    }

    // Backfill cards missing org fields
    const missingFilter = { $or: [ { orgUuid: { $exists: false } }, { orgUuid: '' }, { orgUuid: null } ] };
    const beforeMissing = await cards.countDocuments(missingFilter);
    console.log(`[migrate] ${isoNow()} Cards missing orgUuid before: ${beforeMissing}`);
    if (beforeMissing > 0) {
      const r = await cards.updateMany(missingFilter, {
        $set: { orgUuid: def.uuid, orgSlug: def.slug, updatedAt: new Date() }
      });
      console.log(`[migrate] ${isoNow()} Backfilled cards: matched=${r.matchedCount} modified=${r.modifiedCount}`);
    }
    const afterMissing = await cards.countDocuments(missingFilter);
    console.log(`[migrate] ${isoNow()} Cards missing orgUuid after: ${afterMissing}`);

    console.log(`[migrate] ${isoNow()} Migration completed successfully.`);
    process.exit(0);
  } catch (e) {
    console.error(`[migrate] ${isoNow()} Migration error:`, e);
    process.exit(1);
  }
}

await run();
