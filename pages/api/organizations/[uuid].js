import clientPromise from '../../../lib/db.js';
import { invalidateOrgCacheBySlug } from '../../../lib/org.js';
import { withSsoAuth, withOrgPermission } from '../../../lib/auth-oauth.js';

// /api/organizations/[uuid]: GET, PUT (update), DELETE (soft delete)
// Functional: Read, update, or soft-delete organization by UUID with permission checks
// Strategic: Enforces org.read, org.write, org.delete permissions; slug changes denormalize to cards


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

// Functional: ISO 8601 UTC timestamp helper (project standard)
function isoNow() { return new Date().toISOString(); }

// Functional: Protect organization operations with SSO authentication and permission checks
// Strategic: GET requires org.read, PUT requires org.write, DELETE requires org.delete
export default async function handler(req, res) {
  const { uuid } = req.query || {};
  if (typeof uuid !== 'string' || !uuid.trim()) {
    return res.status(400).json({ error: 'Organization UUID required' });
  }

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  const orgs = db.collection('organizations');
  const cards = db.collection('cards');

  // ===================================================================
  // GET /api/organizations/[uuid] - Read organization details
  // ===================================================================

  if (req.method === 'GET') {
    // Functional: Require org.read permission
    // Strategic: Members and admins can view org details; non-members get 403
    return withSsoAuth(
      withOrgPermission('org.read', async (req, res) => {
        const org = await orgs.findOne({ uuid });
        
        if (!org || org.isActive === false) {
          return res.status(404).json({ error: 'Organization not found' });
        }

        // Functional: Return org with user's role attached
        // Strategic: Client can display role-specific UI based on userOrgRole
        return res.status(200).json({
          organization: {
            ...org,
            _id: org?._id?.toString?.() || String(org?._id),
            userRole: req.userOrgRole || null,
          },
        });
      })
    )(req, res);
  }

  // ===================================================================
  // PUT /api/organizations/[uuid] - Update organization
  // ===================================================================

  if (req.method === 'PUT') {
    // Functional: Require org.write permission
    // Strategic: Only org admins can update org details; users cannot
    return withSsoAuth(
      withOrgPermission('org.write', async (req, res) => {
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
          { $set: { name: nameStr, slug: newSlugLower, description: descStr, useSlugAsPublicUrl: slugPublic, updatedAt: isoNow() } }
        );

        // Functional: If slug changed, denormalize to cards.orgSlug
        // Strategic: Maintains data consistency across collections; slug is read-often field
        if (org.slug !== newSlugLower) {
          await cards.updateMany(
            { orgUuid: uuid },
            { $set: { orgSlug: newSlugLower, updatedAt: isoNow() } }
          );
          invalidateOrgCacheBySlug(org.slug);
          invalidateOrgCacheBySlug(newSlugLower);
        }

        const updated = await orgs.findOne({ uuid });
        return res.status(200).json({
          organization: {
            ...updated,
            _id: updated?._id?.toString?.() || String(updated?._id),
          },
        });
      })
    )(req, res);
  }

  // ===================================================================
  // DELETE /api/organizations/[uuid] - Soft delete organization
  // ===================================================================

  if (req.method === 'DELETE') {
    // Functional: Require org.delete permission
    // Strategic: Only org admins can delete org; users cannot
    return withSsoAuth(
      withOrgPermission('org.delete', async (req, res) => {
        const org = await orgs.findOne({ uuid });
        if (!org || org.isActive === false) {
          return res.status(404).json({ error: 'Organization not found' });
        }

        // Functional: Soft delete by setting isActive to false
        // Strategic: Preserves data for potential recovery; cards remain linked
        await orgs.updateOne(
          { uuid },
          { $set: { isActive: false, updatedAt: isoNow() } }
        );
        invalidateOrgCacheBySlug(org.slug);

        return res.status(200).json({
          message: 'Organization deleted successfully',
          uuid,
        });
      })
    )(req, res);
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}
