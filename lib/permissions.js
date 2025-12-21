// Functional: Permission matrix and role-based access control utilities
// Strategic: Centralizes all permission logic to avoid duplication across API routes;
// enables future permission granularity by defining the matrix in one place;
// caches role lookups per-request to minimize database roundtrips
//
// v1.18.0 - TRACK-D-01: Added performance monitoring and metrics

import clientPromise from './db.js';

// Functional: System role permission matrix (backward compatibility)
// Strategic: Hardcoded system roles (admin/user) for fast lookup without DB query;
// custom roles loaded from organizationRoles collection on demand
// Note: These match the expanded permissions in PERMISSIONS_DESIGN.md
const SYSTEM_ROLES = {
  admin: {
    permissions: new Set([
      'org.read', 'org.write', 'org.delete',
      'cards.read', 'cards.create', 'cards.update', 'cards.delete', 'cards.reorder',
      'members.read', 'members.invite', 'members.remove', 'members.edit_roles',
      'roles.read', 'roles.write',
      'tags.read', 'tags.write',
      // Legacy permissions for backward compatibility
      'cards.write', 'members.write'
    ])
  },
  user: {
    permissions: new Set([
      'cards.read', 'cards.create', 'cards.update', 'cards.delete',
      'members.read',
      'tags.read',
      // Legacy permissions for backward compatibility  
      'cards.write'
    ])
  }
};

// Functional: In-memory cache for custom roles to avoid DB roundtrips
// Strategic: 5-minute TTL cache reduces database load for permission checks
// Key format: orgUuid:roleId -> { permissions: Set, expiresAt: timestamp }
const roleCache = new Map();
const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ===========================
// Performance Monitoring (v1.18.0 - TRACK-D-01)
// ===========================

// Functional: Track permission check performance metrics
// Strategic: Identify slow permission checks and cache effectiveness
const performanceMetrics = {
  totalChecks: 0,           // Total permission checks since startup
  cacheHits: 0,             // Permission checks served from per-request cache
  cacheMisses: 0,           // Permission checks requiring DB query
  slowChecks: 0,            // Permission checks >10ms
  totalDuration: 0,         // Cumulative duration of all checks (ms)
  slowestCheck: 0,          // Slowest check duration (ms)
  lastReset: new Date().toISOString(),
};

// Functional: Log a slow permission check for debugging
// Strategic: Helps identify performance bottlenecks and cache misses
function logSlowPermissionCheck(duration, user, orgUuid, permission, wasCached) {
  const SLOW_THRESHOLD_MS = 10;
  
  if (duration > SLOW_THRESHOLD_MS) {
    performanceMetrics.slowChecks++;
    performanceMetrics.slowestCheck = Math.max(performanceMetrics.slowestCheck, duration);
    
    console.warn(
      `[permissions] Slow permission check (${duration.toFixed(2)}ms): ` +
      `user=${user?.ssoUserId?.slice(0, 8)}... org=${orgUuid?.slice(0, 8)}... ` +
      `perm=${permission} cached=${wasCached}`
    );
  }
}

// Functional: Get current performance metrics snapshot
// Strategic: Exposed for monitoring/debugging endpoints
export function getPermissionMetrics() {
  const avgDuration = performanceMetrics.totalChecks > 0
    ? (performanceMetrics.totalDuration / performanceMetrics.totalChecks).toFixed(2)
    : 0;
  
  const cacheHitRate = performanceMetrics.totalChecks > 0
    ? ((performanceMetrics.cacheHits / performanceMetrics.totalChecks) * 100).toFixed(1)
    : 0;
  
  return {
    ...performanceMetrics,
    avgDuration: parseFloat(avgDuration),
    cacheHitRate: parseFloat(cacheHitRate) + '%',
  };
}

// Functional: Reset performance metrics (for testing or periodic resets)
// Strategic: Prevents metrics from growing unbounded; can be called hourly
export function resetPermissionMetrics() {
  performanceMetrics.totalChecks = 0;
  performanceMetrics.cacheHits = 0;
  performanceMetrics.cacheMisses = 0;
  performanceMetrics.slowChecks = 0;
  performanceMetrics.totalDuration = 0;
  performanceMetrics.slowestCheck = 0;
  performanceMetrics.lastReset = new Date().toISOString();
}

