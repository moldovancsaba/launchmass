import { getOrgBySlugCached } from '../../../lib/org.js';

// /api/organization/[slug]: GET — public resolver by slug
// Functional: Resolve an active organization by slug for SSR/client use.
// Strategic: Mirrors narimato resolver and enables path-based org pages.

export default async function handler(req, res) {
  const { slug } = req.query || {};
  if (typeof slug !== 'string' || !slug.trim()) return res.status(400).json({ error: 'slug required' });

  const org = await getOrgBySlugCached(slug);
  if (!org || org.isActive === false) return res.status(404).json({ error: 'Organization not found' });

  const { _id, isActive, ...rest } = org;
  return res.status(200).json({ organization: { ...rest, _id: _id?.toString?.() || String(_id) } });
}
