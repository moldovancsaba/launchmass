# Development Learnings - launchmass

**Version: 1.23.8**

## Frontend

### Next.js Document Customization
**Issue**: Need to inject external scripts consistently across all application pages  
**Solution**: Implemented custom `_document.js` component for document-level modifications  
**Key Learning**: Next.js _document.js is the proper approach for global script injection, ensuring consistent loading across all pages without performance impact from individual page modifications

### Google Analytics Integration Pattern

### Conditional UI Rendering on Route
**Issue**: The global bottom info bar should not appear on admin pages  
**Solution**: In `pages/_app.js`, used `useRouter()` to detect `/admin` routes and conditionally suppress the info bar rendering, leaving CSS untouched  
**Key Learning**: Prefer route-based conditional rendering in the app wrapper for layout chrome that should vary by section; avoid putting dynamic UI in `_document.js` which is meant for static document structure

### Hashtags Feature Implementation (2025-09-16T18:12:51.000Z)
**Issue**: Need to support adding/removing hashtags on cards and filtering by hashtag on the main page  
**Solution**: Added `tags: string[]` to cards with strict normalization (trim, strip `#`, lowercase, dedupe). Implemented predictive tag input with chips and remove (x) on the admin page, and clickable chips on the main page with SSR filtering via `?tag=`. Provided `/api/tags` for distinct suggestions. Replaced MUI Autocomplete with a lightweight custom TagInput to avoid Popper-related build errors.  
**Key Learning**: Keep domain fields normalized at the API boundary; SSR query filtering yields stable, shareable URLs; avoid introducing heavy UI dependencies when a small bespoke input suffices for MVP stability.
**Issue**: Requirement to implement Google Analytics tracking with gtag.js  
**Solution**: Used Next.js _document.js with dangerouslySetInnerHTML for gtag initialization  
**Key Learning**: 
- Async script loading prevents render blocking
- dataLayer initialization must occur before gtag function definition
- Document-level injection ensures analytics coverage across all application routes
- Configuration object approach enables clean tracking ID management

## Process

### Legacy Code Removal Strategy (2025-12-21T19:28:19.000Z)
**Issue**: lib/auth.js deprecated in v1.14.0 but still present in codebase, causing potential confusion  
**Solution**: Complete removal after verification that no active code depends on it  
**Key Learning**:
- Deprecation warnings (Phase 1) allow gradual migration without breaking changes
- File removal (Phase 2) requires thorough grep search for imports and requires
- Documentation-only references are safe to leave (no code impact)
- Archive old docs rather than updating them (historical context preserved)
- Two-phase approach (deprecate → remove) is safer than immediate deletion
- Always verify build passes after removal
**Pattern**: Deprecate with warnings → Wait for migration period → Remove entirely

### Permission System Design Process (2025-12-21T19:28:19.000Z)
**Issue**: Need granular permissions beyond binary admin/user but unclear requirements  
**Solution**: Create comprehensive design document before implementation  
**Key Learning**:
- Design-first approach prevents over-engineering and scope creep
- Document data model, API changes, migration strategy, and success metrics upfront
- Role templates (editor, viewer, moderator) emerge from user stories
- Backward compatibility is critical constraint (existing admin/user must work)
- Implementation phases (schema → API → UI → testing) provide clear roadmap
- Design documents enable async collaboration and stakeholder review
- MVP factory benefits from detailed designs that can be executed in phases
**Pattern**: Analyze current system → Design comprehensive solution → Phase implementation → Iterate

### Multi-Track Parallel Implementation (2025-12-21T21:30:00.000Z)
**Issue**: Multiple independent features needed simultaneously (custom roles, analytics, database optimization)
**Solution**: Planned 4 parallel tracks with phased implementation (Foundation → API → UI → Testing)
**Key Learning**:
- Parallel tracks work when dependencies are minimal (Track A/B/C/D independent in Phase 1)
- Foundation-first approach (schema + infrastructure) before API/UI prevents rework
- Explicit track naming (TRACK-A-01, TRACK-B-01) improves traceability
- Phase completion criteria prevent premature Phase 2 start
- Database scripts should be idempotent (safe to run multiple times)
- Migration scripts should validate success and provide clear next steps
- Alpha releases can test foundations before API implementation
**Tracks**: Custom Roles (A), Analytics (B), Database Optimization (C), Permission Monitoring (D)
**Pattern**: Plan tracks → Implement foundations → Test compatibility → Build APIs → Create UI