// Functional: Load role definition from organizationRoles collection or system roles
// Strategic: Unified interface for both system roles (admin/user) and custom roles;
// enables extensibility while maintaining backward compatibility
// @param {string} orgUuid - Organization UUID
// @param {string} roleId - Role identifier (e.g. 'admin', 'user', 'editor')
// @returns {Promise<{permissions: Set}|null>} Role object with permissions Set, or null
export async function getOrgRole(orgUuid, roleId) {
  // Functional: System roles are hardcoded for performance (no DB query)
  // Strategic: admin and user are special - always available, never changes
  if (SYSTEM_ROLES[roleId]) {
    return SYSTEM_ROLES[roleId];
  }
  
  // Functional: Check cache first to avoid DB query
  // Strategic: Custom roles are cached with TTL; reduces load on MongoDB
  const cacheKey = `${orgUuid}:${roleId}`;
  const cached = roleCache.get(cacheKey);
  
  if (cached && cached.expiresAt > Date.now()) {
    return { permissions: cached.permissions };
  }
  
  // Functional: Load custom role from database
  // Strategic: Only reaches here for custom roles not in cache
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');
    const col = db.collection('organizationRoles');
    
    const role = await col.findOne(
      { orgUuid: String(orgUuid), roleId: String(roleId) },
      { projection: { permissions: 1, _id: 0 } }
    );
    
    if (!role) {
      // Functional: Role doesn't exist - cache negative result briefly
      // Strategic: Prevents repeated DB queries for non-existent roles
      return null;
    }
    
    // Functional: Convert array to Set for O(1) permission lookups
    // Strategic: Sets are faster than arrays for membership checks
    const permissionSet = new Set(role.permissions || []);
    
    // Functional: Cache the role with TTL
    // Strategic: Subsequent checks for same role+org are instant (no DB)
    roleCache.set(cacheKey, {
      permissions: permissionSet,
      expiresAt: Date.now() + ROLE_CACHE_TTL
    });
    
    return { permissions: permissionSet };
  } catch (err) {
    // Functional: Log error but return null to deny permission
    // Strategic: Fail-safe behavior - errors result in permission denied
    console.error('[permissions] Failed to load custom role:', err.message);
    return null;
  }
}

// Functional: Clear expired entries from role cache (memory management)
// Strategic: Prevents unbounded memory growth; called periodically
export function clearExpiredRoleCache() {
  const now = Date.now();
  for (const [key, value] of roleCache.entries()) {
    if (value.expiresAt <= now) {
      roleCache.delete(key);
    }
  }
}

// Run cache cleanup every 10 minutes
setInterval(clearExpiredRoleCache, 10 * 60 * 1000);

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
// v1.18.0 - TRACK-D-01: Added performance monitoring and cache metrics
// @param {Object} user - Authenticated user object with ssoUserId and isSuperAdmin
// @param {string} orgUuid - Organization UUID to check permission in
// @param {string} permission - Permission string (e.g. 'cards.write', 'members.read')
// @param {Object} req - Optional request object for per-request caching
// @returns {Promise<boolean>} true if user has permission, false otherwise
export async function hasOrgPermission(user, orgUuid, permission, req = null) {
  // Functional: Start timing for performance monitoring
  // Strategic: Measure end-to-end permission check duration (TRACK-D-01)
  const startTime = performance.now();
  performanceMetrics.totalChecks++;
  
  // Functional: Super admins bypass all org-level checks
  // Strategic: Top-level escape hatch for administrative access to all orgs
  if (isSuperAdmin(user)) {
    const duration = performance.now() - startTime;
    performanceMetrics.totalDuration += duration;
    logSlowPermissionCheck(duration, user, orgUuid, permission, false);
    return true;
  }

  // Functional: Validate inputs before database query
  if (!user?.ssoUserId || !orgUuid || !permission) {
    const duration = performance.now() - startTime;
    performanceMetrics.totalDuration += duration;
    return false;
  }

  // Functional: Per-request cache to avoid redundant database queries for the same role
  // Strategic: API handlers often check multiple permissions for the same user+org;
  // caching reduces DB load and improves response time
  const cacheKey = `role:${user.ssoUserId}:${orgUuid}`;
  let role;
  let wasCached = false;

  if (req?._permissionCache) {
    role = req._permissionCache.get(cacheKey);
    if (role !== undefined) {
      wasCached = true;
      performanceMetrics.cacheHits++;
    }
  } else if (req) {
    // Functional: Initialize cache on first use
    // Strategic: Map is lighter than object for key-value storage with dynamic keys
    req._permissionCache = new Map();
  }

  // Functional: Fetch role from database if not cached
  if (role === undefined) {
    performanceMetrics.cacheMisses++;
    role = await getUserOrgRole(user.ssoUserId, orgUuid);
    if (req?._permissionCache) {
      req._permissionCache.set(cacheKey, role);
    }
  }

  // Functional: Non-members have no permissions
  if (!role) {
    const duration = performance.now() - startTime;
    performanceMetrics.totalDuration += duration;
    logSlowPermissionCheck(duration, user, orgUuid, permission, wasCached);
    return false;
  }

  // Functional: Load role definition (system or custom)
  // Strategic: Unified permission check for both system and custom roles
  const roleData = await getOrgRole(orgUuid, role);
  
  if (!roleData) {
    // Functional: Role doesn't exist - deny permission
    // Strategic: Safe default when role is invalid or deleted
    console.warn(`[permissions] Role '${role}' not found for org ${orgUuid}`);
    const duration = performance.now() - startTime;
    performanceMetrics.totalDuration += duration;
    logSlowPermissionCheck(duration, user, orgUuid, permission, wasCached);
    return false;
  }

  // Functional: Check if role's permission set includes the requested permission
  // Strategic: Permission matrix lookup is O(1) via Set; makes permission checks fast
  const hasPermission = roleData.permissions.has(permission);
  
  // Functional: Record timing and log if slow
  // Strategic: Captures total duration including DB queries and cache lookups
  const duration = performance.now() - startTime;
  performanceMetrics.totalDuration += duration;
  logSlowPermissionCheck(duration, user, orgUuid, permission, wasCached);
  
  return hasPermission;
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
