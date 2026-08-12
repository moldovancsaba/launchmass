// Functional: Shared JSDoc @typedef definitions for the data shapes reused across
// lib/**, checked by `npm run typecheck` (tsc --checkJs via jsconfig.json).
// Strategic: A single source of truth for these shapes means every module that
// annotates against them (lib/users.js, lib/permissions.js, lib/ssoPermissions.js,
// lib/session.js, lib/org.js, lib/db.js) is checked for consistency with the others —
// this is the exact mechanism that would have caught issue #12's `user.status`/
// `user.role` field-name bug at commit time (see the Manual Verification section of
// issue #16 / RELEASE_NOTES.md for the reproduction that confirms this).
//
// Field shapes below were read directly off the current implementation, not the
// issue's original sketch, per this repo's "read first, never guess" rule:
//   - UserDoc:    lib/users.js `upsertUserFromSso` ($set/$setOnInsert fields) and
//                 lib/auth-oauth.js's DB-authoritative read in `validateSsoSession`.
//                 appRole/appStatus are the issue-#12-corrected field names (never
//                 `role`/`status` — those don't exist on this collection).
//   - OrgDoc:     pages/api/organizations/index.js's insertOne shape + lib/org.js's
//                 reads (uuid/slug/isActive are load-bearing for org-context lookup).
//   - CardDoc:    pages/api/cards/index.js's insertOne shape; lib/shared.js's
//                 `toClient` operates on this shape (plus a stringified `_id`).
//   - SessionPayload: the object passed to `signSession()` in
//                 pages/api/oauth/callback.js (verified there, not assumed).
//
// Boundary-cast convention (see issue #16 Edge Cases): the MongoDB driver's own
// return types (`Collection.findOne`, `.find().toArray()`, etc.) are untyped/`any`-ish
// by default, so type information would otherwise be lost at every DB read. Every
// read-path function in the six annotated modules casts the driver result once, at
// the point it crosses from the driver into application code, using a JSDoc type
// assertion:
//
//   const doc = /** @type {UserDoc | null} */ (await col.findOne({ ssoUserId }));
//
// This is the one pattern, reused consistently — do not invent a second casting style
// in new lib/ code; follow this one. When tsc rejects the single-step assertion with
// "may be a mistake because neither type sufficiently overlaps" (this happens for a
// whole-Collection cast, e.g. Collection<Document> -> Collection<UserDoc>, because the
// driver's method signatures like bulkWrite() aren't structurally close enough), cast
// through `unknown` first, exactly as tsc's own error message suggests:
//
//   return /** @type {Collection<UserDoc>} */ (/** @type {unknown} */ (col));
//
// Still the same convention, same single cast point — just the two-step form the
// compiler requires for that specific shape of assertion.

/**
 * @typedef {Object} UserDoc
 * @property {import('mongodb').ObjectId} [_id] - Mongo document id; absent on a document not yet read back from the driver
 * @property {string} ssoUserId - SSO subject/user ID; unique index on the users collection
 * @property {string} email
 * @property {string} name
 * @property {string} [ssoRole] - Raw role claim as reported by SSO (distinct from appRole)
 * @property {'none'|'user'|'admin'|'superadmin'} appRole - App-specific role synced from SSO
 *   on login. 'superadmin' is set directly by scripts/migrate-default-org.cjs (a real,
 *   reachable value on at least one seeded account), not just the everyday
 *   'none'|'user'|'admin' range that pages/api/oauth/callback.js's SSO-role mapping
 *   normally produces — confirmed by grepping actual assignments rather than trusting
 *   the issue's original 3-value sketch.
 * @property {'pending'|'active'|'suspended'|'error'} appStatus - App-specific access status synced
 *   from SSO. 'error' is set by pages/api/oauth/callback.js when a DB lookup fails during login
 *   (fail-closed path) — it is a real, reachable value, not a hypothetical one; confirmed by
 *   reading that file's error-handling branches rather than assuming the issue's original
 *   3-value sketch was exhaustive.
 * @property {boolean} hasAccess
 * @property {boolean} isAdmin - Legacy convenience field derived from appRole === 'admin'
 * @property {boolean} [isSuperAdmin] - Top-level gate checked by lib/permissions.js's isSuperAdmin()
 * @property {string} createdAt - ISO 8601 with milliseconds, UTC
 * @property {string} updatedAt - ISO 8601 with milliseconds, UTC
 * @property {string} [lastLoginAt] - ISO 8601 with milliseconds, UTC
 * @property {string} [lastSyncedAt] - ISO 8601 with milliseconds, UTC
 */

/**
 * @typedef {Object} OrgDoc
 * @property {import('mongodb').ObjectId} [_id] - Mongo document id; absent on a document not yet read back from the driver
 * @property {string} uuid - Stable public organization identifier (distinct from Mongo _id)
 * @property {string} name
 * @property {string} slug - Lowercased, unique; used for slug-based org-context lookup
 * @property {string} [description]
 * @property {boolean} isActive
 * @property {string} createdAt - ISO 8601 with milliseconds, UTC
 * @property {string} updatedAt - ISO 8601 with milliseconds, UTC
 * @property {boolean} [useSlugAsPublicUrl]
 * @property {string} [background] - CSS background value; see lib/shared.js normalizeBg()
 */

/**
 * @typedef {Object} CardDoc
 * @property {import('mongodb').ObjectId} [_id] - Mongo document id; absent on a document not yet read back from the driver
 * @property {string} href
 * @property {string} title
 * @property {string} [description]
 * @property {string} background - CSS background value; see lib/shared.js normalizeBg()
 * @property {number} order - Sort order within the owning organization
 * @property {string|Date} createdAt
 * @property {string|Date} updatedAt
 * @property {string[]} tags - Normalized via lib/shared.js normalizeTags()
 * @property {string} orgUuid - Owning organization's OrgDoc.uuid
 * @property {string} [orgSlug] - Denormalized copy of the owning org's slug
 */

/**
 * @typedef {Object} SessionUser
 * @property {string} id - SSO subject (maps to UserDoc.ssoUserId)
 * @property {string} email
 * @property {string} name
 * @property {string} [role] - Raw SSO role claim
 * @property {'none'|'user'|'admin'|'superadmin'} appRole
 * @property {'pending'|'active'|'suspended'|'error'} appStatus
 * @property {boolean} hasAccess
 */

/**
 * @typedef {Object} SessionPayload
 * @property {string} access_token
 * @property {string} id_token
 * @property {string} refresh_token
 * @property {SessionUser} user
 * @property {number} expires_at - Epoch milliseconds
 */

export {}; // typedef-only module; no runtime exports
