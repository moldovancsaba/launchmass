import clientPromise from '../../../lib/db';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow',['POST']); return res.status(405).end('Method Not Allowed'); }
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });

  const { ids } = req.body || {};
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  const col = db.collection('cards');

  const ops = ids.map((id, idx) => ({ updateOne: { filter: { _id: new ObjectId(id) }, update: { $set: { order: idx, updatedAt: new Date() } } } }));
  if (ops.length) await col.bulkWrite(ops);

  return res.status(200).json({ ok: true, count: ops.length });
}
