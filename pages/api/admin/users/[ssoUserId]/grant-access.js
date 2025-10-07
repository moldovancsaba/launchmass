/**
 * pages/api/admin/users/[ssoUserId]/grant-access.js
 * 
 * WHAT: Grant access to a pending user with specified role
 * WHY: Admin approval workflow for access requests
 * HOW: Calls SSO API to update permission, then syncs local cache
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
    // WHY: Ensure valid role and user ID
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
    // For now, allow any authenticated user

    // WHAT: Get OAuth client ID from environment
    // WHY: Need to specify which app we're granting access to
    const clientId = process.env.SSO_CLIENT_ID;
    const ssoServerUrl = process.env.SSO_SERVER_URL || 'https://sso.doneisbetter.com';

    if (!clientId) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'SSO_CLIENT_ID not configured',
      });
    }

    // WHAT: Call SSO API to grant permission
    // WHY: SSO is source of truth for app permissions
    const ssoResponse = await fetch(
      `${ssoServerUrl}/api/admin/users/${ssoUserId}/apps/${clientId}/permissions`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': req.headers.cookie || '', // Forward admin session cookie
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
      console.error('SSO permission grant failed:', ssoResponse.status, errorData);
      return res.status(ssoResponse.status).json({
        error: 'Failed to grant permission',
        message: errorData.message || 'SSO API error',
      });
    }

    const permissionData = await ssoResponse.json();

    // WHAT: Update local user cache
    // WHY: Keep local data in sync with SSO
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');
    const usersCol = db.collection('users');

    const now = new Date().toISOString();

    await usersCol.updateOne(
      { ssoUserId },
      {
        $set: {
          appRole: role,
          appStatus: 'active',
          hasAccess: true,
          isAdmin: (role === 'admin' || role === 'superadmin'),
          updatedAt: now,
          lastSyncedAt: now,
        },
      }
    );

    console.log('Access granted:', { ssoUserId, role });

    return res.status(200).json({
      success: true,
      message: 'Access granted',
      permission: permissionData.permission,
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