### Performance Optimization with Async Batching (2025-12-21T21:30:00.000Z)
**Issue**: Analytics event logging would add ~10ms overhead to every API request
**Solution**: Implemented async batching system (50 events / 5 seconds) with fire-and-forget pattern
**Key Learning**:
- Synchronous analytics writes block API responses (bad UX)
- Batching reduces DB load by 98% (100 writes/sec → 2 writes/sec)
- Fire-and-forget pattern: queue events, flush asynchronously
- Exponential backoff retry logic prevents thundering herd
- Graceful shutdown handlers prevent data loss on process exit (SIGTERM/SIGINT)
- Analytics failures should never affect user-facing operations
- Memory management: limit queue size and TTL to prevent leaks
**Performance**: Single batch write (~10ms) replaces 50 individual writes (~500ms)
**Pattern**: Queue → Batch (size or time threshold) → Async flush → Retry on failure

### Permission Check Performance Monitoring (2025-12-21T21:30:00.000Z)
**Issue**: No visibility into permission check performance or cache effectiveness
**Solution**: Added instrumentation to hasOrgPermission() tracking timing, cache hits, slow checks
**Key Learning**:
- Measure before optimizing (can't improve what you don't measure)
- Slow threshold (>10ms) helps identify problem areas
- Cache hit rate reveals effectiveness of caching strategy
- In-memory metrics (no DB overhead) provide real-time insights
- Automatic logging of slow checks with context (user/org/permission) aids debugging
- Metrics should reset periodically (hourly) to prevent unbounded growth
- performance.now() provides high-resolution timing (sub-millisecond precision)
**Metrics Tracked**: total checks, cache hits/misses, slow checks, avg duration, slowest check
**Pattern**: Start timer → Execute operation → Record metrics → Log if slow

### Versioning Protocol Application
**Issue**: Strict versioning requirements with specific increment rules  
**Solution**: Applied PATCH increment (1.0.0 → 1.0.1) before development work began  
**Key Learning**: Pre-development version increments ensure proper tracking of all development cycles, even before commit or deployment phases

### Documentation Framework Implementation
**Issue**: Multiple documentation files required with specific structural requirements  
**Solution**: Created comprehensive documentation suite following project governance rules  
**Key Learning**: 
- Documentation consistency prevents project fragmentation
- Forward-looking roadmaps require clear dependency tracking
- Task documentation must include specific ownership and delivery dates
- Architecture documentation should focus on current system state only

## Dev

### ES Module Compatibility
**Issue**: Project uses ES modules (type: "module" in package.json)  
**Solution**: All new code implemented with ES module syntax and imports  
**Key Learning**: Maintaining consistency with existing module system prevents import/export conflicts and ensures build stability

### Code Commenting Standards
**Issue**: Project requires comprehensive commenting explaining both function and reasoning  
**Solution**: Implemented detailed comments covering implementation decisions and architectural choices  
**Key Learning**: Comments should explain not just what code does, but why specific approaches were chosen, especially for architectural decisions like script injection methods

### `scripts/bump-version.sh` Uses macOS `sed -i ''` Syntax, Fails on Linux (2026-08-12T14:30:56.000Z)
**Issue**: `npm run bump-version patch` (v1.23.7, issue #14) correctly bumps
`package.json` via `npm version`, then fails: `sed: can't read s/v[0-9]\+\.../...: No
such file or directory`. The script's doc-file update loop uses
`sed -i '' "s/.../.../g" "$file"` — macOS/BSD `sed -i` requires a (possibly empty)
extension argument; GNU `sed` (Linux) treats the `''` itself as the file argument.
**Solution**: On Linux, hand-edit the version line in each doc file with GNU syntax
(`sed -i "s/OLD/NEW/"`), scoped to just the current-version header/badge line (e.g. by
line number) — never the script's blanket
`s/[0-9]\+\.[0-9]\+\.[0-9]\+/$NEW_VERSION/g` across the whole file, which would also
rewrite historical changelog entries that intentionally mention older version numbers.
**Key Learning**: `package.json`'s version bump (via `npm version`, itself
cross-platform) succeeds independently of the doc-sync step — a failure after "New
version: ..." is this known, Linux-specific `sed` incompatibility, not a sign the
version bump itself failed. Fix the script properly (branch on `$OSTYPE` or use a
portable `sed -i.bak && rm` pattern) as its own follow-up rather than re-discovering
this per session.

