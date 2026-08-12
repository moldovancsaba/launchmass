/**
 * SSO Permissions Helper
 * 
 * WHAT: Client library for managing user permissions in SSO
 * WHY: Launchmass needs to sync permissions TO SSO (Phase 4D)
 * HOW: Use client_credentials OAuth flow to authenticate, then call SSO permission APIs
 * 
 * Phase 4D: Bidirectional permission sync - Launchmass pushes permission changes to SSO
 */

/** @typedef {import('./types.js').UserDoc} UserDoc */

// Functional: Debug logger gated behind OAUTH_DEBUG.
// Strategic: This module's calls are exclusively invoked from OAuth-adjacent flows
// (login callback, admin permission sync); reuse that existing flag rather than
// introducing a new one, matching the convention in pages/api/oauth/callback.js.
const dlog = (...args) => { if (process.env.OAUTH_DEBUG === 'true') console.log(...args); };

const SSO_BASE_URL = process.env.SSO_BASE_URL || 'https://sso.doneisbetter.com'
const SSO_CLIENT_ID = process.env.SSO_CLIENT_ID
const SSO_CLIENT_SECRET = process.env.SSO_CLIENT_SECRET

// Token cache (in-memory, cleared on restart)
let cachedToken = null
let tokenExpiresAt = null

/**
 * Get OAuth access token using client_credentials grant
 * 
 * WHAT: Authenticate with SSO to get access token for API calls
 * WHY: SSO permission APIs require OAuth authentication
 * HOW: POST /api/oauth/token with client_credentials grant
 * 
 * Token is cached and reused until expiration (minus 5 minute buffer)
 * 
 * @returns {Promise<string>} Access token
 * @throws {Error} If authentication fails
 */
async function getAccessToken() {
  // WHAT: Check if cached token is still valid
  // WHY: Avoid unnecessary token requests
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    dlog('[SSO] Using cached access token')
    return cachedToken
  }

  // WHAT: Validate required environment variables
  if (!SSO_CLIENT_ID || !SSO_CLIENT_SECRET) {
    throw new Error('SSO_CLIENT_ID and SSO_CLIENT_SECRET must be configured')
  }

  try {
    dlog('[SSO] Fetching new access token via client_credentials')

    const response = await fetch(`${SSO_BASE_URL}/api/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: SSO_CLIENT_ID,
        client_secret: SSO_CLIENT_SECRET,
        scope: 'manage_permissions',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`SSO token request failed: ${error.error_description || error.error}`)
    }

    const data = await response.json()

    // WHAT: Cache token with expiration buffer
    // WHY: Prevent using token right before it expires
    cachedToken = data.access_token
    tokenExpiresAt = Date.now() + ((data.expires_in - 300) * 1000) // 5 minute buffer

    dlog('[SSO] Access token obtained successfully', {
      expiresIn: data.expires_in,
      scope: data.scope,
    })

    return cachedToken
  } catch (error) {
    console.error('[SSO] Failed to get access token', {
      error: error.message,
      baseUrl: SSO_BASE_URL,
    })
    throw error
  }
}

/**
 * Get user permission for Launchmass from SSO
 * 
 * WHAT: Query SSO for user's permission status
 * WHY: Check if permission exists before syncing
 * HOW: GET /api/users/{userId}/apps/{clientId}/permissions with OAuth token
 * 
 * @param {string} userId - User's SSO ID (UUID)
 * @returns {Promise<{role: string, status: string, grantedBy?: string} | null>} Permission object or null if not found
 */
export async function getPermissionFromSSO(userId) {
  if (!userId) {
    throw new Error('userId is required')
  }

  try {
    const token = await getAccessToken()

    const response = await fetch(
      `${SSO_BASE_URL}/api/users/${userId}/apps/${SSO_CLIENT_ID}/permissions`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (response.status === 404) {
      // No permission record in SSO yet
      dlog('[SSO] No permission found', { userId })
      return null
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get permission: ${error.message || error.error}`)
    }

    const permission = await response.json()
    dlog('[SSO] Permission retrieved', {
      userId,
      status: permission.status,
      role: permission.role,
    })

    return permission
  } catch (error) {
    console.error('[SSO] Error getting permission', {
      error: error.message,
      userId,
    })
    throw error
  }
}

