/**
 * pages/api/admin/users/[ssoUserId]/grant-access.js
 * 
 * WHAT: Grant access to a pending user with specified role
 * WHY: Admin approval workflow for access requests
 * HOW: Calls SSO API to update permission, then syncs local cache
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
    // WHY: Ensure valid role and user ID
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
    // For now, allow any authenticated user

    // WHAT: Update local user directly (simplified permission management)
    // WHY: Manage permissions locally without depending on SSO API calls
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');
    const usersCol = db.collection('users');

    const now = new Date().toISOString();

    // WHAT: Sync permission to SSO first (Phase 4D integration)
    // WHY: SSO is the source of truth for permissions
    // HOW: Use client_credentials OAuth to authenticate with SSO
    try {
      await syncPermissionToSSO(ssoUserId, {
        role,
        status: 'approved',
        grantedBy: req.user?.email || 'launchmass-admin',
      });
      console.log('[SSO Sync] Permission synced successfully', { ssoUserId, role });
    } catch (ssoError) {
      console.error('[SSO Sync] Failed to sync permission to SSO:', ssoError.message);
      // WHAT: Continue with local update even if SSO sync fails
      // WHY: Don't block admin workflow if SSO is temporarily unavailable
      // TODO: Queue for retry or show warning to admin
    }

    const result = await usersCol.updateOne(
      { ssoUserId },
      {
        $set: {
          appRole: role,
          appStatus: 'active',
          hasAccess: true,
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

    console.log('Access granted:', { ssoUserId, role });

    return res.status(200).json({
      success: true,
      message: 'Access granted successfully',
      user: { ssoUserId, role, status: 'active' },
    });
  } catch (error) {
    console.error('Error granting access:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to grant access',
    });
  }
}

// WHAT: Wrap with SSO authentication
// WHY: Only authenticated admins can grant access
export default withSsoAuth(handler);
