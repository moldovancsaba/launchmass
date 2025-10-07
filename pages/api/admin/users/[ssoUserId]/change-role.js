/**
 * pages/api/admin/users/[ssoUserId]/change-role.js
 * 
 * WHAT: Change a user's role (upgrade/downgrade permissions)
 * WHY: Admins need to adjust user permissions over time
 * HOW: Calls SSO API to update role, syncs local cache
 */

import { withSsoAuth } from '../../../../../lib/auth-oauth';
import clientPromise from '../../../../../lib/db';

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

    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be: user, admin, or superadmin',
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

    // WHAT: Call SSO API to update role
    // WHY: SSO is source of truth
    const ssoResponse = await fetch(
      `${ssoServerUrl}/api/admin/users/${ssoUserId}/apps/${clientId}/permissions`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': req.headers.cookie || '',
        },
        body: JSON.stringify({
          hasAccess: true,
          status: 'active',
          role: role,
        }),
      }
    );

    if (!ssoResponse.ok) {
      const errorData = await ssoResponse.json().catch(() => ({}));
      console.error('SSO role change failed:', ssoResponse.status, errorData);
      return res.status(ssoResponse.status).json({
        error: 'Failed to change role',
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
          appRole: role,
          isAdmin: (role === 'admin' || role === 'superadmin'),
          updatedAt: now,
          lastSyncedAt: now,
        },
      }
    );

    console.log('Role changed:', { ssoUserId, role });

    return res.status(200).json({
      success: true,
      message: 'Role changed',
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