/**
 * Sync permission to SSO
 * 
 * WHAT: Create or update user permission in SSO
 * WHY: When Launchmass admin grants/updates permission, sync to SSO
 * HOW: PUT /api/users/{userId}/apps/{clientId}/permissions with OAuth token
 * 
 * @param {string} userId - User's SSO ID (UUID)
 * @param {Object} permission - Permission data
 * @param {string} permission.role - User role: 'user', 'admin', or 'superadmin'
 * @param {string} permission.status - Permission status: 'pending', 'approved', or 'revoked'
 * @param {string} [permission.grantedBy] - Who granted the permission (email or admin ID)
 * @returns {Promise<{role: string, status: string, grantedBy?: string}>} Updated permission from SSO
 */
export async function syncPermissionToSSO(userId, permission) {
  if (!userId) {
    throw new Error('userId is required')
  }

  const { role, status, grantedBy } = permission

  if (!role || !status) {
    throw new Error('role and status are required')
  }

  // WHAT: Validate role and status values
  const validRoles = ['user', 'admin', 'superadmin']
  const validStatuses = ['pending', 'approved', 'revoked']

  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`)
  }

  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`)
  }

  try {
    const token = await getAccessToken()

    dlog('[SSO] Syncing permission to SSO', {
      userId,
      role,
      status,
      grantedBy,
    })

    const response = await fetch(
      `${SSO_BASE_URL}/api/users/${userId}/apps/${SSO_CLIENT_ID}/permissions`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          status,
          grantedBy: grantedBy || 'launchmass-admin',
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to sync permission: ${error.message || error.error}`)
    }

    const result = await response.json()
    dlog('[SSO] Permission synced successfully', {
      userId,
      role: result.permission.role,
      status: result.permission.status,
    })

    return result.permission
  } catch (error) {
    console.error('[SSO] Error syncing permission', {
      error: error.message,
      userId,
      role,
      status,
    })
    throw error
  }
}

/**
 * Revoke permission in SSO
 * 
 * WHAT: Revoke user's permission (set status to 'revoked')
 * WHY: When Launchmass admin revokes access, sync to SSO
 * HOW: DELETE /api/users/{userId}/apps/{clientId}/permissions with OAuth token
 * 
 * @param {string} userId - User's SSO ID (UUID)
 * @returns {Promise<void>}
 */
export async function revokePermissionInSSO(userId) {
  if (!userId) {
    throw new Error('userId is required')
  }

  try {
    const token = await getAccessToken()

    dlog('[SSO] Revoking permission in SSO', { userId })

    const response = await fetch(
      `${SSO_BASE_URL}/api/users/${userId}/apps/${SSO_CLIENT_ID}/permissions`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (response.status === 404) {
      console.warn('[SSO] Permission not found, nothing to revoke', { userId })
      return
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to revoke permission: ${error.message || error.error}`)
    }

    dlog('[SSO] Permission revoked successfully', { userId })
  } catch (error) {
    console.error('[SSO] Error revoking permission', {
      error: error.message,
      userId,
    })
    throw error
  }
}

