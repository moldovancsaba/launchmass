import clientPromise from '../../../lib/db';
import { ObjectId } from 'mongodb';
import { withSsoAuth, withOrgPermission } from '../../../lib/auth-oauth.js';
import { logEvent, EVENT_TYPES } from '../../../lib/analytics.js';
import { normalizeBg, normalizeTags, toClient } from '../../../lib/shared.js';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  const col = db.collection('cards');

  const { id } = req.query;
  let _id;
  try { _id = new ObjectId(id); } catch { return res.status(400).json({ error: 'Invalid id' }); }

  // Functional: Protect PATCH (update) operation with org-scoped authorization
  // Strategic: withSsoAuth authenticates and populates req.user; withOrgPermission then
  // checks the caller holds 'cards.update' in the target org before running the handler.
  // withOrgPermission alone does not validate the session -- it resolves org context
  // internally and attaches it as req.orgContext, so no separate getOrgContext call is
  // needed here (see issue #8).
  if (req.method === 'PATCH') {
    return withSsoAuth(withOrgPermission('cards.update', async (req, res) => {
      const ctx = req.orgContext;

      const update = {};
      for (const k of ['href','title','description','order','background','tags']) {
        if (k in req.body) {
          if (k === 'order') update[k] = Number(req.body[k]);
          else if (k === 'background') update[k] = normalizeBg(String(req.body[k] ?? ''));
          else if (k === 'tags') update[k] = normalizeTags(req.body[k]);
          else update[k] = String(req.body[k] ?? '');
        }
      }
      update.updatedAt = new Date();
      const r = await col.updateOne({ _id, orgUuid: ctx.orgUuid }, { $set: update });
      if (!r.matchedCount) return res.status(404).json({ error: 'Card not found in this organization' });
      const doc = await col.findOne({ _id, orgUuid: ctx.orgUuid });
      logEvent(EVENT_TYPES.CARD_UPDATE, { orgUuid: ctx.orgUuid, userId: req.user.ssoUserId, cardId: _id.toString() });
      return res.status(200).json(toClient(doc));
    }))(req, res);
  }

  // Functional: Protect DELETE operation with org-scoped authorization
  // Strategic: withSsoAuth authenticates and populates req.user; withOrgPermission then
  // checks the caller holds 'cards.delete' in the target org before running the handler.
  // Org context ensures tenant isolation and is resolved internally, attached as
  // req.orgContext (see issue #8).
  if (req.method === 'DELETE') {
    return withSsoAuth(withOrgPermission('cards.delete', async (req, res) => {
      const ctx = req.orgContext;
      const r = await col.deleteOne({ _id, orgUuid: ctx.orgUuid });
      if (!r.deletedCount) return res.status(404).json({ error: 'Card not found in this organization' });
      logEvent(EVENT_TYPES.CARD_DELETE, { orgUuid: ctx.orgUuid, userId: req.user.ssoUserId, cardId: _id.toString() });
      return res.status(204).end();
    }))(req, res);
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}