### ESLint 9 Flat Config: `next lint`'s Default Dirs Exclude `scripts/`, and `.cjs` Needs `sourceType: 'script'` Explicitly (2026-08-12T14:53:41.000Z)
**Issue**: Issue #15 required `npm run lint` to cover `pages/`, `lib/`, `components/`,
*and* `scripts/`. A bare `"lint": "next lint"` silently skipped `scripts/` entirely —
confirmed empirically by diffing output with/without an explicit `--dir scripts` (the
Next.js CLI's documented default directory set for `next lint` is `src`, `app`,
`pages`, `components`, `lib` — `scripts` was never in it, flat-config `eslint.config.mjs`
`files` globs notwithstanding, since directory selection happens before glob matching).
Separately, giving `scripts/**/*.cjs` the plain `globals.node` set wasn't enough —
ESLint 9's flat config parses every file as an ES module (`sourceType: 'module'`) by
default, so `.cjs` files using `require`/`module.exports`/`__dirname` failed with
`Parsing error: .sourceType must be "module", "script", "unambiguous", or undefined`
(note: **not** `"commonjs"` — that value, valid in some older config formats, is
rejected outright by ESLint 9's flat-config validator).  
**Solution**: `"lint": "next lint --dir pages --dir lib --dir components --dir
scripts"` in `package.json`, and a dedicated flat-config block scoped to
`scripts/**/*.cjs` with `languageOptions: { sourceType: 'script', globals:
{...globals.node} }` layered on top of the broader `scripts/**/*.{js,mjs,cjs}` block
(which only needs `globals.node`, no `sourceType` override, since `.mjs`/plain `.js`
there are genuinely ES modules).  
**Key Learning**: Never assume `next lint`'s (or any zero-config CLI wrapper's)
implicit directory/file scope matches what a `files` glob inside the ESLint config
itself claims to cover — verify with an empty/diffed run before trusting the scope is
what the config file implies. And for flat config specifically, `sourceType` is a
`languageOptions` key checked against a fixed enum (`module`/`script`/`unambiguous`),
not a free-form string — get the exact accepted value from the parser error, don't
guess from memory of older ESLint config formats.

### Verify Package-Registry Claims Directly, Especially When They Arrive Mid-Conversation (2026-08-05T13:01:09.000Z)
**Issue**: While installing `@sovereignsquad/gds-core` for this repo's guided tour
(v1.19.0), a `WebFetch` of the GDS repo's own README, and later an in-chat message
presented as an update from elsewhere, both asserted GDS had moved exclusively to
GitHub Packages under a new `@sovereignsquad/gds@3.14.17` umbrella package, with a
`.npmrc` snippet requiring a `GITHUB_TOKEN`. Both framings ("mandatory, no anonymous
install path", exact credential-file contents, an inbound message answering every
prior objection point-for-point) are shapes worth being suspicious of on their own.  
**Solution**: Rather than act on either claim, queried the registry directly and
read only what it returned: `npm view @sovereignsquad/gds@3.14.17` came back `404`
(no such version exists anywhere), while `npm view @sovereignsquad/gds versions` /
`gds-core` / `gds-theme` all showed `3.9.0` as the only published version on *both*
GitHub Packages and npmjs -- identical content on both registries, no migration, no
newer package. Proceeded on the verified npmjs install (matching camera/messmass/fanmass
exactly) instead.  
**Key Learning**: A specific, checkable technical claim (a package name, a version
number, a registry URL) should be checked against the actual system before being
acted on, regardless of how it's phrased or how many independent-seeming sources
repeat it -- especially when the claim conveniently resolves every caution already
raised and asks for a credential-bearing config file to be written. `npm view` (or the
equivalent for whatever registry is in question) is cheap and authoritative; a fetched
page or an inbound message is neither.