/**
 * Batch sync all Launchmass permissions to SSO
 *
 * WHAT: Sync all approved users from Launchmass to SSO
 * WHY: Initial sync or full reconciliation
 * HOW: Query Launchmass users collection, sync each to SSO
 *
 * This is useful for:
 * - Initial migration to bidirectional sync
 * - Periodic reconciliation to ensure consistency
 * - Fixing any sync issues
 *
 * FIELD-NAME CORRECTION (issue #12): this function previously queried/read
 * `status`/`role`, which do not exist on any `users` document — the real schema
 * (see `lib/users.js`'s `upsertUserFromSso`) stores these as `appStatus`/`appRole`.
 * As a result this function matched zero users on every invocation and silently
 * no-op'd, always reporting false-success ({synced:0, errors:0}) instead of doing
 * any real work. It has therefore never actually called the live SSO API in
 * production. OPERATOR CAUTION: now that the query/field names are corrected, the
 * very next real invocation of this function (e.g. via
 * `pages/api/admin/batch-sync-sso.js`) will match real active/pending users and
 * fire a live burst of `syncPermissionToSSO` calls against the actual SSO service
 * for every one of them — something that has never happened before. Whoever
 * deploys this should expect that burst, not be surprised by it.
 *
 * @param {import('mongodb').Db} db - MongoDB database connection
 * @returns {Promise<{synced: number, errors: number, details: Array<Object>}>} Sync results: { synced, errors }
 */
export async function batchSyncToSSO(db) {
  try {
    dlog('[SSO] Starting batch sync to SSO')

    // WHAT: Get all approved Launchmass users
    // WHY: Only sync users who have been granted access
    // NOTE: field names corrected to match the real schema (appStatus/appRole,
    // not status/role — see the function-level comment above for the history).
    // Scope unchanged: only 'active'/'pending' are queried here, same as
    // original intent — 'suspended' users are still excluded from this query.
    //
    // Boundary cast — see lib/types.js's "Boundary-cast convention" comment. This is
    // the exact call site issue #12 broke: casting to UserDoc means a typo'd field
    // name below (`user.status`/`user.role` instead of `user.appStatus`/
    // `user.appRole`) is now a compile-time "Property does not exist" error instead
    // of a silent, always-empty query result.
    const users = /** @type {UserDoc[]} */ (await db.collection('users')
      .find({
        appStatus: { $in: ['active', 'pending'] }, // Include both active and pending
      })
      .project({
        ssoUserId: 1,
        email: 1,
        appRole: 1,
        appStatus: 1,
      })
      .toArray())

    dlog(`[SSO] Found ${users.length} users to sync`)

    const results = {
      synced: 0,
      errors: 0,
      details: [],
    }

    // WHAT: Sync each user to SSO
    // WHY: Ensure SSO has latest permission data
    for (const user of users) {
      try {
        if (!user.ssoUserId) {
          console.warn('[SSO] User missing ssoUserId, skipping', { email: user.email })
          results.details.push({
            email: user.email,
            error: 'Missing ssoUserId',
          })
          results.errors++
          continue
        }

        // WHAT: Map Launchmass appStatus to SSO status
        // WHY: Different field names/value spaces between systems.
        // 'suspended' -> 'revoked' is included for completeness (appStatus's full
        // value space per lib/users.js includes 'suspended'), but is NOT currently
        // reachable through this function: the query above only matches
        // 'active'/'pending', so a 'suspended' user is never fetched in the first
        // place and this branch never actually executes today. It exists so this
        // mapping is already correct if the query scope is ever revisited — do not
        // assume suspended users are being actively synced by this code path.
        const ssoStatus =
          user.appStatus === 'active' ? 'approved' :
          user.appStatus === 'suspended' ? 'revoked' :
          'pending'

        await syncPermissionToSSO(user.ssoUserId, {
          role: user.appRole && user.appRole !== 'none' ? user.appRole : 'user',
          status: ssoStatus,
          grantedBy: 'batch-sync',
        })

        results.synced++
        results.details.push({
          email: user.email,
          ssoUserId: user.ssoUserId,
          role: user.appRole,
          status: ssoStatus,
        })
      } catch (error) {
        console.error('[SSO] Failed to sync user', {
          email: user.email,
          error: error.message,
        })
        results.errors++
        results.details.push({
          email: user.email,
          error: error.message,
        })
      }
    }

    dlog('[SSO] Batch sync completed', {
      synced: results.synced,
      errors: results.errors,
    })

    return results
  } catch (error) {
    console.error('[SSO] Batch sync failed', { error: error.message })
    throw error
  }
}
