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

// WHAT: Default background gradient for organizations
// WHY: Consistent with card default background
const DEFAULT_BG = "linear-gradient(90deg, rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%)";

// WHAT: Normalize background input to extract CSS value
// WHY: Handle multi-line CSS paste format like cards do
function normalizeBg(input) {
  if (!input) return DEFAULT_BG;
  const lines = String(input).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const linear = lines.find(l => l.startsWith('background: linear-gradient'));
  const color = lines.find(l => /^background:\s*#?[0-9a-fA-F]{3,8}/.test(l));
  const pick = (linear || color || input).replace(/^background:\s*/,'').replace(/;$/,'');
  return pick || DEFAULT_BG;
}

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
    return withSsoAuth(async (req, res) => {
      // WHAT: Manually set org context from URL path UUID
      // WHY: withOrgPermission expects orgUuid in headers/query, but we have it in URL path
      req.query.orgUuid = uuid;
      
      return withOrgPermission('org.write', async (req, res) => {
    const { name, slug, description, useSlugAsPublicUrl, isDefault, background } = req.body || {};
    const nameStr = String(name || '').trim();
    const newSlugLower = normalizeSlug(slug);
    const descStr = String(description || '');
    const slugPublic = coerceBoolean(useSlugAsPublicUrl);
    const setAsDefault = coerceBoolean(isDefault);
    const bg = background !== undefined ? normalizeBg(background) : undefined;

    // WHAT: Allow updating just isDefault field without other required fields
    // WHY: Radio button only sends isDefault: true
    const isDefaultOnlyUpdate = isDefault !== undefined && !name && !slug;
    
    if (!isDefaultOnlyUpdate && (!nameStr || !newSlugLower)) {
      return res.status(400).json({ error: 'name and slug required' });
    }
    if (!isDefaultOnlyUpdate && !validateSlug(newSlugLower)) {
      return res.status(400).json({ error: 'invalid slug format' });
    }

    const org = await orgs.findOne({ uuid });
    if (!org || org.isActive === false) return res.status(404).json({ error: 'Organization not found' });

    if (!isDefaultOnlyUpdate && org.slug !== newSlugLower) {
      const conflict = await orgs.findOne({ slug: newSlugLower });
      if (conflict) return res.status(409).json({ error: 'slug already exists' });
    }

        // WHAT: If setting as default, unset all other orgs first
        // WHY: Only one organization can be default at a time
        if (setAsDefault) {
          await orgs.updateMany(
            { uuid: { $ne: uuid } },
            { $set: { isDefault: false, updatedAt: isoNow() } }
          );
        }

        // WHAT: Build update object based on what fields were provided
        // WHY: Support both full updates and isDefault-only updates
        const updateFields = { updatedAt: isoNow() };
        if (!isDefaultOnlyUpdate) {
          updateFields.name = nameStr;
          updateFields.slug = newSlugLower;
          updateFields.description = descStr;
          updateFields.useSlugAsPublicUrl = slugPublic;
        }
        if (isDefault !== undefined) {
          updateFields.isDefault = setAsDefault;
        }
        // WHAT: Update background if provided
        // WHY: Allow organizations to have custom backgrounds like cards
        if (bg !== undefined) {
          updateFields.background = bg;
        }

        await orgs.updateOne(
          { uuid },
          { $set: updateFields }
        );

        // Functional: If slug changed, denormalize to cards.orgSlug
        // Strategic: Maintains data consistency across collections; slug is read-often field
        if (!isDefaultOnlyUpdate && org.slug !== newSlugLower) {
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
      })(req, res);
    })(req, res);
  }

  // ===================================================================
  // DELETE /api/organizations/[uuid] - Soft delete organization
  // ===================================================================

  if (req.method === 'DELETE') {
    // Functional: Require org.delete permission
    // Strategic: Only org admins can delete org; users cannot
    return withSsoAuth(async (req, res) => {
      // WHAT: Manually set org context from URL path UUID
      // WHY: withOrgPermission expects orgUuid in headers/query, but we have it in URL path
      req.query.orgUuid = uuid;
      
      return withOrgPermission('org.delete', async (req, res) => {
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
      })(req, res);
    })(req, res);
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}
