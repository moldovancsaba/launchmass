import clientPromise from '../../../lib/db';
import { ObjectId } from 'mongodb';
import { getOrgContext } from '../../../lib/org.js';

function toClient(doc) {
  if (!doc) return doc;
  const { _id, createdAt, updatedAt, ...rest } = doc;
  return { 
    _id: _id?.toString?.() || String(_id), 
    ...rest,
    tags: Array.isArray(rest?.tags) ? rest.tags : [],
    // Convert Date objects to ISO strings for JSON serialization
    ...(createdAt && { createdAt: createdAt.toISOString() }),
    ...(updatedAt && { updatedAt: updatedAt.toISOString() })
  };
}

const DEFAULT_BG = "linear-gradient(90deg, rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%)";

function normalizeBg(input) {
  const lines = String(input).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const linear = lines.find(l => l.startsWith('background: linear-gradient'));
  const color = lines.find(l => /^background:\s*#?[0-9a-fA-F]{3,8}/.test(l));
  const pick = (linear || color || input).replace(/^background:\s*/,'').replace(/;$/,'');
  return pick || DEFAULT_BG;
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

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  const col = db.collection('cards');

  const { id } = req.query;
  let _id;
  try { _id = new ObjectId(id); } catch { return res.status(400).json({ error: 'Invalid id' }); }

  if (req.method === 'PATCH') {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });

    // Require org context; guard updates to the owning org only
    const ctx = await getOrgContext(req);
    if (!ctx?.orgUuid) return res.status(400).json({ error: 'Organization context required (X-Organization-UUID or ?orgUuid=)' });

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
    return res.status(200).json(toClient(doc));
  }

  if (req.method === 'DELETE') {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    const ctx = await getOrgContext(req);
    if (!ctx?.orgUuid) return res.status(400).json({ error: 'Organization context required (X-Organization-UUID or ?orgUuid=)' });
    const r = await col.deleteOne({ _id, orgUuid: ctx.orgUuid });
    if (!r.deletedCount) return res.status(404).json({ error: 'Card not found in this organization' });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}
