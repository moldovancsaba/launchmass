// Shared card/organization normalization helpers (ESM)
// Functional: Single canonical implementation of background/tag normalization and
// client-safe document shaping, used by both server-side API routes and client-side
// page components (admin/settings forms).
// Strategic: These four exports (DEFAULT_BG, normalizeBg, normalizeTags, toClient) were
// previously duplicated 2-6 times across pages/api/cards/index.js, pages/api/cards/[id].js,
// pages/api/organizations/index.js, pages/api/organizations/[uuid].js, pages/admin/index.js,
// and pages/settings.js -- a bug fix or edge-case change had to be applied in every copy
// independently. This module is the single source of truth going forward (issue #14).
//
// Constraint: zero dependency on Next.js request/response objects or any server-only API
// (no `fs`, no `process` beyond nothing here, no Node-only builtins) so this file is safe
// to import from both server-side API routes and client-bundled page components without
// leaking server-only code into the browser bundle.

// WHAT: Default background gradient used by both cards and organizations when no
// background is supplied.
// WHY: Consistent visual fallback across the whole app.
export const DEFAULT_BG = "linear-gradient(90deg, rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%)";

// WHAT: Normalize background input to extract a usable CSS `background` value.
// WHY: Users often paste a full multi-line `background: ...;` CSS declaration (e.g. copied
// from devtools) rather than just the value -- this extracts the value in either the
// linear-gradient or hex-color case, and falls back to DEFAULT_BG for empty/unusable input.
//
// Extraction note (issue #14): this is the most defensive of the pre-refactor copies --
// it carries both the leading `if (!input) return DEFAULT_BG` guard and the trailing
// `pick || DEFAULT_BG` fallback. Four of the six pre-refactor copies (organizations/index.js,
// organizations/[uuid].js, pages/settings.js, and functionally pages/admin/index.js via its
// `input || ''` idiom) already matched this behavior. The two outliers -- cards/index.js
// (no guards at all) and cards/[id].js (trailing guard only) -- are behavior-preserving to
// consolidate onto this variant: cards/index.js's POST handler only ever calls normalizeBg
// after already checking `background.trim()` is truthy, so the missing guards were never
// reachable there; cards/[id].js's PATCH handler calls it unconditionally, but its own
// trailing-only fallback already produced DEFAULT_BG for empty input, identical to this
// version's result. No observed behavioral divergence survives consolidation.
export function normalizeBg(input) {
  if (!input) return DEFAULT_BG;
  const lines = String(input).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const linear = lines.find(l => l.startsWith('background: linear-gradient'));
  const color = lines.find(l => /^background:\s*#?[0-9a-fA-F]{3,8}/.test(l));
  const pick = (linear || color || input).replace(/^background:\s*/,'').replace(/;$/,'');
  return pick || DEFAULT_BG;
}

// WHAT: Normalize incoming tags to a canonical array of lowercased, deduplicated strings
// without a leading '#'.
// WHY: Ensures consistent filtering and prevents near-duplicate tags (e.g. "Foo", "#foo",
// "foo ") from coexisting.
// Note (issue #14): the two server-side copies (cards/index.js, cards/[id].js) were
// byte-identical already. The separate client-side copy in pages/admin/index.js is a
// deliberate Non-Goal for this refactor -- it runs in the browser bundle and is left as-is
// (see ARCHITECTURE.md / issue #14 for the rationale); this export only replaces the two
// server-side duplicates.
export function normalizeTags(input) {
  const arr = Array.isArray(input) ? input : [];
  const out = [];
  const seen = new Set();
  for (const raw of arr) {
    if (typeof raw !== 'string') continue;
    const t = raw.trim().replace(/^#/,'').toLowerCase();
    if (!t) continue;
    if (!seen.has(t)) { seen.add(t); out.push(t); }
  }
  return out;
}

// WHAT: Shape a raw Mongo card document into a client-safe object: stringified `_id`,
// timestamps coerced to ISO strings, `tags` guaranteed to be an array.
// WHY: Handles both Date objects (new cards) and string timestamps (migrated legacy cards)
// so JSON serialization is consistent regardless of how the document reached this point.
// Note (issue #14): cards/index.js and cards/[id].js's copies were logically identical
// (only inline-comment wording differed); no behavioral divergence.
export function toClient(doc) {
  if (!doc) return doc;
  const { _id, createdAt, updatedAt, ...rest } = doc;

  // Functional: Normalize timestamps to ISO strings for consistent JSON serialization
  // Strategic: Handle both Date objects (new cards) and string timestamps (migrated legacy cards)
  const toISOString = (val) => {
    if (!val) return undefined;
    if (typeof val === 'string') return val; // Already a string, assume ISO format
    if (val instanceof Date) return val.toISOString(); // Date object
    return undefined; // Unknown type
  };

  return {
    _id: _id?.toString?.() || String(_id),
    ...rest,
    // Ensure tags is always an array for the client
    tags: Array.isArray(rest?.tags) ? rest.tags : [],
    // Convert timestamps to ISO strings
    ...(createdAt && { createdAt: toISOString(createdAt) }),
    ...(updatedAt && { updatedAt: toISOString(updatedAt) })
  };
}
