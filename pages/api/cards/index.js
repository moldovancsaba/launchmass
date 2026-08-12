import clientPromise from '../../../lib/db';
import { getOrgContext } from '../../../lib/org.js';
import { withSsoAuth, withOrgPermission } from '../../../lib/auth-oauth.js';
import { logEvent, EVENT_TYPES } from '../../../lib/analytics.js';

const DEFAULT_BG = "linear-gradient(90deg, rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%)";

// Functional: Debug logger gated behind CARDS_DEBUG.
// Strategic: Matches the OAUTH_DEBUG (pages/api/oauth/callback.js) / ORG_CACHE_DEBUG
// (lib/org.js) convention — verbose per-request diagnostics must be opt-in, and must
// never include cookie/header content even when the flag is on (see issue #11).
const dlog = (...args) => { if (process.env.CARDS_DEBUG === 'true') console.log(...args); };

function toClient(doc) {
  if (!doc) return doc;
  const { _id, createdAt, updatedAt, ...rest } = doc;
  
  // Functional: Normalize timestamps to ISO strings for consistent JSON serialization
  // Strategic: Handle both Date objects (new cards) and string timestamps (migrated legacy cards)
  const toISOString = (val) => {
    if (!val) return undefined;
    if (typeof val === 'string') return val; // Already a string, assume ISO format
    if (val instanceof Date) return val.toISOString(); // Date object
    return undefined; // Unknown type
  };
  
  return { 
    _id: _id?.toString?.() || String(_id), 
    ...rest,
    // Ensure tags is always an array for the client
    tags: Array.isArray(rest?.tags) ? rest.tags : [],
    // Convert timestamps to ISO strings
    ...(createdAt && { createdAt: toISOString(createdAt) }),
    ...(updatedAt && { updatedAt: toISOString(updatedAt) })
  };
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');
    const col = db.collection('cards');

    if (req.method === 'GET') {
      // Functional: Require an org context to scope results to that organization.
      // Strategic: Fail closed — absence of org context is a 400, not a cross-tenant
      // fallback that returns every organization's cards (see issue #10).
      const ctx = await getOrgContext(req);

      if (!ctx?.orgUuid) {
        return res.status(400).json({
          error: 'Organization context required (X-Organization-UUID or ?orgUuid=)'
        });
      }

      const filter = { orgUuid: ctx.orgUuid };

      const docs = await col.find(filter).sort({ order: 1, _id: 1 }).toArray();
      dlog('[cards API]', req.method, 'org=', ctx.orgUuid, 'count=', docs.length);

      return res.status(200).json(docs.map(toClient));
    }

  // Functional: Protect POST (create) operation with org-scoped authorization
  // Strategic: withSsoAuth authenticates and populates req.user; withOrgPermission then
  // checks the caller holds 'cards.create' in the target org (X-Organization-UUID/?orgUuid=)
  // before running the handler. withOrgPermission alone does not validate the session --
  // it resolves org context internally and attaches it as req.orgContext, so no separate
  // getOrgContext call is needed here (see issue #8).
  if (req.method === 'POST') {
    return withSsoAuth(withOrgPermission('cards.create', async (req, res) => {
      const ctx = req.orgContext;

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
      logEvent(EVENT_TYPES.CARD_CREATE, { orgUuid: ctx.orgUuid, userId: req.user.ssoUserId, cardId: created._id });
      return res.status(201).json(toClient(created));
    }))(req, res);
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
