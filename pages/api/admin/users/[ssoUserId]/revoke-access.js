/**
 * pages/api/admin/users/[ssoUserId]/revoke-access.js
 * 
 * WHAT: Revoke a user's access to launchmass
 * WHY: Admin needs ability to remove access from users
 * HOW: Calls SSO API to revoke permission, updates local cache
 */

import { withSsoAuth } from '../../../../../lib/auth-oauth';
import clientPromise from '../../../../../lib/db';
import { revokePermissionInSSO } from '../../../../../lib/ssoPermissions.mjs';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ssoUserId } = req.query;

    // WHAT: Validate input
    if (!ssoUserId) {
      return res.status(400).json({
        error: 'Missing parameter',
        message: 'ssoUserId is required',
      });
    }

    // TODO: Check if req.user is superadmin

    // WHAT: Revoke permission in SSO first (Phase 4D integration)
    // WHY: SSO is the source of truth for permissions
    try {
      await revokePermissionInSSO(ssoUserId);
      console.log('[SSO Sync] Permission revoked in SSO', { ssoUserId });
    } catch (ssoError) {
      console.error('[SSO Sync] Failed to revoke permission in SSO:', ssoError.message);
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
          appRole: 'none',
          appStatus: 'revoked',
          hasAccess: false,
          isAdmin: false,
          isSuperAdmin: false,
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

    console.log('Access revoked:', { ssoUserId });

    return res.status(200).json({
      success: true,
      message: 'Access revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking access:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to revoke access',
    });
  }
}

export default withSsoAuth(handler);
