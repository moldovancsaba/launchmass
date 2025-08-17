import clientPromise from '../../../lib/db';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  const col = db.collection('links');

  if (req.method === 'GET') {
    const docs = await col.find({}).sort({ order: 1, _id: 1 }).toArray();
    return res.status(200).json(docs);
  }

  if (req.method === 'PUT') {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Array required' });
    const now = new Date();
    const docs = req.body.map((d, i) => ({
      href: String(d.href || ''),
      title: String(d.title || ''),
      description: String(d.description || ''),
      order: Number.isFinite(d.order) ? d.order : i,
      createdAt: now,
      updatedAt: now,
    }));
    await col.deleteMany({});
    if (docs.length) await col.insertMany(docs);
    await col.createIndex({ order: 1 });
    return res.status(200).json({ ok: true, count: docs.length });
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end('Method Not Allowed');
}
