// Functional: Permission matrix and role-based access control utilities
// Strategic: Centralizes all permission logic to avoid duplication across API routes;
// enables future permission granularity by defining the matrix in one place;
// caches role lookups per-request to minimize database roundtrips

import clientPromise from './db.js';

// Functional: Permission matrix defining what each role can do
// Strategic: Explicitly listing permissions makes the system auditable and extensible;
// admin role has all permissions; user role is restricted to card operations and viewing members
const PERMISSIONS = {
  admin: new Set([
    'org.read',
    'org.write',
    'org.delete',
    'cards.read',
    'cards.write',
    'cards.delete',
    'members.read',
    'members.write',
  ]),
  user: new Set([
    'cards.read',
    'cards.write',
    'cards.delete',
    'members.read',
  ]),
};

// Functional: Check if user is a super admin
// Strategic: Super admins bypass all organization-level checks; this is the top-level permission gate
// @param {Object} user - User object with ssoUserId, email, and isSuperAdmin fields
// @returns {boolean} true if user is super admin
export function isSuperAdmin(user) {
  // Functional: Boolean coercion handles undefined, null, or missing field
  // Strategic: Default to false for safety; only explicit true grants super admin rights
  return user?.isSuperAdmin === true;
}

// Functional: Retrieve user's role within a specific organization from organizationMembers collection
// Strategic: Single source of truth for org membership; returns null for non-members to enable
// clear distinction between "not a member" and "member with user role"
// @param {string} ssoUserId - SSO user ID from authenticated session
// @param {string} orgUuid - Organization UUID to check membership in
// @returns {Promise<'admin'|'user'|null>} Role if member, null otherwise
export async function getUserOrgRole(ssoUserId, orgUuid) {
  // Functional: Input validation prevents database queries with invalid parameters
  if (!ssoUserId || !orgUuid) return null;

  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');
    const col = db.collection('organizationMembers');

    // Functional: Find membership record by compound key (orgUuid + ssoUserId)
    // Strategic: Relies on unique compound index for fast lookups; returns role directly
    const membership = await col.findOne(
      { orgUuid: String(orgUuid), ssoUserId: String(ssoUserId) },
      { projection: { role: 1, _id: 0 } }
    );

    // Functional: Return role if found, null if not a member
    // Strategic: Null indicates non-membership clearly; distinguishes from user role
    return membership?.role || null;
  } catch (err) {
    // Functional: Log database errors but don't throw to avoid breaking auth flow
    // Strategic: Permission denied is safer than permission granted on error
    console.error('[permissions] Failed to get user org role:', err.message);
    return null;
  }
}

// Functional: Check if user has a specific permission within an organization
// Strategic: Combines super admin bypass with role-based permission matrix;
// enables consistent permission checks across all API routes
// @param {Object} user - Authenticated user object with ssoUserId and isSuperAdmin
// @param {string} orgUuid - Organization UUID to check permission in
// @param {string} permission - Permission string (e.g. 'cards.write', 'members.read')
// @param {Object} req - Optional request object for per-request caching
// @returns {Promise<boolean>} true if user has permission, false otherwise
export async function hasOrgPermission(user, orgUuid, permission, req = null) {
  // Functional: Super admins bypass all org-level checks
  // Strategic: Top-level escape hatch for administrative access to all orgs
  if (isSuperAdmin(user)) return true;

  // Functional: Validate inputs before database query
  if (!user?.ssoUserId || !orgUuid || !permission) return false;

  // Functional: Per-request cache to avoid redundant database queries for the same role
  // Strategic: API handlers often check multiple permissions for the same user+org;
  // caching reduces DB load and improves response time
  const cacheKey = `role:${user.ssoUserId}:${orgUuid}`;
  let role;

  if (req?._permissionCache) {
    role = req._permissionCache.get(cacheKey);
  } else if (req) {
    // Functional: Initialize cache on first use
    // Strategic: Map is lighter than object for key-value storage with dynamic keys
    req._permissionCache = new Map();
  }

  // Functional: Fetch role from database if not cached
  if (role === undefined) {
    role = await getUserOrgRole(user.ssoUserId, orgUuid);
    if (req?._permissionCache) {
      req._permissionCache.set(cacheKey, role);
    }
  }

  // Functional: Non-members have no permissions
  if (!role) return false;

  // Functional: Check if role's permission set includes the requested permission
  // Strategic: Permission matrix lookup is O(1) via Set; makes permission checks fast
  const perms = PERMISSIONS[role];
  return perms ? perms.has(permission) : false;
}

// Functional: Helper to count admins in an organization (for last-admin protection)
// Strategic: Prevents removing or demoting the last admin, which would lock the org;
// separate function for reuse in member management endpoints
// @param {string} orgUuid - Organization UUID to count admins in
// @returns {Promise<number>} Count of admin role members in the organization
export async function countOrgAdmins(orgUuid) {
  if (!orgUuid) return 0;

  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');
    const col = db.collection('organizationMembers');

    // Functional: Count documents where orgUuid matches and role is admin
    // Strategic: Fast count operation; uses index on { orgUuid: 1, role: 1 }
    return await col.countDocuments({ orgUuid: String(orgUuid), role: 'admin' });
  } catch (err) {
    console.error('[permissions] Failed to count org admins:', err.message);
    // Functional: Return 0 on error to block dangerous operations (last-admin protection)
    // Strategic: Fail-safe behavior prevents accidental admin removal
    return 0;
  }
}

// Functional: Check if operation would remove the last admin from an organization
// Strategic: Business rule enforcement at the permission layer; prevents orphaned orgs
// @param {string} orgUuid - Organization UUID to check
// @param {string} ssoUserId - User ID being removed or demoted
// @param {string} currentRole - Current role of the user (to detect admin demotion)
// @returns {Promise<boolean>} true if this would be last admin, false otherwise
export async function isLastAdmin(orgUuid, ssoUserId, currentRole) {
  // Functional: Only admins can be "last admin"; users are never blocked by this check
  if (currentRole !== 'admin') return false;

  // Functional: Count total admins; if 1 or fewer, this admin is the last one
  // Strategic: Blocks both removal and demotion of the last admin
  const adminCount = await countOrgAdmins(orgUuid);
  return adminCount <= 1;
}
