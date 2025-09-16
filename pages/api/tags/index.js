import clientPromise from '../../../lib/db';

// Returns distinct normalized tags. Optional prefix filter via ?q=.
export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  const col = db.collection('cards');

  const raw = await col.distinct('tags');
  const tags = Array.isArray(raw) ? raw.filter(t => typeof t === 'string' && t.trim()).map(t => t.toLowerCase()) : [];
  const unique = Array.from(new Set(tags));

  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  const filtered = q ? unique.filter(t => t.startsWith(q)) : unique;

  return res.status(200).json(filtered);
}