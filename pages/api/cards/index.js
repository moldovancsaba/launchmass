import clientPromise from '../../../lib/db';
import { getOrgContext } from '../../../lib/org.js';
import { withSsoAuth } from '../../../lib/auth-oauth.js';

const DEFAULT_BG = "linear-gradient(90deg, rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%)";

function toClient(doc) {
  if (!doc) return doc;
  const { _id, createdAt, updatedAt, ...rest } = doc;
  return { 
    _id: _id?.toString?.() || String(_id), 
    ...rest,
    // Ensure tags is always an array for the client
    tags: Array.isArray(rest?.tags) ? rest.tags : [],
    // Convert Date objects to ISO strings for JSON serialization
    ...(createdAt && { createdAt: createdAt.toISOString() }),
    ...(updatedAt && { updatedAt: updatedAt.toISOString() })
  };
}

export default async function handler(req, res) {
  try {
    console.log('[cards API] Request method:', req.method);
    console.log('[cards API] Headers:', JSON.stringify(req.headers));
    
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');
    const col = db.collection('cards');

    if (req.method === 'GET') {
      // Functional: When an org context is provided, scope results to that organization.
      // Strategic: Backward-compatible — if no org context, return legacy unscoped list but add a deprecation header.
      console.log('[cards API] Getting org context...');
      const ctx = await getOrgContext(req);
      console.log('[cards API] Org context:', JSON.stringify(ctx));
      
      const filter = ctx?.orgUuid ? { orgUuid: ctx.orgUuid } : {};
      console.log('[cards API] Filter:', JSON.stringify(filter));
      
      if (!ctx?.orgUuid) {
        res.setHeader('X-Deprecation', 'org-context-required');
      }
      
      console.log('[cards API] Fetching cards from DB...');
      const docs = await col.find(filter).sort({ order: 1, _id: 1 }).toArray();
      console.log('[cards API] Found', docs.length, 'cards');
      
      return res.status(200).json(docs.map(toClient));
    }

  // Functional: Protect POST (create) operation with SSO authentication
  // Strategic: withSsoAuth middleware validates session, upserts user, and attaches req.user
  if (req.method === 'POST') {
    return withSsoAuth(async (req, res) => {
      // Require org context for writes to prevent cross-tenant leakage
      const ctx = await getOrgContext(req);
      if (!ctx?.orgUuid) return res.status(400).json({ error: 'Organization context required (X-Organization-UUID or ?orgUuid=)' });

      const { href = '', title = '', description = '', order, background, tags } = req.body || {};
      const last = await col.find({ orgUuid: ctx.orgUuid }).sort({ order: -1 }).limit(1).toArray();
      const nextOrder = Number.isFinite(order) ? Number(order) : (last.length ? (Number(last[0].order) + 1) : 0);
      const now = new Date();
      const bg = typeof background === 'string' && background.trim() ? normalizeBg(background) : DEFAULT_BG;

      // Functional: Normalize incoming tags to a canonical array of lowercased strings without '#'.
      // Strategic: Ensures consistent filtering and prevents duplicates across the system.
      const safeTags = normalizeTags(tags);

      const doc = { href: String(href), title: String(title), description: String(description), background: bg, order: nextOrder, createdAt: now, updatedAt: now, tags: safeTags, orgUuid: ctx.orgUuid, orgSlug: ctx.orgSlug || '' };
      const r = await col.insertOne(doc);
      const created = { _id: r.insertedId.toString(), ...doc };
      return res.status(201).json(toClient(created));
    })(req, res);
  }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end('Method Not Allowed');
  } catch (error) {
    console.error('[cards API] Error:', error);
    console.error('[cards API] Stack:', error.stack);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

function normalizeBg(input) {
  const lines = String(input).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const linear = lines.find(l => l.startsWith('background: linear-gradient'));
  const color = lines.find(l => /^background:\s*#?[0-9a-fA-F]{3,8}/.test(l));
  const pick = (linear || color || input).replace(/^background:\s*/,'').replace(/;$/,'');
  return pick;
}

function normalizeTags(input) {
  const arr = Array.isArray(input) ? input : [];
  const out = [];
  const seen = new Set();
  for (const raw of arr) {
    if (typeof raw !== 'string') continue;
    const t = raw.trim().replace(/^#/,'').toLowerCase();
    if (!t) continue;
    if (!seen.has(t)) { seen.add(t); out.push(t); }
  }
  return out;
}