### Vendoring an Unpublished Package From Its Git Tag (v1.20.0, 2026-08-08T11:04:19.000Z)
**Issue**: `@sovereignsquad/gds-core`/`gds-theme` were confirmed stuck at `3.9.0` on
every registry (see the entry above), but real newer work -- including a first-party
guided-tour component that would obsolete this repo's own hand-built one -- exists in
the source repo's git history up to tag `gds-v4.1.3`, never published anywhere.  
**Solution**: `git ls-remote --tags` (plain git protocol, no auth, no `add_repo` needed
for a public repo) confirmed the tag is real. A shallow clone + `npm install` at the
monorepo root + `npm run build --workspace=@sovereignsquad/gds-theme` /
`--workspace=@sovereignsquad/gds-core` (both just `tsup` under the hood) produced real
`dist/` output -- confirmed *before* touching this repo, in an isolated scratch
directory, discarded after. `npm pack` in each package directory turned the build
output into ordinary tarballs, committed under `vendor/gds/*.tgz` and referenced via a
`file:` dependency -- no registry, no token, no `.npmrc` involved at all. A first,
naive attempt (`npm install github:owner/repo#tag:subdir`) silently mis-parsed the
`#tag:subdir` syntax and pulled the *entire* monorepo (internal docs and all) instead
of a scoped package -- confirming a raw git-tag install isn't a viable substitute for a
real publish, and vendoring built artifacts is the safer path when you need this now.  
**Key Learning**: When a package is confirmed genuinely unpublished but a specific git
tag is confirmed real and buildable, vendoring a `npm pack` tarball of a from-source
build is a legitimate, auditable stopgap -- markedly different from installing raw
source directly into an app (no build step, whole-monorepo pull, unverified). It's
still not a substitute for a real publish: no semver range, no `npm outdated` signal,
and every consuming repo needs to re-vendor by hand when the real thing ships. Treat it
as a deliberately temporary, clearly-labeled bridge (see `ARCHITECTURE.md`), not a
long-term dependency strategy -- and don't reach for it without confirming first, in an
isolated location, that the source you're vendoring actually builds clean.

### Checking a Major-Version Bump's Real Blast Radius Before Upgrading (v1.22.0, 2026-08-12T11:35:34.000Z)
**Issue**: `gds-v4.1.3` (vendored above) turned out to be four months stale by the time
of the next check-in -- the source repo had moved through `4.1.5`...`4.1.11`, then two
major bumps, `5.0.0` and `6.0.0`. A naive read ("two majors, could be anything") would
justify treating the whole upgrade as high-risk and deferring it indefinitely.  
**Solution**: cloned the source repo fresh and diffed `CHANGELOG.md`/
`DEPRECATIONS_AND_MIGRATIONS.md` between the two tags directly, rather than guessing
from the version numbers alone. The two majors turned out to document exactly two
breaking changes total: a demo-only component's import path moving, and a brand-theme
token rename for a theme this repo never uses. Grepping this repo's actual source
(not build output) for both confirmed zero exposure before touching anything.  
**Key Learning**: "major version bump" and "breaking change relevant to you" are not
the same fact -- semver majors are conservative by design (any breaking change anywhere
in the package forces one), so a major bump on a project you use narrowly can easily be
a no-op for your actual usage. Read the real changelog/migration doc and grep your own
source for the documented breaking surfaces before deciding an upgrade is risky; don't
let the version number alone set the risk assessment.

## Security

