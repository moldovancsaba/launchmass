import clientPromise from '../../../lib/db';
import { ObjectId } from 'mongodb';
import { getOrgContext } from '../../../lib/org.js';
import { withSsoAuth } from '../../../lib/auth-oauth.js';

// Functional: Protect reorder operation with SSO authentication
// Strategic: Drag-and-drop reordering is an admin-only operation requiring authentication
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow',['POST']); return res.status(405).end('Method Not Allowed'); }

  return withSsoAuth(async (req, res) => {
    const { ids } = req.body || {};
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });

    const ctx = await getOrgContext(req);
    if (!ctx?.orgUuid) return res.status(400).json({ error: 'Organization context required (X-Organization-UUID or ?orgUuid=)' });

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');
    const col = db.collection('cards');

    // Validate that all ids belong to this organization to prevent cross-tenant leakage
    const objectIds = ids.map((id) => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean);
    const owned = await col.find({ _id: { $in: objectIds }, orgUuid: ctx.orgUuid }).project({ _id: 1 }).toArray();
    if (owned.length !== objectIds.length) return res.status(400).json({ error: 'One or more cards do not belong to this organization' });

    const ops = ids.map((id, idx) => ({ updateOne: { filter: { _id: new ObjectId(id), orgUuid: ctx.orgUuid }, update: { $set: { order: idx, updatedAt: new Date() } } } }));
    if (ops.length) await col.bulkWrite(ops);

    return res.status(200).json({ ok: true, count: ops.length });
  })(req, res);
}
