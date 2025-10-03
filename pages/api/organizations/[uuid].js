import clientPromise from '../../../lib/db.js';
import { invalidateOrgCacheBySlug } from '../../../lib/org.js';
import { withSsoAuth } from '../../../lib/auth-oauth.js';

// /api/organizations/[uuid]: PUT (update), DELETE (soft delete)
// Functional: Update org profile or soft delete by uuid.
// Strategic: Keep slug unique; if slug changes, denormalize cards.orgSlug to keep in sync.


function normalizeSlug(input) {
  return String(input || '').trim().toLowerCase();
}

function validateSlug(slug) {
  return /^[a-z0-9-]{2,}$/.test(slug);
}

function coerceBoolean(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return false;
}

// Functional: Protect organization update and delete operations with SSO authentication
// Strategic: All organization management requires authenticated admin users
export default async function handler(req, res) {
  return withSsoAuth(async (req, res) => {
    const { uuid } = req.query || {};
    if (typeof uuid !== 'string' || !uuid.trim()) return res.status(400).json({ error: 'Organization UUID required' });

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');
    const orgs = db.collection('organizations');
    const cards = db.collection('cards');

    if (req.method === 'PUT') {
    const { name, slug, description, useSlugAsPublicUrl } = req.body || {};
    const nameStr = String(name || '').trim();
    const newSlugLower = normalizeSlug(slug);
    const descStr = String(description || '');
    const slugPublic = coerceBoolean(useSlugAsPublicUrl);

    if (!nameStr || !newSlugLower) return res.status(400).json({ error: 'name and slug required' });
    if (!validateSlug(newSlugLower)) return res.status(400).json({ error: 'invalid slug format' });

    const org = await orgs.findOne({ uuid });
    if (!org || org.isActive === false) return res.status(404).json({ error: 'Organization not found' });

    if (org.slug !== newSlugLower) {
      const conflict = await orgs.findOne({ slug: newSlugLower });
      if (conflict) return res.status(409).json({ error: 'slug already exists' });
    }

    await orgs.updateOne(
      { uuid },
      { $set: { name: nameStr, slug: newSlugLower, description: descStr, useSlugAsPublicUrl: slugPublic, updatedAt: new Date() } }
    );

    // If slug changed, update denormalized orgSlug on cards
    if (org.slug !== newSlugLower) {
      await cards.updateMany({ orgUuid: uuid }, { $set: { orgSlug: newSlugLower, updatedAt: new Date() } });
      invalidateOrgCacheBySlug(org.slug);
      invalidateOrgCacheBySlug(newSlugLower);
    }

    const updated = await orgs.findOne({ uuid });
    return res.status(200).json({ organization: { ...updated, _id: updated?._id?.toString?.() || String(updated?._id) } });
  }

  if (req.method === 'DELETE') {
    const org = await orgs.findOne({ uuid });
    if (!org || org.isActive === false) return res.status(404).json({ error: 'Organization not found' });

    await orgs.updateOne({ uuid }, { $set: { isActive: false, updatedAt: new Date() } });
    invalidateOrgCacheBySlug(org.slug);

      return res.status(200).json({ message: 'Organization deleted successfully', uuid });
    }

    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).end('Method Not Allowed');
  })(req, res);
}