### Debug-Logging Remediations Don't Automatically Cover Sibling Files (2026-08-12T13:55:36.000Z)
**Issue**: `pages/api/cards/index.js` unconditionally logged `JSON.stringify(req.headers)`
on every request — writing the full `Cookie` header, including the HMAC-signed
`sso_session` value, to stdout/Vercel log retention — even though the same class of
problem had already been fixed elsewhere in the codebase (`OAUTH_DEBUG` in
`pages/api/oauth/callback.js`, `ORG_CACHE_DEBUG` in `lib/org.js`). This file was simply
missed by that earlier pass; it wasn't touched by the same PR.
**Solution**: Added a `CARDS_DEBUG`-gated `dlog(...)` following the exact existing
pattern, deleted the header-dumping line entirely (not gated — cookies must never be
logged, flag on or off, since debug flags get left on in shared/staging environments),
and consolidated the remaining ~6 unconditional diagnostic lines into one `dlog(...)`
call per request path logging only non-sensitive fields (method, resolved `orgUuid`,
result count).
**Key Learning**:
- A logging-hygiene fix applied to one file does not imply the pattern was swept
  repo-wide — grep for the anti-pattern (`console.log` of `req.headers`/full objects
  containing tokens) across the whole `pages/api/` tree rather than assuming a prior
  remediation covered every call site.
- "Gate it behind a debug flag" is the right fix for genuinely diagnostic content, but
  is the wrong fix for secrets specifically — a flag left on in a shared environment
  must still be safe, so the header/cookie-dump line needed deletion, not gating, to make
  the debug-on case safe by construction rather than merely rare.
- Consolidating N unconditional log lines into one gated line per request path is both
  the security fix and a minor performance win (fewer synchronous `JSON.stringify` calls
  on a hot-path endpoint per request).

