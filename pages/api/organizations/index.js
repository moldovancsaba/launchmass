import clientPromise from '../../../lib/db.js';
import { ensureOrgContext, getOrgContext } from '../../../lib/org.js';
import { withSsoAuth } from '../../../lib/auth.js';

// /api/organizations (index): GET (list active) and POST (create)
// Functional: Manage organizations via admin-only endpoints.
// Strategic: Mirrors narimato's organization CRUD while reusing launchmass' ESM and Mongo client.

function isoNow() { return new Date().toISOString(); }

function normalizeSlug(input) {
  return String(input || '').trim().toLowerCase();
}

function validateSlug(slug) {
  // a-z, 0-9, dash; length >= 2
  return /^[a-z0-9-]{2,}$/.test(slug);
}

function coerceBoolean(v) {
  // Functional: Normalize boolean-like inputs from JSON to true/false
  // Strategic: Avoids UI differences (checkbox true/false or string 'true') causing inconsistent storage
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return false;
}

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  const col = db.collection('organizations');

  // Functional: Protect GET (list organizations) with SSO authentication
  // Strategic: Only authenticated admin users can view organization list
  if (req.method === 'GET') {
    return withSsoAuth(async (req, res) => {
      const docs = await col.find({ isActive: { $ne: false } }).sort({ createdAt: -1 }).toArray();
      const out = docs.map(({ _id, ...rest }) => ({ _id: _id?.toString?.() || String(_id), ...rest }));
      return res.status(200).json({ organizations: out });
    })(req, res);
  }

  // Functional: Protect POST (create organization) with SSO authentication
  // Strategic: Prevents unauthorized organization creation; auto-admin users can create orgs
  if (req.method === 'POST') {
    return withSsoAuth(async (req, res) => {
      const { name, slug, description, useSlugAsPublicUrl } = req.body || {};
      const nameStr = String(name || '').trim();
      const slugLower = normalizeSlug(slug);
      const descStr = String(description || '');
      const slugPublic = coerceBoolean(useSlugAsPublicUrl);

      if (!nameStr || !slugLower) return res.status(400).json({ error: 'name and slug required' });
      if (!validateSlug(slugLower)) return res.status(400).json({ error: 'invalid slug format' });

      const now = new Date();
      // Use crypto.randomUUID() (Node >= 18) to avoid new deps
      const uuid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Ensure uniqueness by checking before insert (unique index recommended separately)
      const existing = await col.findOne({ slug: slugLower });
      if (existing) return res.status(409).json({ error: 'slug already exists' });

      const doc = { uuid, name: nameStr, slug: slugLower, description: descStr, isActive: true, createdAt: now, updatedAt: now, useSlugAsPublicUrl: slugPublic };
      const r = await col.insertOne(doc);
      return res.status(201).json({ organization: { _id: r.insertedId.toString(), ...doc } });
    })(req, res);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
