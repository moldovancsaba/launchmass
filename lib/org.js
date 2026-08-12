import clientPromise from './db.js';

/** @typedef {import('./types.js').OrgDoc} OrgDoc */

// Organization context and caching helpers (ESM)
// Functional: Resolve organization context from headers or query, with a small TTL cache by slug.
// Strategic: Mirrors narimato's header-based detection (X-Organization-UUID / X-Organization-Slug) and
// keeps launchmass lightweight by reusing the existing Mongo client and a simple in-memory cache.

const ORG_CACHE_TTL_MS = Number.parseInt(process.env.ORG_CACHE_TTL_MS || '60000', 10);
const DEBUG = process.env.ORG_CACHE_DEBUG === 'true';

// slugLower -> { org, expiresAt }
const cacheBySlug = new Map();
let indexesEnsured = false;

function nowISO() { return new Date().toISOString(); }
function debugLog(msg) { if (DEBUG) console.log(`[org-cache] ${nowISO()} ${msg}`); }

async function ensureOrgIndexes(db) {
  if (indexesEnsured) return;
  const col = db.collection('organizations');
  await Promise.all([
    col.createIndex({ slug: 1 }, { unique: true }),
    col.createIndex({ uuid: 1 }, { unique: true }),
    col.createIndex({ isActive: 1 })
  ]);
  indexesEnsured = true;
}

function normalizeSlug(input) {
  return String(input || '').trim().toLowerCase();
}

/**
 * Functional: Resolve an organization by slug, using a small in-memory TTL cache.
 * Strategic: Slug-based lookups happen on nearly every public-page request; the cache
 * avoids a DB round trip for the common case of a stable, already-seen slug.
 *
 * @param {string} slug - Organization slug (case-insensitive; normalized internally)
 * @returns {Promise<OrgDoc | null>} The organization document, or null if not found
 */
export async function getOrgBySlugCached(slug) {
  if (!slug) return null;
  const slugLower = normalizeSlug(slug);
  const now = Date.now();
  const hit = cacheBySlug.get(slugLower);
  if (hit && hit.expiresAt > now) {
    debugLog(`hit slug=${slugLower}`);
    return hit.org;
  }
  debugLog(`miss slug=${slugLower} — fetching from DB`);
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  await ensureOrgIndexes(db);
  // Boundary cast — see lib/types.js's "Boundary-cast convention" comment. Cast the
  // collection accessor itself (not the findOne() result) — org.js doesn't have a
  // dedicated getOrgsCollection() helper like lib/users.js's getUsersCollection(), so
  // this is the equivalent single cast point per call site.
  const orgsCol = /** @type {import('mongodb').Collection<OrgDoc>} */ (db.collection('organizations'));
  const org = await orgsCol.findOne({ slug: slugLower });
  // Only cache positive results. Caching a null miss for the full TTL would hide a
  // newly-created org for up to ORG_CACHE_TTL_MS; misses are cheap and rare.
  if (org) cacheBySlug.set(slugLower, { org, expiresAt: now + ORG_CACHE_TTL_MS });
  return org;
}

/**
 * Functional: Resolve an organization by its stable public UUID (uncached).
 * Strategic: Used on the header-based (X-Organization-UUID) code path, which is
 * preferred over slug lookup for API routes since it's unambiguous and stable across
 * a slug rename.
 *
 * @param {string} uuid - Organization UUID
 * @returns {Promise<OrgDoc | null>} The organization document, or null if not found
 */
export async function getOrgByUuid(uuid) {
  if (!uuid) return null;
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  await ensureOrgIndexes(db);
  // Boundary cast — see lib/types.js's "Boundary-cast convention" comment.
  const orgsCol = /** @type {import('mongodb').Collection<OrgDoc>} */ (db.collection('organizations'));
  return orgsCol.findOne({ uuid: String(uuid) });
}

/**
 * Functional: Evict a slug's cached organization entry.
 * Strategic: Called after a write (rename, deactivate) so the cache doesn't serve a
 * stale organization for up to ORG_CACHE_TTL_MS.
 *
 * @param {string} slug - Organization slug to invalidate
 * @returns {void}
 */
export function invalidateOrgCacheBySlug(slug) {
  const s = normalizeSlug(slug);
  cacheBySlug.delete(s);
  debugLog(`invalidate slug=${s}`);
}

/**
 * Functional: Resolve organization context (uuid/slug/org) from request headers or
 * query params, preferring the UUID header/param over the slug when both are present.
 * Strategic: Single entry point every org-scoped API route uses to determine which
 * organization a request targets, before any permission check runs.
 *
 * @param {import('http').IncomingMessage & { headers: Record<string, string | string[] | undefined>, query?: Record<string, string | string[] | undefined> }} req
 * @returns {Promise<{orgUuid: string, orgSlug: string, org: OrgDoc} | null>} Resolved context, or null if unresolvable/inactive
 */
export async function getOrgContext(req) {
  try {
    const h = (name) => String(req?.headers?.[name] || '').trim();
    const orgUuidHeader = h('x-organization-uuid');
    const orgSlugHeader = h('x-organization-slug');

    const q = req?.query || {};
    const orgUuidQuery = typeof q.orgUuid === 'string' ? q.orgUuid : '';
    const orgSlugQuery = typeof q.orgSlug === 'string' ? q.orgSlug : '';

    const uuid = (orgUuidHeader || orgUuidQuery || '').trim();
    const slug = (orgSlugHeader || orgSlugQuery || '').trim();

    // Gated behind ORG_CACHE_DEBUG so per-request org context isn't logged in production.
    debugLog(`context uuid=${uuid} slug=${slug}`);

    if (slug && !uuid) {
      const org = await getOrgBySlugCached(slug);
      debugLog(`by slug -> ${org ? org.name : 'null'}`);
      if (org && org.isActive !== false) return { orgUuid: org.uuid, orgSlug: org.slug, org };
      return null;
    }
    if (uuid) {
      // Fetch to confirm active and to discover slug for denormalization on writes
      const org = await getOrgByUuid(uuid);
      debugLog(`by uuid -> ${org ? org.name : 'null'}`);
      if (org && org.isActive !== false) return { orgUuid: org.uuid, orgSlug: org.slug, org };
      return null;
    }
    debugLog('no uuid or slug provided');
    return null;
  } catch (error) {
    console.error('[org-context] Error:', error.message);
    return null;
  }
}

/**
 * Functional: Resolve org context or write a 400 JSON error response and return null.
 * Strategic: Lets route handlers do `const ctx = await ensureOrgContext(req, res); if
 * (!ctx) return;` as a one-line guard instead of duplicating the error response.
 *
 * @param {import('http').IncomingMessage & { headers: Record<string, string | string[] | undefined>, query?: Record<string, string | string[] | undefined> }} req
 * @param {import('http').ServerResponse & { status: (code: number) => any }} res
 * @returns {Promise<{orgUuid: string, orgSlug: string, org: OrgDoc} | null>}
 */
export async function ensureOrgContext(req, res) {
  const ctx = await getOrgContext(req);
  if (!ctx?.orgUuid) {
    res.status(400).json({
      error: 'Organization context required. Provide X-Organization-UUID header (preferred) or ?orgUuid= in query.'
    });
    return null;
  }
  return ctx;
}
