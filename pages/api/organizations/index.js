import clientPromise from '../../../lib/db.js';
import { ensureOrgContext, getOrgContext } from '../../../lib/org.js';
import { withSsoAuth } from '../../../lib/auth-oauth.js';
import { isSuperAdmin } from '../../../lib/permissions.js';

// /api/organizations (index): GET (list active) and POST (create)
// Functional: Manage organizations with permission-based filtering and auto-admin membership
// Strategic: Super admins see all orgs; regular users see only orgs where they are members;
// org creators automatically become admins via organizationMembers collection

function isoNow() { return new Date().toISOString(); }

function normalizeSlug(input) {
  return String(input || '').trim().toLowerCase();
}

function validateSlug(slug) {
  // a-z, 0-9, dash; length >= 2
  return /^[a-z0-9-]{2,}$/.test(slug);
}

function coerceBoolean(v) {
  // Functional: Normalize boolean-like inputs from JSON to true/false
  // Strategic: Avoids UI differences (checkbox true/false or string 'true') causing inconsistent storage
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return false;
}

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  const col = db.collection('organizations');

  // Functional: Protect GET (list organizations) with SSO authentication
  // Strategic: Filter orgs by membership; super admins see all, regular users see only their orgs
  if (req.method === 'GET') {
    return withSsoAuth(async (req, res) => {
      // Functional: Super admins bypass membership filtering
      // Strategic: Super admins need to see all orgs for administration
      if (isSuperAdmin(req.user)) {
        const docs = await col.find({ isActive: { $ne: false } }).sort({ createdAt: -1 }).toArray();
        const out = docs.map(({ _id, ...rest }) => ({ _id: _id?.toString?.() || String(_id), ...rest }));
        return res.status(200).json({ organizations: out });
      }

      // Functional: Find organizations where user is a member
      // Strategic: Query organizationMembers to get user's org memberships, then filter orgs list
      const membersCol = db.collection('organizationMembers');
      const memberships = await membersCol
        .find({ ssoUserId: req.user.ssoUserId })
        .project({ orgUuid: 1, role: 1, _id: 0 })
        .toArray();

      // Functional: Extract org UUIDs from memberships
      const memberOrgUuids = memberships.map(m => m.orgUuid);

      // Functional: Return empty array if user has no memberships
      // Strategic: Non-members see no organizations
      if (memberOrgUuids.length === 0) {
        return res.status(200).json({ organizations: [] });
      }

      // Functional: Fetch organizations where user is a member
      // Strategic: Filter by active status AND membership
      const docs = await col
        .find({ uuid: { $in: memberOrgUuids }, isActive: { $ne: false } })
        .sort({ createdAt: -1 })
        .toArray();

      // Functional: Attach user's role to each org for client-side role display
      // Strategic: Enables UI to show "Admin" or "User" badge per org
      const roleMap = new Map(memberships.map(m => [m.orgUuid, m.role]));
      const out = docs.map(({ _id, ...rest }) => ({
        _id: _id?.toString?.() || String(_id),
        ...rest,
        userRole: roleMap.get(rest.uuid) || null,
      }));

      return res.status(200).json({ organizations: out });
    })(req, res);
  }

  // Functional: Protect POST (create organization) with SSO authentication
  // Strategic: Authenticated users can create orgs; creator automatically becomes admin
  if (req.method === 'POST') {
    return withSsoAuth(async (req, res) => {
      const { name, slug, description, useSlugAsPublicUrl } = req.body || {};
      const nameStr = String(name || '').trim();
      const slugLower = normalizeSlug(slug);
      const descStr = String(description || '');
      const slugPublic = coerceBoolean(useSlugAsPublicUrl);

      if (!nameStr || !slugLower) return res.status(400).json({ error: 'name and slug required' });
      if (!validateSlug(slugLower)) return res.status(400).json({ error: 'invalid slug format' });

      const now = isoNow();
      // Use crypto.randomUUID() (Node >= 18) to avoid new deps
      const uuid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Ensure uniqueness by checking before insert (unique index recommended separately)
      const existing = await col.findOne({ slug: slugLower });
      if (existing) return res.status(409).json({ error: 'slug already exists' });

      const doc = { uuid, name: nameStr, slug: slugLower, description: descStr, isActive: true, createdAt: now, updatedAt: now, useSlugAsPublicUrl: slugPublic };
      const r = await col.insertOne(doc);

      // Functional: Automatically add creator as admin in organizationMembers
      // Strategic: Ensures creator has full control over their new organization
      const membersCol = db.collection('organizationMembers');
      try {
        await membersCol.insertOne({
          orgUuid: uuid,
          ssoUserId: req.user.ssoUserId,
          role: 'admin',
          addedBy: req.user.ssoUserId, // Self-added
          addedAt: now,
          updatedAt: now,
        });
      } catch (memberErr) {
        // Functional: Log error but don't fail org creation
        // Strategic: Org exists but creator membership failed; super admin can fix manually
        console.error('[organizations] Failed to add creator as admin:', memberErr.message);
      }

      return res.status(201).json({ organization: { _id: r.insertedId.toString(), ...doc, userRole: 'admin' } });
    })(req, res);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
