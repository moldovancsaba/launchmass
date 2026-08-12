// Functional: User persistence and audit logging for SSO-authenticated users
// Strategic: Centralizes user sync from SSO, enables future permission granularity, and provides audit compliance

import clientPromise from './db.js';

/** @typedef {import('./types.js').UserDoc} UserDoc */

// Functional: Module-level flag to avoid repeated index creation calls
// Strategic: Ensures indexes are created exactly once per server lifetime for performance
let usersIndexesEnsured = false;
let authLogsIndexesEnsured = false;

/**
 * Functional: Get the users collection with automatic index creation
 * Strategic: Provides a single access point for user data with guaranteed indexes
 *
 * @returns {Promise<import('mongodb').Collection<UserDoc>>} MongoDB users collection
 */
export async function getUsersCollection() {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  const col = db.collection('users');
  
  // Functional: Ensure indexes exist on first collection access
  // Strategic: Prevents duplicate index creation; critical for production performance
  if (!usersIndexesEnsured) {
    await Promise.all([
      // Unique index on ssoUserId prevents duplicate user entries
      col.createIndex({ ssoUserId: 1 }, { unique: true }),
      // Secondary index on email for admin lookups
      col.createIndex({ email: 1 })
    ]);
    usersIndexesEnsured = true;
  }
  
  // Boundary cast — see lib/types.js's "Boundary-cast convention" comment. `col` is
  // the driver's untyped Collection<Document>; this is the single point where it
  // becomes the application-typed Collection<UserDoc> that every caller of
  // getUsersCollection() then gets automatically-typed findOne()/find() results from.
  // Cast through `unknown` first — tsc rejects a direct Collection<Document> ->
  // Collection<UserDoc> assertion (their method signatures, e.g. bulkWrite, aren't
  // structurally close enough for a single-step cast), which is exactly the "insufficient
  // overlap" case the boundary-cast convention below documents.
  return /** @type {import('mongodb').Collection<UserDoc>} */ (/** @type {unknown} */ (col));
}

/**
 * Functional: Upsert user from SSO validation response
 * Strategic: Creates or updates local user record; syncs app permissions from SSO;
 * caches permission data locally for performance
 * 
 * WHAT: Changed from auto-admin to permission-based access control
 * WHY: Users now require explicit admin approval via SSO permission system
 * HOW: App permissions (appRole, appStatus, hasAccess) synced from SSO on each login
 * 
 * Timestamp format: ISO 8601 with milliseconds in UTC per project policy
 *
 * @param {Object} ssoUser - User object from SSO
 * @param {string} ssoUser.id - SSO subject; persisted as UserDoc.ssoUserId
 * @param {string} ssoUser.email
 * @param {string} ssoUser.name
 * @param {string} [ssoUser.role] - Raw SSO role claim; persisted as UserDoc.ssoRole
 * @param {'none'|'user'|'admin'|'superadmin'} [ssoUser.appRole]
 * @param {'pending'|'active'|'suspended'|'error'} [ssoUser.appStatus]
 * @param {boolean} [ssoUser.hasAccess]
 * @returns {Promise<UserDoc>} Persisted user document
 */
export async function upsertUserFromSso(ssoUser) {
  // Functional: ISO 8601 timestamp with milliseconds in UTC (project standard)
  const now = new Date().toISOString();
  const col = await getUsersCollection();
  
  // Functional: Upsert operation with controlled field updates
  // Strategic: $setOnInsert for fields set only on creation (ssoUserId, createdAt)
  // $set for fields that sync from SSO on every login (all other fields)
  const update = {
    $setOnInsert: {
      ssoUserId: ssoUser.id,
      createdAt: now,
    },
    $set: {
      email: ssoUser.email,
      name: ssoUser.name,
      ssoRole: ssoUser.role,
      // WHAT: App-specific permissions synced from SSO
      // WHY: Local cache of permission state from SSO for performance
      appRole: ssoUser.appRole || 'none',
      appStatus: ssoUser.appStatus || 'pending',
      hasAccess: ssoUser.hasAccess || false,
      // WHAT: Legacy field for backward compatibility
      // WHY: Existing code may check isAdmin; map from appRole
      isAdmin: (ssoUser.appRole === 'admin'),
      lastLoginAt: now,
      updatedAt: now,
      lastSyncedAt: now,
    },
  };
  
  // Functional: updateOne with upsert creates if missing, updates if exists
  await col.updateOne({ ssoUserId: ssoUser.id }, update, { upsert: true });

  // Functional: Return the persisted document for req.user context
  // Strategic: Boundary cast — the driver's findOne() return type is loosely typed;
  // this is the one place per read-path function that asserts the real shape (see
  // lib/types.js's "Boundary-cast convention" comment). The record was just upserted
  // above, so a null result here would indicate a real driver/DB inconsistency, not
  // an expected miss.
  return /** @type {UserDoc} */ (await col.findOne({ ssoUserId: ssoUser.id }));
}

/**
 * Functional: Record authentication event in audit log
 * Strategic: Provides security audit trail and compliance documentation; enables future security monitoring
 * 
 * Why we log: Compliance requirements, security incident investigation, user behavior analysis
 * 
 * Status values:
 * - 'success': Valid SSO session, user authenticated
 * - 'invalid': Session validation failed (expired, missing, malformed)
 * - 'error': System error during validation (SSO unreachable, database error)
 * 
 * @param {Object} event - Authentication event data
 * @param {string | null} event.ssoUserId - SSO user ID (null if unavailable)
 * @param {string | null} event.email - User email (null if unavailable)
 * @param {string} event.status - Event status ('success'|'invalid'|'error')
 * @param {string} [event.message] - Optional error or context message
 * @param {string} [event.ip] - Client IP address
 * @param {string} [event.userAgent] - Client User-Agent header
 * @returns {Promise<void>}
 */
export async function recordAuthEvent({ ssoUserId, email, status, message, ip, userAgent }) {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  const col = db.collection('authLogs');
  
  // Functional: Ensure index on createdAt for efficient time-range queries
  // Strategic: Enables fast audit log queries for security analysis and compliance reporting
  if (!authLogsIndexesEnsured) {
    await col.createIndex({ createdAt: -1 });
    await col.createIndex({ ssoUserId: 1, createdAt: -1 });
    authLogsIndexesEnsured = true;
  }
  
  // Functional: Insert audit log entry with ISO 8601 timestamp
  // Strategic: Non-blocking insert; failures logged but don't block auth flow
  await col.insertOne({
    ssoUserId: ssoUserId || null,
    email: email || null,
    status,
    message: message || null,
    ip: ip || null,
    userAgent: userAgent || null,
    // Functional: ISO 8601 with milliseconds in UTC per project standard
    createdAt: new Date().toISOString(),
  }).catch(err => {
    // Strategic: Log audit errors but don't fail the auth request
    console.error('[auth] Failed to record auth event:', err.message);
  });
}
