import clientPromise from '../../../lib/db.js';
import { getOrgContext } from '../../../lib/org.js';

// /api/tags: GET — distinct tags for the current organization
// Functional: Returns the set of tags available within the selected organization.
// Strategic: Keeps suggestions and filtering org-scoped to prevent cross-tenant leakage.

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end('Method Not Allowed'); }

  const ctx = await getOrgContext(req);
  if (!ctx?.orgUuid) return res.status(400).json({ error: 'Organization context required (X-Organization-UUID or ?orgUuid=)' });

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');

  try {
    // Distinct tags scoped by orgUuid; tags are normalized to lowercase at write time
    const tags = await db.collection('cards').distinct('tags', { orgUuid: ctx.orgUuid });
    const safe = (Array.isArray(tags) ? tags : []).filter(t => typeof t === 'string' && t.trim() !== '');
    return res.status(200).json(safe);
  } catch (e) {
    return res.status(200).json([]);
  }
}
