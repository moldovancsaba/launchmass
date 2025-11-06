/**
 * pages/api/admin/users/index.js
 * 
 * WHAT: List all users who have attempted to access launchmass
 * WHY: Admin needs to see pending requests and manage existing users
 * HOW: Query local users collection with filtering
 */

import { withSsoAuth } from '../../../../lib/auth-oauth';
import clientPromise from '../../../../lib/db';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filter = 'all' } = req.query;

    // WHAT: Get users collection
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');
    const usersCol = db.collection('users');

    // WHAT: Build query based on filter
    // WHY: Admin can filter by status to focus on specific users
    let query = {};
    
    if (filter === 'pending') {
      query.appStatus = 'pending';
    } else if (filter === 'active') {
      // Include both 'active' and 'approved' status in active filter
      query.appStatus = { $in: ['active', 'approved'] };
    }
    // 'all' = no filter

    // WHAT: Get users sorted by creation date (newest first)
    // WHY: Most recent access requests shown first
    const users = await usersCol
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // WHAT: Return user list with relevant fields
    // WHY: Frontend needs status, role, timestamps for display
    return res.status(200).json({
      users: users.map(u => ({
        ssoUserId: u.ssoUserId,
        email: u.email,
        name: u.name,
        ssoRole: u.ssoRole,
        appRole: u.appRole || 'none',
        appStatus: u.appStatus || 'pending',
        hasAccess: u.hasAccess || false,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        updatedAt: u.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error listing users:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to list users',
    });
  }
}

// WHAT: Wrap with SSO authentication
// WHY: Only authenticated users can access this endpoint
// TODO: Add superadmin check
export default withSsoAuth(handler);
