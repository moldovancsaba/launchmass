import clientPromise from '../../../lib/db';
import { ObjectId } from 'mongodb';

function toClient(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { _id: _id?.toString?.() || String(_id), ...rest };
}

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'oversized-links');
  const col = db.collection('cards');

  const { id } = req.query;
  let _id;
  try { _id = new ObjectId(id); } catch { return res.status(400).json({ error: 'Invalid id' }); }

  if (req.method === 'PATCH') {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const update = {};
    ['href','title','description','order'].forEach(k => {
      if (k in req.body) update[k] = k === 'order' ? Number(req.body[k]) : String(req.body[k] ?? '');
    });
    update.updatedAt = new Date();
    await col.updateOne({ _id }, { $set: update });
    const doc = await col.findOne({ _id });
    return res.status(200).json(toClient(doc));
  }

  if (req.method === 'DELETE') {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await col.deleteOne({ _id });
    return res.status(204).end();
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}