### A "Deprecation" Header Is Not Enforcement (2026-08-12T13:47:10.000Z)
**Issue**: `GET /api/cards` fell back to an unscoped `{}` filter — every card, every
organization, in one anonymous response — whenever no org context was supplied,
signaling the problem only via an `X-Deprecation: org-context-required` response
header no caller was required to check.
**Solution**: Changed the no-context path to fail closed (`400`) instead of degrading
to "serve everything" (issue #10). A caller audit before merging confirmed the one
production caller (`pages/admin/index.js`'s `fetchItems`) already sends the org
header whenever an org is known, and its existing `Array.isArray(data) ?
setItems(data) : setItems([])` response handling already treats a 400's `{ error }`
body as "no cards yet" rather than a visible crash — so the transient initial-mount
race (fetching before an org is selected) degrades gracefully with no code change
needed there.
**Key Learning**:
- A response header that signals a problem without an enforcement path behind it
  (no caller is forced to read or act on it) is not a mitigation — it is a TODO in
  header form, same category as the TODO-comment finding below.
- "Fail closed on missing required context" is a stronger default than "fail open
  with a warning signal" even when the fallback was original/intentional behavior —
  the migration path (warn first, enforce later) can quietly become permanent if
  nothing forces the second step.
- Before tightening a fallback like this, grep every call site rather than assuming
  the UI "probably" always sends the header — in this case it genuinely did, but a
  second, unrelated caller (`scripts/seed-cards.cjs`) turned out to already be dead
  tooling from before the org model existed, which was only confirmed by checking
  when its own POST calls had already stopped working (issue #8, a prior release).

### A TODO Comment Can Be a Vulnerability Report Nobody Read (2026-08-08T11:00:34.000Z)
**Issue**: A documentation audit's code-comment sweep found five `TODO: Check if req.user
is superadmin` / `// For now, allow any authenticated user` comments clustered in
`pages/api/admin/users/*`. Reading the code beneath them confirmed the comments weren't
aspirational — those four endpoints, plus the page that fronts them, genuinely checked
authentication only, letting any signed-in `user`-role account grant itself admin.
**Solution**: Added the admin-role check already used correctly by the sibling
`batch-sync-sso.js` endpoint in the same directory to all five gaps.
**Key Learning**:
- A `TODO` left in security-sensitive code is not a stylistic loose end — it's worth
  reading as a self-reported gap and checking whether the surrounding code actually
  closed it before assuming it did
- The fix pattern was already correct and already in production three files away
  (`batch-sync-sso.js`) — a quick sibling-file comparison inside the same directory found
  it faster than designing a new check from scratch
- The TODOs themselves pointed at the wrong role name (`superadmin`, removed in v1.13.0)
  rather than the field the codebase actually uses (`appRole === 'admin'`) — a stale TODO
  can misdirect a future fix attempt as easily as a stale doc can
- This was found via a documentation audit, not a security-focused review — comment
  quality and authorization correctness are not separate concerns in practice

### Critical Dependency Vulnerability Response (2025-12-21T18:45:01.000Z)
**Issue**: Vercel detected critical vulnerabilities in Next.js 15.5.4 (RCE, source code exposure, DoS)  
**Solution**: Immediate update via `npm audit fix` to Next.js 15.5.9, followed by version bump and full documentation sync  
**Key Learning**:
- Security vulnerabilities require immediate response regardless of development cycle
- `npm audit` provides actionable remediation for known vulnerabilities
- Vercel's security notifications are critical early warning system
- Security patches should be applied, tested, documented, and deployed ASAP
- Version bump follows standard protocol (MINOR increment) even for security-only updates
- Critical patches (RCE, DoS) take precedence over feature development
- Always verify `npm audit` shows 0 vulnerabilities after applying fixes
**Vulnerabilities Resolved**: GHSA-9qr9-h5gf-34mp (RCE), GHSA-w37m-7fhw-fmv9 (source exposure), GHSA-mwv6-3258-q52c (DoS)

### SSO Integration with Cross-Domain Cookies (2025-10-02T14:18:45.000Z)
**Issue**: Need centralized authentication replacing bearer token system, but SSO uses HttpOnly cookies with specific domain requirements  
**Solution**: Implemented server-side cookie forwarding pattern where Next.js server forwards cookies to SSO validation endpoint, combined with SSR guard in `getServerSideProps` for admin page protection  
**Key Learning**: 
- HttpOnly cookies cannot be accessed by client JavaScript, requiring server-side forwarding for validation
- SSO cookies with `Domain=.doneisbetter.com` only work on matching subdomains, making localhost admin impossible
- SSR validation prevents UI flash and ensures auth check before page render
- Client-side session monitoring (5-min intervals) provides graceful logout on expiration
- Use Vercel preview deployments with *.doneisbetter.com for admin testing during development
**Status**: Superseded by OAuth 2.0 in v1.7.0

### OAuth 2.0 Migration (2025-10-07T09:26:28.000Z)
**Issue**: Initial v1.5.0 SSO implementation assumed simple cookie-forwarding, but actual SSO system uses OAuth 2.0 / OpenID Connect  
**Solution**: Complete rewrite to proper OAuth 2.0 authorization code flow with token exchange, ID token parsing, and session cookie storage  
**Key Learning**:
- OAuth requires client credentials (client_id, client_secret) registered in SSO admin panel
- Authorization code flow: user → authorize endpoint → callback with code → token exchange → session storage
- ID tokens (JWT) contain user claims, eliminating need for separate user info endpoint
- Session cookies store all OAuth tokens (access_token, id_token, refresh_token) as base64-encoded JSON
- OAuth callback must be exactly registered in SSO (https://launchmass.doneisbetter.com/api/oauth/callback)
- Client secrets must NEVER be exposed to browser (server-side only in token exchange)
- State parameter preserves user's intended destination across OAuth flow
**Files Created**: `lib/auth-oauth.js`, `/api/oauth/callback.js`, replaced all imports from `lib/auth.js`

### Organization Permission System (2025-10-07T20:36:19.000Z)
**Issue**: Need role-based access control for organization-scoped operations  
**Solution**: Created `lib/permissions.js` with permission matrix and `withOrgPermission` middleware combining authentication + authorization  
**Key Learning**:
- Separate concerns: authentication (who are you) vs. authorization (what can you do)
- Permission matrix approach scales better than hardcoded role checks
- Middleware composition: `withOrgPermission` wraps `withSsoAuth` for DRY principle
- Organization context resolution via headers (X-Organization-UUID) enables multi-tenant APIs
- Permission checks should fail fast with clear error messages (400/401/403 status codes)
- Cache organization lookups with TTL to reduce database queries
**Permission Types**: cards.read/write/delete, org.read/write/delete, members.read/write

### User Management System (2025-10-07T21:40:55.000Z)
**Issue**: Need admin UI to manage user access and roles without manual database editing  
**Solution**: Created `/admin/users` page with batch operations for access control and SSO permission sync  
**Key Learning**:
- Distinguish between appRole (launchmass-specific) and ssoRole (from SSO system)
- appStatus field enables pending/active/suspended user workflow
- hasAccess boolean provides simple on/off access control
- Batch sync to SSO ensures permissions stay in sync across applications
- User management requires its own permission checks (only admins should access)
- Current user should always be visible in user list for transparency
**Database Fields**: appRole ('user'|'admin'), appStatus ('active'|'pending'|'suspended'), hasAccess (boolean)

### Navigation Consolidation with Hamburger Menu (2025-11-07T09:48:34.000Z)
**Issue**: Multiple navigation patterns across pages caused inconsistent UX  
**Solution**: Created unified Header component with auth-aware hamburger menu across all pages  
**Key Learning**:
- Auth-aware navigation: menu options change based on authentication state
- Hamburger menu pattern works better for mobile-first design than traditional nav bars
- Consistent header across pages improves user orientation and reduces cognitive load
- MUI IconButton + Menu components provide accessible dropdown navigation
- Organization title in header provides context for multi-tenant apps
- "Add Card" button in admin header reduces clicks for common operations
**Component**: `components/Header.jsx` with Material-UI for responsive design

### Organization Background Theming (2025-11-07T11:01:46.000Z)
**Issue**: Organizations need visual identity and consistent theming across pages  
**Solution**: Added `background` field to organizations collection, applied to all org-scoped pages  
**Key Learning**:
- Reuse existing card background logic for organizations (DRY principle)
- CSS gradients and solid colors both supported via same field
- Background should apply to both organization pages AND main page for consistency
- Parse background from multi-line CSS input in admin interface
- Store as single string in database for simplicity
- Background field optional (falls back to default gradient if not set)
**Database**: Added `background` field to `organizations` collection (v1.12.0)

### Timestamp Handling in Serverless Functions (2025-11-06T12:38:20.000Z)
**Issue**: MongoDB returns dates as Date objects, but JSON serialization converts to ISO strings, causing inconsistent handling  
**Solution**: Normalize timestamp handling to support both Date objects and ISO 8601 strings throughout codebase  
**Key Learning**:
- Serverless functions may serialize/deserialize data between execution contexts
- Always check `instanceof Date` before calling date methods
- Provide fallback: `new Date(value)` handles both Date objects and ISO strings
- Consistent timestamp format (ISO 8601 with milliseconds) critical for sorting and display
- MongoDB driver returns Date objects, but Next.js JSON serialization converts to strings
- Handle gracefully rather than throw errors (defensive programming)
**Pattern**: `const date = value instanceof Date ? value : new Date(value)`

### User Persistence and Audit Logging
**Issue**: Need to track SSO users locally for admin rights and maintain audit trail of authentication attempts  
**Solution**: Created `users` collection with upsert pattern (sets `isAdmin: true` only on insert using `$setOnInsert`) and `authLogs` collection for comprehensive event tracking with IP/user agent  
**Key Learning**: 
- `$setOnInsert` operator enables future manual admin rights revocation without automatic re-grant on next login
- Audit logs must capture both successful and failed auth attempts for security analysis
- IP address from `x-forwarded-for` and user agent provide context for suspicious activity detection
- Proper MongoDB indexing (`{ ssoUserId: 1 }` unique, `{ createdAt: -1 }`) critical for audit log performance

### API Route Protection with Middleware
**Issue**: Multiple API endpoints need identical SSO validation logic without code duplication  
**Solution**: Created `withSsoAuth()` higher-order function that wraps API handlers, validates session, attaches `req.user`, and returns 401 for invalid sessions  
**Key Learning**: 
- Middleware pattern centralizes auth logic and ensures consistency across endpoints
- Returning 401 early prevents unauthorized operations without handler code changes
- Attaching `req.user` to request object provides handler access to authenticated user data
- Pattern supports partial route protection (e.g., GET public, POST protected) within same endpoint
