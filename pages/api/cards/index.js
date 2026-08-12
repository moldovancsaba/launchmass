import clientPromise from '../../../lib/db';
import { getOrgContext } from '../../../lib/org.js';
import { withSsoAuth, withOrgPermission } from '../../../lib/auth-oauth.js';
import { logEvent, EVENT_TYPES } from '../../../lib/analytics.js';
import { DEFAULT_BG, normalizeBg, normalizeTags, toClient } from '../../../lib/shared.js';

// Functional: Debug logger gated behind CARDS_DEBUG.
// Strategic: Matches the OAUTH_DEBUG (pages/api/oauth/callback.js) / ORG_CACHE_DEBUG
// (lib/org.js) convention — verbose per-request diagnostics must be opt-in, and must
// never include cookie/header content even when the flag is on (see issue #11).
const dlog = (...args) => { if (process.env.CARDS_DEBUG === 'true') console.log(...args); };

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

      // Functional: Optional limit/offset pagination (issue #22).
      // Strategic: Strictly additive/backward-compatible — omitting both params must
      // preserve today's exact bare-array response for every existing caller (admin UI,
      // public homepage). Invalid/out-of-range values (non-numeric, <=0, negative) are
      // treated as "not supplied" and fall back to the default unbounded behavior rather
      // than a 400, since this is an optional enhancement, not a validated required param.
      const MAX_LIMIT = 500;
      const rawLimit = Number(req.query.limit);
      const rawOffset = Number(req.query.offset);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : null;
      const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

      const query = col.find(filter).sort({ order: 1, _id: 1 });

      if (limit !== null) {
        // Functional: countDocuments only runs on the opted-in paginated path.
        // Strategic: Never adds a query cost to the default unpaginated path.
        const total = await col.countDocuments(filter);
        const docs = await query.skip(offset).limit(limit).toArray();
        dlog('[cards API]', req.method, 'org=', ctx.orgUuid, 'limit=', limit, 'offset=', offset, 'total=', total, 'count=', docs.length);
        return res.status(200).json({ cards: docs.map(toClient), total, hasMore: total > offset + docs.length });
      }

      const docs = await query.toArray();
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
