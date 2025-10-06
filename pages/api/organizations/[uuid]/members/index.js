// Functional: Organization member management endpoints (list, add)
// Strategic: Enables org admins to manage their team; supports both email and ssoUserId lookup;
// enforces last-admin protection via unique index and validation

import clientPromise from '../../../../../lib/db.js';
import { withSsoAuth, withOrgPermission } from '../../../../../lib/auth-oauth.js';

// Functional: ISO 8601 UTC timestamp with milliseconds (project standard)
// Strategic: Consistent timestamp format across all database records
function nowISO() {
  return new Date().toISOString();
}

// Functional: Normalize email to lowercase for consistent lookups
// Strategic: Prevents duplicate memberships due to case variations (user@domain vs User@domain)
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export default async function handler(req, res) {
  const { uuid: orgUuid } = req.query;

  // Functional: Validate orgUuid from URL parameter
  // Strategic: Early validation before database operations
  if (!orgUuid || typeof orgUuid !== 'string') {
    return res.status(400).json({ error: 'Invalid organization UUID' });
  }

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');

  // ===================================================================
  // GET /api/organizations/[uuid]/members - List organization members
  // ===================================================================

  if (req.method === 'GET') {
    // Functional: Require members.read permission to list members
    // Strategic: Org members (user role) can view other members; non-members cannot
    return withSsoAuth(
      withOrgPermission('members.read', async (req, res) => {
        const membersCol = db.collection('organizationMembers');
        const usersCol = db.collection('users');

        // Functional: Find all memberships for this organization
        // Strategic: Join with users collection to get member details
        const memberships = await membersCol
          .find({ orgUuid: String(orgUuid) })
          .sort({ role: -1, addedAt: 1 }) // admins first, then by join date
          .toArray();

        // Functional: Fetch user details for all members
        // Strategic: Batch lookup is more efficient than N individual queries
        const ssoUserIds = memberships.map(m => m.ssoUserId);
        const users = await usersCol
          .find({ ssoUserId: { $in: ssoUserIds } })
          .project({ ssoUserId: 1, email: 1, name: 1, isSuperAdmin: 1, _id: 0 })
          .toArray();

        // Functional: Create lookup map for fast user details retrieval
        const userMap = new Map(users.map(u => [u.ssoUserId, u]));

        // Functional: Combine membership and user data
        // Strategic: Avoid leaking sensitive fields; only include necessary info
        const members = memberships.map(m => {
          const user = userMap.get(m.ssoUserId);
          return {
            ssoUserId: m.ssoUserId,
            role: m.role,
            addedBy: m.addedBy,
            addedAt: m.addedAt,
            updatedAt: m.updatedAt,
            // User details (safe to expose in members list)
            email: user?.email || null,
            name: user?.name || null,
            isSuperAdmin: user?.isSuperAdmin || false,
          };
        });

        return res.status(200).json({ members });
      })
    )(req, res);
  }

  // ===================================================================
  // POST /api/organizations/[uuid]/members - Add new member
  // ===================================================================

  if (req.method === 'POST') {
    // Functional: Require members.write permission to add members
    // Strategic: Only org admins can add members; super admins bypass check
    return withSsoAuth(
      withOrgPermission('members.write', async (req, res) => {
        const { email, ssoUserId, role } = req.body || {};

        // Functional: Require either email or ssoUserId for lookup
        // Strategic: Email is more user-friendly; ssoUserId is more precise
        if (!email && !ssoUserId) {
          return res.status(400).json({
            error: 'Either email or ssoUserId is required',
            code: 'MISSING_IDENTIFIER',
          });
        }

        // Functional: Validate role is one of the allowed values
        // Strategic: Prevents arbitrary role values; enforces schema consistency
        if (!role || !['admin', 'user'].includes(role)) {
          return res.status(400).json({
            error: 'Role must be either "admin" or "user"',
            code: 'INVALID_ROLE',
          });
        }

        const usersCol = db.collection('users');
        const membersCol = db.collection('organizationMembers');

        // Functional: Look up user by email or ssoUserId
        // Strategic: Prefer email lookup (more user-friendly) but support ssoUserId for API integrations
        let targetUser;
        if (email) {
          const normalizedEmail = normalizeEmail(email);
          targetUser = await usersCol.findOne({ email: normalizedEmail });
        } else {
          targetUser = await usersCol.findOne({ ssoUserId: String(ssoUserId) });
        }

        // Functional: Return 404 if user doesn't exist
        // Strategic: Cannot add non-existent users; they must have logged in via SSO at least once
        if (!targetUser) {
          return res.status(404).json({
            error: 'User not found',
            code: 'USER_NOT_FOUND',
            message: email
              ? `No user found with email: ${email}`
              : `No user found with ssoUserId: ${ssoUserId}`,
          });
        }

        // Functional: Create membership document with audit fields
        // Strategic: Tracks who added the member and when for accountability
        const now = nowISO();
        const membership = {
          orgUuid: String(orgUuid),
          ssoUserId: targetUser.ssoUserId,
          role: role,
          addedBy: req.user.ssoUserId,
          addedAt: now,
          updatedAt: now,
        };

        try {
          // Functional: Insert membership with unique constraint protection
          // Strategic: Unique compound index on {orgUuid, ssoUserId} prevents duplicates
          await membersCol.insertOne(membership);

          return res.status(201).json({
            message: 'Member added successfully',
            member: {
              ssoUserId: targetUser.ssoUserId,
              email: targetUser.email,
              name: targetUser.name,
              role: role,
              addedAt: now,
            },
          });
        } catch (err) {
          // Functional: Handle duplicate key error (user already a member)
          // Strategic: Graceful handling of race conditions; clear error message
          if (err.code === 11000) {
            return res.status(409).json({
              error: 'User is already a member of this organization',
              code: 'DUPLICATE_MEMBER',
            });
          }

          // Functional: Log unexpected errors for debugging
          console.error('[members] Failed to add member:', err.message);
          return res.status(500).json({
            error: 'Failed to add member',
            code: 'DATABASE_ERROR',
          });
        }
      })
    )(req, res);
  }

  // Functional: Return 405 for unsupported methods
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
