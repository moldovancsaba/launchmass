/**
 * pages/api/admin/users/[ssoUserId]/revoke-access.js
 * 
 * WHAT: Revoke a user's access to launchmass
 * WHY: Admin needs ability to remove access from users
 * HOW: Calls SSO API to revoke permission, updates local cache
 */

import { withSsoAuth } from '../../../../../lib/auth-oauth';
import clientPromise from '../../../../../lib/db';

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

    // WHAT: Get OAuth client ID
    const clientId = process.env.SSO_CLIENT_ID;
    const ssoServerUrl = process.env.SSO_SERVER_URL || 'https://sso.doneisbetter.com';

    if (!clientId) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'SSO_CLIENT_ID not configured',
      });
    }

    // WHAT: Call SSO API to revoke permission
    // WHY: SSO is source of truth
    const ssoResponse = await fetch(
      `${ssoServerUrl}/api/admin/users/${ssoUserId}/apps/${clientId}/permissions`,
      {
        method: 'DELETE',
        headers: {
          'Cookie': req.headers.cookie || '',
        },
      }
    );

    if (!ssoResponse.ok) {
      const errorData = await ssoResponse.json().catch(() => ({}));
      console.error('SSO permission revoke failed:', ssoResponse.status, errorData);
      return res.status(ssoResponse.status).json({
        error: 'Failed to revoke permission',
        message: errorData.message || 'SSO API error',
      });
    }

    // WHAT: Update local user cache
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');
    const usersCol = db.collection('users');

    const now = new Date().toISOString();

    await usersCol.updateOne(
      { ssoUserId },
      {
        $set: {
          appRole: 'none',
          appStatus: 'revoked',
          hasAccess: false,
          isAdmin: false,
          updatedAt: now,
          lastSyncedAt: now,
        },
      }
    );

    console.log('Access revoked:', { ssoUserId });

    return res.status(200).json({
      success: true,
      message: 'Access revoked',
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
