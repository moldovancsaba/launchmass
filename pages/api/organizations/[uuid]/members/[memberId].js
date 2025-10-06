// Functional: Individual member management endpoints (update role, remove)
// Strategic: Enforces last-admin protection to prevent orphaned organizations;
// supports both role updates and member removal with proper validation

import clientPromise from '../../../../../lib/db.js';
import { withSsoAuth, withOrgPermission } from '../../../../../lib/auth-oauth.js';
import { isLastAdmin } from '../../../../../lib/permissions.js';

// Functional: ISO 8601 UTC timestamp with milliseconds (project standard)
// Strategic: Consistent timestamp format across all database records
function nowISO() {
  return new Date().toISOString();
}

export default async function handler(req, res) {
  const { uuid: orgUuid, memberId: ssoUserId } = req.query;

  // Functional: Validate URL parameters
  // Strategic: Early validation before database operations
  if (!orgUuid || typeof orgUuid !== 'string') {
    return res.status(400).json({ error: 'Invalid organization UUID' });
  }

  if (!ssoUserId || typeof ssoUserId !== 'string') {
    return res.status(400).json({ error: 'Invalid member ID' });
  }

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  const membersCol = db.collection('organizationMembers');

  // ===================================================================
  // PATCH /api/organizations/[uuid]/members/[memberId] - Update role
  // ===================================================================

  if (req.method === 'PATCH') {
    // Functional: Require members.write permission to update roles
    // Strategic: Only org admins can change member roles; super admins bypass check
    return withSsoAuth(
      withOrgPermission('members.write', async (req, res) => {
        const { role } = req.body || {};

        // Functional: Validate new role value
        // Strategic: Only allow switching between admin and user roles
        if (!role || !['admin', 'user'].includes(role)) {
          return res.status(400).json({
            error: 'Role must be either "admin" or "user"',
            code: 'INVALID_ROLE',
          });
        }

        // Functional: Find existing membership to check current role
        // Strategic: Need current role to enforce last-admin protection
        const existing = await membersCol.findOne({
          orgUuid: String(orgUuid),
          ssoUserId: String(ssoUserId),
        });

        if (!existing) {
          return res.status(404).json({
            error: 'Member not found',
            code: 'MEMBER_NOT_FOUND',
          });
        }

        // Functional: Check if already has the requested role
        // Strategic: No-op if role unchanged; avoids unnecessary database writes
        if (existing.role === role) {
          return res.status(200).json({
            message: 'Member role unchanged',
            member: {
              ssoUserId: existing.ssoUserId,
              role: existing.role,
            },
          });
        }

        // Functional: Enforce last-admin protection when demoting admin to user
        // Strategic: Prevents orphaned organizations with no admins
        if (existing.role === 'admin' && role === 'user') {
          const isLast = await isLastAdmin(String(orgUuid), String(ssoUserId), 'admin');
          if (isLast) {
            return res.status(409).json({
              error: 'Cannot demote the last admin',
              code: 'LAST_ADMIN_PROTECTION',
              message: 'This organization must have at least one admin. Promote another member to admin first.',
            });
          }
        }

        // Functional: Update role with new timestamp
        // Strategic: updatedAt tracks when role was last changed for audit purposes
        const result = await membersCol.updateOne(
          { orgUuid: String(orgUuid), ssoUserId: String(ssoUserId) },
          {
            $set: {
              role: role,
              updatedAt: nowISO(),
            },
          }
        );

        if (result.modifiedCount === 0) {
          return res.status(500).json({
            error: 'Failed to update member role',
            code: 'UPDATE_FAILED',
          });
        }

        return res.status(200).json({
          message: 'Member role updated successfully',
          member: {
            ssoUserId: String(ssoUserId),
            role: role,
            updatedAt: nowISO(),
          },
        });
      })
    )(req, res);
  }

  // ===================================================================
  // DELETE /api/organizations/[uuid]/members/[memberId] - Remove member
  // ===================================================================

  if (req.method === 'DELETE') {
    // Functional: Require members.write permission to remove members
    // Strategic: Only org admins can remove members; super admins bypass check
    return withSsoAuth(
      withOrgPermission('members.write', async (req, res) => {
        // Functional: Find existing membership to check role before deletion
        // Strategic: Need current role to enforce last-admin protection
        const existing = await membersCol.findOne({
          orgUuid: String(orgUuid),
          ssoUserId: String(ssoUserId),
        });

        if (!existing) {
          return res.status(404).json({
            error: 'Member not found',
            code: 'MEMBER_NOT_FOUND',
          });
        }

        // Functional: Enforce last-admin protection when removing admin
        // Strategic: Prevents orphaned organizations with no admins
        if (existing.role === 'admin') {
          const isLast = await isLastAdmin(String(orgUuid), String(ssoUserId), 'admin');
          if (isLast) {
            return res.status(409).json({
              error: 'Cannot remove the last admin',
              code: 'LAST_ADMIN_PROTECTION',
              message: 'This organization must have at least one admin. Promote another member to admin first.',
            });
          }
        }

        // Functional: Delete membership record
        // Strategic: Hard delete (not soft) since membership can always be re-added
        const result = await membersCol.deleteOne({
          orgUuid: String(orgUuid),
          ssoUserId: String(ssoUserId),
        });

        if (result.deletedCount === 0) {
          return res.status(500).json({
            error: 'Failed to remove member',
            code: 'DELETE_FAILED',
          });
        }

        return res.status(200).json({
          message: 'Member removed successfully',
          removedMember: {
            ssoUserId: String(ssoUserId),
          },
        });
      })
    )(req, res);
  }

  // Functional: Return 405 for unsupported methods
  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}
