import clientPromise from '../../../lib/db';

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
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  const col = db.collection('cards');

  if (req.method === 'GET') {
    const docs = await col.find({}).sort({ order: 1, _id: 1 }).toArray();
    return res.status(200).json(docs.map(toClient));
  }

  if (req.method === 'POST') {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });

    const { href = '', title = '', description = '', order, background, tags } = req.body || {};
    const last = await col.find({}).sort({ order: -1 }).limit(1).toArray();
    const nextOrder = Number.isFinite(order) ? Number(order) : (last.length ? (Number(last[0].order) + 1) : 0);
    const now = new Date();
    const bg = typeof background === 'string' && background.trim() ? normalizeBg(background) : DEFAULT_BG;

    // Functional: Normalize incoming tags to a canonical array of lowercased strings without '#'.
    // Strategic: Ensures consistent filtering and prevents duplicates across the system.
    const safeTags = normalizeTags(tags);

    const doc = { href: String(href), title: String(title), description: String(description), background: bg, order: nextOrder, createdAt: now, updatedAt: now, tags: safeTags };
    const r = await col.insertOne(doc);
    const created = { _id: r.insertedId.toString(), ...doc };
    return res.status(201).json(toClient(created));
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
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
