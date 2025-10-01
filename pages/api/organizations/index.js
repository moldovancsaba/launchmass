import clientPromise from '../../../lib/db.js';
import { ensureOrgContext, getOrgContext } from '../../../lib/org.js';

// /api/organizations (index): GET (list active) and POST (create)
// Functional: Manage organizations via admin-only endpoints.
// Strategic: Mirrors narimato's organization CRUD while reusing launchmass' ESM and Mongo client.

function isoNow() { return new Date().toISOString(); }
function isAdmin(req) {
  const auth = req.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return Boolean(process.env.ADMIN_TOKEN) && token === process.env.ADMIN_TOKEN;
}

function normalizeSlug(input) {
  return String(input || '').trim().toLowerCase();
}

function validateSlug(slug) {
  // a-z, 0-9, dash; length >= 2
  return /^[a-z0-9-]{2,}$/.test(slug);
}

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  const col = db.collection('organizations');

  if (req.method === 'GET') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    const docs = await col.find({ isActive: { $ne: false } }).sort({ createdAt: -1 }).toArray();
    const out = docs.map(({ _id, ...rest }) => ({ _id: _id?.toString?.() || String(_id), ...rest }));
    return res.status(200).json({ organizations: out });
  }

  if (req.method === 'POST') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

    const { name, slug, description } = req.body || {};
    const nameStr = String(name || '').trim();
    const slugLower = normalizeSlug(slug);
    const descStr = String(description || '');

    if (!nameStr || !slugLower) return res.status(400).json({ error: 'name and slug required' });
    if (!validateSlug(slugLower)) return res.status(400).json({ error: 'invalid slug format' });

    const now = new Date();
    // Use crypto.randomUUID() (Node >= 18) to avoid new deps
    const uuid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Ensure uniqueness by checking before insert (unique index recommended separately)
    const existing = await col.findOne({ slug: slugLower });
    if (existing) return res.status(409).json({ error: 'slug already exists' });

    const doc = { uuid, name: nameStr, slug: slugLower, description: descStr, isActive: true, createdAt: now, updatedAt: now };
    const r = await col.insertOne(doc);
    return res.status(201).json({ organization: { _id: r.insertedId.toString(), ...doc } });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
