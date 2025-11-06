import clientPromise from './db.js';

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
  const org = await db.collection('organizations').findOne({ slug: slugLower });
  cacheBySlug.set(slugLower, { org, expiresAt: now + ORG_CACHE_TTL_MS });
  return org;
}

export async function getOrgByUuid(uuid) {
  if (!uuid) return null;
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  await ensureOrgIndexes(db);
  return db.collection('organizations').findOne({ uuid: String(uuid) });
}

export function invalidateOrgCacheBySlug(slug) {
  const s = normalizeSlug(slug);
  cacheBySlug.delete(s);
  debugLog(`invalidate slug=${s}`);
}

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

    console.log('[org-context] uuid:', uuid, 'slug:', slug);

    if (slug && !uuid) {
      const org = await getOrgBySlugCached(slug);
      console.log('[org-context] Found org by slug:', org ? org.name : 'null');
      if (org && org.isActive !== false) return { orgUuid: org.uuid, orgSlug: org.slug, org };
      return null;
    }
    if (uuid) {
      // Fetch to confirm active and to discover slug for denormalization on writes
      const org = await getOrgByUuid(uuid);
      console.log('[org-context] Found org by uuid:', org ? org.name : 'null');
      if (org && org.isActive !== false) return { orgUuid: org.uuid, orgSlug: org.slug, org };
      return null;
    }
    console.log('[org-context] No uuid or slug provided');
    return null;
  } catch (error) {
    console.error('[org-context] Error:', error);
    return null;
  }
}

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
