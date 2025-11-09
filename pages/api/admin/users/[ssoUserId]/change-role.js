/**
 * pages/api/admin/users/[ssoUserId]/change-role.js
 * 
 * WHAT: Change a user's role (upgrade/downgrade permissions)
 * WHY: Admins need to adjust user permissions over time
 * HOW: Calls SSO API to update role, syncs local cache
 */

import { withSsoAuth } from '../../../../../lib/auth-oauth';
import clientPromise from '../../../../../lib/db';
import { syncPermissionToSSO } from '../../../../../lib/ssoPermissions.mjs';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ssoUserId } = req.query;
    const { role } = req.body;

    // WHAT: Validate inputs
    if (!ssoUserId) {
      return res.status(400).json({
        error: 'Missing parameter',
        message: 'ssoUserId is required',
      });
    }

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be: user or admin',
      });
    }

    // TODO: Check if req.user is superadmin

    // WHAT: Sync role change to SSO first (Phase 4D integration)
    // WHY: SSO is the source of truth for permissions
    try {
      await syncPermissionToSSO(ssoUserId, {
        role,
        status: 'approved',
        grantedBy: req.user?.email || 'launchmass-admin',
      });
      console.log('[SSO Sync] Role updated in SSO', { ssoUserId, role });
    } catch (ssoError) {
      console.error('[SSO Sync] Failed to sync role change to SSO:', ssoError.message);
      // Continue with local update even if SSO sync fails
    }

    // WHAT: Update local user directly
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');
    const usersCol = db.collection('users');

    const now = new Date().toISOString();

    const result = await usersCol.updateOne(
      { ssoUserId },
      {
        $set: {
          appRole: role,
          isAdmin: (role === 'admin'),
          updatedAt: now,
          lastSyncedAt: now,
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: `No user found with ssoUserId: ${ssoUserId}`,
      });
    }

    console.log('Role changed:', { ssoUserId, role });

    return res.status(200).json({
      success: true,
      message: 'Role changed successfully',
      user: { ssoUserId, role },
    });
  } catch (error) {
    console.error('Error changing role:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to change role',
    });
  }
}

export default withSsoAuth(handler);
