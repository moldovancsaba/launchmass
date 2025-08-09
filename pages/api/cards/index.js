import clientPromise from '../../../lib/db';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'oversized-links');
  const col = db.collection('cards');

  if (req.method === 'GET') {
    const docs = await col.find({}).sort({ order: 1, _id: 1 }).toArray();
    return res.status(200).json(docs);
  }

  if (req.method === 'POST') {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    const { href = '', title = '', description = '' } = req.body || {};
    const last = await col.find({}).sort({ order: -1 }).limit(1).toArray();
    const order = last.length ? (Number(last[0].order) + 1) : 0;
    const now = new Date();
    const doc = { href: String(href), title: String(title), description: String(description), order, createdAt: now, updatedAt: now };
    const r = await col.insertOne(doc);
    return res.status(201).json({ _id: r.insertedId, ...doc });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
