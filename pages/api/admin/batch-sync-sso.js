/**
 * pages/api/admin/batch-sync-sso.js
 * 
 * WHAT: Batch sync all Launchmass users to SSO
 * WHY: Manual reconciliation when automatic sync fails or for initial migration
 * HOW: Uses batchSyncToSSO function from lib/ssoPermissions.js
 */

import { withSsoAuth, requireAdminRole } from '../../../lib/auth-oauth';
import clientPromise from '../../../lib/db';
import { batchSyncToSSO } from '../../../lib/ssoPermissions.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Batch Sync] Starting batch sync to SSO', {
      triggeredBy: req.user?.email,
    });

    // WHAT: Get database connection
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');

    // WHAT: Call batch sync function
    // WHY: Sync all users from Launchmass to SSO
    const result = await batchSyncToSSO(db);

    console.log('[Batch Sync] Completed', {
      synced: result.synced,
      errors: result.errors,
      triggeredBy: req.user?.email,
    });

    // WHAT: Return detailed results
    // WHY: Show admin which users were synced and which failed
    return res.status(200).json({
      success: true,
      message: `Batch sync completed: ${result.synced} synced, ${result.errors} errors`,
      synced: result.synced,
      errors: result.errors,
      details: result.details,
    });
  } catch (error) {
    console.error('[Batch Sync] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Batch sync failed',
    });
  }
}

// WHAT: Wrap with SSO authentication, then the shared admin-role guard
// WHY: Only authenticated admins can trigger batch sync
export default withSsoAuth(requireAdminRole(handler, 'Only admins can perform batch sync'));
