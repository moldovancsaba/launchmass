# System Architecture - launchmass

**Version: 1.23.13**

## Overview

launchmass is a Next.js application featuring a mobile-first grid interface with administrative capabilities and integrated analytics tracking.

## Core Components

### Frontend Layer

#### Next.js Framework (v15.5.9)
- **Role**: Application framework and server-side rendering
- **Dependencies**: React 19.1.1, React-DOM 19.1.1
- **Status**: Active - Core application foundation

#### Document Structure (`pages/_document.js`)
- **Role**: Custom HTML document — font preconnect links only (v1.23.10+)
- **Dependencies**: next/document components
- **Status**: Active
- **Configuration**: 
  - `<link rel="preconnect">` for the SEYU brand fonts (Google Fonts CDN)
  - **No longer injects Google Analytics** — `gtag.js` moved to a consent-gated,
    client-side load (see "Google Analytics (gtag.js)" below and issue #18).
    `_document.js` runs server-side with no access to `localStorage`, so it structurally
    cannot check consent state — moving the script out of it was required, not optional.

#### Application Wrapper (`pages/_app.js`)
- **Role**: Global application wrapper with background, branding, and app-wide GDS providers
- **Dependencies**: Global CSS styles, `MantineProvider`, `OverlayManagerProvider` (`@sovereignsquad/gds-core/client`), `ConsentBanner` (`components/ConsentBanner.jsx`)
- **Status**: Active - Visual foundation layer
- **Info Bar Behavior**: The global bottom info bar is suppressed on all `/admin` routes via conditional rendering (useRouter path check).
- **Consent Banner (v1.23.10+)**: `<ConsentBanner />` is mounted unconditionally (every route). It renders nothing until a client-side mount effect resolves the stored consent decision, so it never affects server-rendered output. See "Google Analytics (gtag.js)" below.

### Page Components

#### Main Interface (`pages/index.js`)
- **Role**: Primary card grid display with server-side rendering
- **Dependencies**: MongoDB data fetching, OversizedLink component
- **Status**: Active - Primary user interface
- **Three-state rendering contract (v1.23.11+, issue #19)**: `getServerSideProps`
  now returns an explicit `fetchError: boolean` prop, distinguishing a genuine
  DB/fetch failure from a legitimately-empty organization -- both previously
  collapsed to the exact same `{ cards: [], activeTag: null }` shape via a bare
  `catch {}` that discarded the real error entirely. On any failure the catch
  block now runs `console.error('[index] getServerSideProps failed:', err.message)`
  (server-side only -- the real error never reaches the client) and returns
  `{ cards: [], activeTag: null, orgName: null, orgBackground: null, fetchError: true }`;
  on success (including a genuinely-empty result) it returns `fetchError: false`
  alongside whatever cards matched. `Home` renders exactly one of three
  mutually-exclusive states from this:
  - `fetchError === true` -> GDS's `GdsErrorPageTemplate` (fixed, generic copy;
    `onRetry` wired to `window.location.reload()` -- a full navigation, since
    this page has no client-side data-fetching layer to re-run in place).
  - `fetchError === false && cards.length === 0` -> GDS's `GdsEmptyStateTemplate`
    (the pre-existing "Welcome to SEYU / No content found yet" copy, restyled
    onto GDS, with the same Organizations/Admin quick-access actions). This is
    also what a tag filter with zero matching cards renders as (`activeTag` set,
    `cards` empty, `fetchError` false) -- a legitimate zero-result query, not a
    failure; the filter bar (`ChoiceChip` "Filtering by" / "Clear") still renders
    alongside it.
  - `cards.length > 0` -> the existing `<main className="grid">` of
    `OversizedLink` cards, byte-for-byte unchanged by this issue. Both GDS
    templates render their own `<main>` landmark internally (via gds-core's
    `PageTemplateFrame`), so the populated grid's `<main>` is only rendered
    when there are cards, avoiding two `<main>` landmarks on one page.
  See `node_modules/@sovereignsquad/gds-core/dist/AISearchCard-DlLxEGV9.d.ts`
  for `GdsEmptyStateTemplateProps`/`GdsErrorPageTemplateProps`'s exact shape --
  verified against the actually-installed gds-core@6.0.0, not assumed from the
  issue's sketch (same discipline as the `BannerNotice` choice in issue #18).
#### Admin Interface (`pages/admin/index.js`)
- **Role**: Administrative panel for card management
- **Dependencies**: Material-UI components, drag-and-drop functionality, OAuth authentication
- **Status**: Active - Content management system
- **Authentication**: Server-side rendering with OAuth session validation via `getServerSideProps`
- **Session Monitoring**: Client-side 5-minute interval checks with auto-redirect on expiration
- **Features**: Drag-and-drop card reordering, inline editing, organization selector

#### Structured Background Editor (`components/admin/BackgroundEditor.jsx`) - v1.23.13+ (issue #20)
- **Role**: Replaces the card-edit form's raw-CSS `background` textarea with a structured
  editor, mounted inside `pages/admin/index.js`'s `Card` component. The storage contract is
  unchanged — the card's `background` field is still saved as a plain CSS `background`
  value string (`#hex` or `linear-gradient(...)`), parseable by `lib/shared.js`'s
  `normalizeBg`, itself unchanged by this issue.
- **Three modes**, switched via a GDS `GdsSegmentedControl` (proper `radiogroup`
  semantics — keyboard/screen-reader navigable per its own accessibility guarantees):
  - **Solid** — a single GDS `FormField`-wrapped, pattern-validated hex text field
    (`/^#[0-9a-fA-F]{3,8}$/`), with an inline error message (not a silent save-time
    fallback) when invalid.
  - **Gradient** — a GDS `GdsSlider` for the angle (0–360°) plus one row per color stop
    (a GDS `FormField`-wrapped color text field, a GDS `NumberStepper` for the 0–100%
    position, and a `ChoiceChip`-based Remove action), with a `ChoiceChip` "+ Add stop"
    action. Not capped at 3 stops. A minimum of 2 stops is enforced (Remove disabled at
    2) per the issue's acceptance criteria. New cards default to `DEFAULT_BG` and open
    with its real three stops pre-populated, not blank.
  - **Advanced** — the original raw-CSS `<textarea>`, functionally unchanged, for values
    that don't fit the structured shapes (or for operators who want the original
    free-paste behavior).
  - `detectMode(cssValue)` (exported from `BackgroundEditor.jsx`) picks the mode an
    existing card opens into: a clean `#hex` → Solid, a clean single-line
    `linear-gradient(<N>deg, <color> <N>%, ...)` (≥2 stops) → Gradient, anything else
    (multi-layer shorthand, keyword-direction gradients, rgba-without-explicit-`%`
    stops, etc.) → Advanced, so an unusual-but-valid existing value is never corrupted.
  - **Mode-switch data-loss guard**: if the current Advanced-mode value doesn't cleanly
    parse (`detectMode` still says `'advanced'`), the Solid and Gradient radio options
    are disabled (not just hidden) and a GDS `InlineAlert` explains why, with an explicit
    "Reset to default gradient" action — switching away from an unparseable raw value
    is never silent.
  - A live preview swatch (a plain `background`-styled `<div aria-hidden>`, since its
    information is already conveyed by the structured field values) updates
    synchronously with every field edit, regardless of mode.
  - The card form's Save button is disabled while the Solid or Gradient mode's fields
    are invalid (`onValidityChange` callback), so a malformed value can't be saved
    silently; Advanced mode carries no added validation gate (unchanged behavior —
    `normalizeBg`'s own existing fallback is the safety net there, as before this issue).
- **GDS component-fit finding (see the issue #20 PR body for the full investigation)**:
  the vendored `@sovereignsquad/gds-core` v6.0.0 has **no dedicated color-picker /
  color-input / color-swatch-selection component**, and `GdsSchemaForm`'s field-type
  union (`GdsSchemaFieldType`) has no `'color'` variant — confirmed by enumerating the
  package's full compiled export surface. GDS also does not re-export or wrap Mantine's
  `ColorInput`/`ColorPicker` anywhere; its compiled bundles import only a specific,
  curated allowlist of Mantine primitives (`Button`, `Modal`, `Group`, `Text`, `Center`,
  `Paper`, `UnstyledButton`, `AppShell`, `Box`, `Burger`, `ScrollArea`, `NativeSelect`,
  `Stack`, `Transition`, `Divider`, `Container`), never Mantine's color components. This
  is a genuine, narrow gap in GDS (a true visual color-picking widget), not a gap in
  general structured-form primitives — `FormField`, `GdsSegmentedControl`, `GdsSlider`,
  `NumberStepper`, `InlineAlert`, and `ChoiceChip` (already adopted in this repo, issues
  #18/#19) are all genuine fits for everything except color selection itself. Per this
  gap, colors are entered as a validated text field rather than a picker — which is
  also the *correct* shape independent of the gap, since `DEFAULT_BG`'s own gradient
  stops are `rgba(...)` values, not hex, so a hex-only picker (GDS-native or a native
  `<input type="color">`) could not represent this app's own default background.

#### User Management Interface (`pages/admin/users.js`) - v1.7.0+
- **Role**: Admin panel for managing user access and permissions
- **Dependencies**: Material-UI components, OAuth authentication
- **Status**: Active - User administration
- **Features**:
  - View all users with SSO sync status
  - Grant/revoke admin access
  - Change user roles (user/admin)
  - Batch sync permissions to SSO
  - Approve pending users

#### Settings Page (`pages/settings.js`) - v1.7.0+
- **Role**: Application settings and configuration
- **Dependencies**: Material-UI components, OAuth authentication
- **Status**: Active - Configuration interface
- **Features**:
  - Organization management (create, edit, delete)
  - Organization membership management
  - Personal preferences
  - OAuth-protected access
- **Session Monitoring**: Client-side 5-minute interval checks with auto-redirect on expiration

#### Header Component (`components/Header.jsx`) - v1.10.0+
- **Role**: Global navigation header with hamburger menu
- **Dependencies**: React, Material-UI
- **Status**: Active - Navigation system
- **Features**:
  - Auth-aware hamburger menu
  - Organization title display
  - Mobile-responsive design
  - Consistent across all pages

#### OversizedLink Component (`components/OversizedLink.jsx`)
- **Role**: Individual card rendering with gradient/color support
- **Dependencies**: React, CSS styling system
- **Status**: Active - Core UI component

### Data Layer

#### MongoDB Integration (`lib/db.js`)
- **Role**: Database connection and connection pooling
- **Dependencies**: MongoDB driver v6.18.0
- **Status**: Active - Persistent data storage
- **Configuration**: 
  - Connection pooling for development/production environments
  - Global connection reuse pattern
- **Collections**:
  - `cards` - Card content and metadata (with orgUuid, tags, background)
  - `organizations` - Organization management (with slug, description, background v1.12.0+)
  - `organizationMembers` - Organization membership and roles (v1.7.0+)
  - `users` - OAuth user persistence and admin rights (v1.7.0+)
  - `authLogs` - Authentication audit trail (v1.7.0+)
  - `organizationRoles` - Custom role definitions (v1.18.0+)
  - `analyticsEvents` - Event tracking for analytics (v1.18.0+)

#### Shared Normalization Helpers (`lib/shared.js`) - v1.23.7+
- **Role**: Single canonical source for `DEFAULT_BG`, `normalizeBg`, `normalizeTags`, and
  `toClient` — background-CSS extraction, tag canonicalization, and client-safe card
  document shaping (stringified `_id`, ISO timestamp coercion).
- **Status**: Active — extracted from six independently-drifting copies (issue #14):
  `pages/api/cards/index.js`, `pages/api/cards/[id].js`, `pages/api/organizations/index.js`,
  `pages/api/organizations/[uuid].js`, `pages/admin/index.js`, and `pages/settings.js` all
  previously defined their own `normalizeBg`/`DEFAULT_BG`; `cards/index.js` and
  `cards/[id].js` additionally each defined their own `normalizeTags`/`toClient`.
- **Constraint**: zero dependency on Next.js request/response objects or any server-only
  API — pure functions only, so the module is safely importable by both server-side API
  routes and client-bundled page components (`pages/admin/index.js`, `pages/settings.js`
  import `normalizeBg`/`DEFAULT_BG` from here directly).
- **Deliberate exception**: `pages/admin/index.js` keeps its own local `normalizeTags` —
  a client-side-only copy left un-deduplicated on purpose (issue #14 Non-Goal); see that
  file's inline comment for the rationale.

#### API Routes (`pages/api/`)
- **Role**: RESTful API endpoints for data operations
- **Dependencies**: Next.js API routes, MongoDB integration, SSO authentication middleware
- **Status**: Active - Data management interface
- **Authentication**: All write operations protected by `withSsoAuth` middleware (v1.5.0+)
- **Endpoints**:
  - `/api/cards/` - CRUD operations for card management (POST requires `cards.create` in the
    target org via `withOrgPermission`, not merely a valid session — v1.23.1+). GET requires
    an organization context (`X-Organization-UUID` header or `?orgUuid=`) — a request with no
    resolvable org context returns `400 { error: 'Organization context required (X-Organization-UUID
    or ?orgUuid=)' }` rather than falling back to an unscoped all-organizations listing
    (previously a deprecated fallback with an `X-Deprecation` header; now removed — v1.23.3+).
    The route otherwise remains intentionally public-when-scoped (no session required once org
    context is present, matching the public per-org card grid use case).
  - `/api/cards/[id]` - Individual card operations (PATCH requires `cards.update`, DELETE
    requires `cards.delete`, both in the target org via `withOrgPermission` — v1.23.1+)
  - `/api/cards/reorder` - Bulk reordering functionality (requires `cards.reorder` in the
    target org via `withOrgPermission`; admin-only per the permission matrix — v1.23.1+)
  - `/api/organizations/` - Organization management (GET/POST protected)
  - `/api/organizations/[uuid]` - Individual org operations (PUT/DELETE protected)
  - `/api/organizations/[uuid]/members/` - Organization membership management (v1.7.0+)
  - `/api/organizations/[uuid]/members/[memberId]` - Individual member operations (v1.7.0+)
  - `/api/oauth/callback` - OAuth 2.0 authorization code callback (v1.7.0+)
  - `/api/auth/validate` - Client-side session validation proxy
  - `/api/auth/logout` - OAuth logout endpoint (v1.11.0+)
  - `/api/admin/users/` - User management operations (v1.7.0+)
  - `/api/admin/users/[ssoUserId]/grant-access` - Grant admin access (v1.7.0+)
  - `/api/admin/users/[ssoUserId]/revoke-access` - Revoke admin access (v1.7.0+)
  - `/api/admin/users/[ssoUserId]/change-role` - Change user role (v1.7.0+)
  - `/api/admin/batch-sync-sso` - Batch sync permissions to SSO (v1.13.0+)

### UI Framework

#### Material-UI Integration (@mui/material v7.3.1)
- **Role**: Component library for admin interface
- **Dependencies**: @emotion/react, @emotion/styled
- **Status**: Active - Admin UI foundation

#### Drag and Drop (@dnd-kit v6.3.1)
- **Role**: Card reordering functionality in admin panel
- **Dependencies**: @dnd-kit/sortable, @dnd-kit/utilities
- **Status**: Active - Interactive admin features

### External Integrations

### Guided Tour (v1.19.0)
- **Role**: Spotlight-and-tooltip walkthrough of `components/Header.jsx`'s hamburger
  menu, triggered manually from a "❓ Guided tour" menu item -- no autoStart.
- **Engine**: `lib/tour/useTourController.js` (step-sequencing state), `lib/tour/storage.js`
  (localStorage "seen" persistence), `lib/tour/config/tourSteps.js` (step content, one
  step per menu item, adjusted for auth state), `components/tour/TourOverlay.jsx`
  (backdrop + spotlight cutout + positioned tooltip, built on `@mantine/core` primitives).
  Ported line-for-line from the identical engine already shipped in camera, messmass,
  and fanmass -- same file names, same hook shape, same step-config contract -- just
  converted from TypeScript to plain JS with JSDoc, since this repo has no TypeScript
  source (see `CLAUDE.md` §6).
- **Integration**: Registers with `@sovereignsquad/gds-core`'s `OverlayManagerProvider`
  as a `popover` overlay. Mounted app-wide in `pages/_app.js` (alongside a plain
  `MantineProvider`, no custom theme) rather than scoped to an admin-only layout like
  messmass -- Header.jsx, which carries the tour trigger, renders on every page
  including the public card launcher, not just `/admin`.
- **Why the menu doesn't close mid-tour**: Header.jsx's existing "click outside to
  close" affordance is a full-screen `<div onClick={...}>` at z-index 999. TourOverlay's
  own backdrop (z-index 10000, `pointer-events: auto`, covers the full viewport except
  the `pointer-events: none` spotlight cutout) sits above it and intercepts every click
  outside the spotlighted item, so the tour never needs an explicit "don't close while
  touring" guard -- the same mechanism messmass and fanmass rely on.
- **z-index**: plain numbers (10000 backdrop / 10001 tooltip), not CSS custom
  properties -- this repo has no `--z-*` token system (just ad hoc numeric z-index per
  element, e.g. Header.jsx's dropdown tops out at 1001), so the tour follows that
  existing convention rather than introducing a new one.
- **Dependencies added**: `@sovereignsquad/gds-core@3.9.0`, `@sovereignsquad/gds-theme@3.9.0`,
  `@mantine/core@8.3.18`, `@mantine/hooks@8.3.18`, `@mantine/modals@8.3.18`,
  `@mantine/notifications@8.3.18`, `@tabler/icons-react@3.44.0` -- versions matched to
  what messmass already runs in production, from the public npm registry (no GitHub
  Packages token required; see `LEARNINGS.md` for why that mattered).

### Tag Chips / GDS 4.1.3 vendoring (v1.20.0)
- **What**: `components/OversizedLink.jsx`'s card tag pills and `pages/index.js`'s
  active-filter bar render via `@sovereignsquad/gds-core`'s `ChoiceChip` instead of the
  legacy `.tag-chip` CSS class (`styles/globals.css`). `OversizedLink.jsx` uses
  `onClick` mode (it sits inside the card's own `<a>`, so `ChoiceChip`'s `href` mode
  would render a nested anchor, which is invalid HTML); `pages/index.js` uses `href` +
  `active` mode since it isn't nested.
- **Why `ChoiceChip` and not `GdsBadge`**: `GdsBadge`'s own doc comment states it is
  "never interactive -- removable tokens are `GdsRemovableTag`'s job, counts are
  `GdsCountBadge`'s." These tag pills navigate on click, so `GdsBadge` would violate its
  own contract. `ChoiceChip` is documented for exactly this: "a neutral, token-safe chip
  for lightweight selection, mode toggles, and taxonomy links."
- **Vendoring**: `@sovereignsquad/gds-core`/`gds-theme` have never been published beyond
  `3.9.0` on any registry (npmjs or GitHub Packages, both verified directly). Real newer
  work exists in the source repo up to git tag `gds-v4.1.3`, confirmed buildable
  (`tsup`, clean build, real `dist/` output) but never published. `vendor/gds/*.tgz`
  are `npm pack` output from a from-source build of that tag, referenced via a `file:`
  dependency in `package.json` -- not a registry install. See `LEARNINGS.md` for the
  full trail and the tradeoffs this carries.
- **Visual departure, intentional**: `ChoiceChip` renders GDS's own default styling
  (filled, uppercase), not the legacy `.tag-chip` look (white pill, dark text, magenta
  hover). Left as-is per this file's own §6 stance that new GDS component work carries
  the system's own visual language rather than being forced to match pre-existing SEYU
  CSS. Other `.tag-chip` usages (the empty-state Organizations/Admin links) are
  untouched -- this is scoped to the two tag-pill surfaces only, not a full migration.
- **`@sovereignsquad/gds-theme/styles.css`** is now imported in `pages/_app.js`
  (previously only `@mantine/core/styles.css` was, sufficient for the tour's plain
  Mantine primitives but not for `ChoiceChip`'s `--gds-*` token references).
- **Bumped to `6.0.0` (v1.22.0)**: the source repo's tags moved past `4.1.3` --
  `4.1.5`...`4.1.11`, then major bumps `5.0.0` and `6.0.0` -- while the published
  registry version is still `3.9.0`. Checked the upstream `CHANGELOG.md`/
  `DEPRECATIONS_AND_MIGRATIONS.md` before upgrading: exactly two breaking changes
  across both majors (`ReferenceThemeExplorer` relocated to a dedicated subpath,
  `class-usa` brand-theme token rename), neither referenced anywhere in this repo.

## Organizations

### Data Model
- Collection: `organizations`
  - Fields:
    - uuid (UUIDv4) - Unique identifier
    - name - Display name
    - slug (unique, lowercase) - URL-friendly identifier
    - description - Organization description
    - background (v1.12.0+) - CSS gradient or solid color for visual theming
    - isActive (bool) - Soft delete flag
    - createdAt, updatedAt - ISO 8601 timestamps
  - Indexes: { slug: 1, unique: true }, { uuid: 1, unique: true }, { isActive: 1 }
- Cards (existing):
  - Added: orgUuid (authoritative), orgSlug (denormalized), tags (array), background (CSS)
  - Indexes: { orgUuid: 1, order: 1 }, { orgUuid: 1, tags: 1 }

### Context Detection
- Headers: X-Organization-UUID (preferred), X-Organization-Slug (fallback)
- Helper: lib/org.js resolves org context and caches slug lookups (TTL)

### Routes and Endpoints
- Pages:
  - `/organization/[slug]` — Organization-specific grid with optional `?tag=`
- APIs:
  - `/api/organizations` (GET/POST)
  - `/api/organizations/[uuid]` (PUT/DELETE)
  - `/api/organization/[slug]` (GET)
  - `/api/cards` and related endpoints — org-aware (GET requires org context, 400 without it — v1.23.3+)
  - `/api/tags` — distinct tags for current org

### Admin Flow (v1.13.0)
1. **Authentication**: User authenticates via OAuth 2.0 at sso.doneisbetter.com
2. **Organization Selection**: Admin page includes org selector dropdown
3. **Permission Check**: All writes verify user has required permission for selected org
4. **Role-Based Access**:
   - **Admins**: Full CRUD access to cards and organizations
   - **Users**: Read-only or limited write access (depends on org membership)
5. **Org Context**: All admin writes require organization context (X-Organization-UUID header)
6. **SSO Sync**: Permissions can be synced to central SSO system via batch sync feature

#### Google Analytics (gtag.js) — Consent-Gated (v1.23.10+, issue #18)
- **Role**: User behavior tracking and analytics collection
- **Dependencies**: Google Tag Manager CDN, `lib/consent.js`, `components/ConsentBanner.jsx`
- **Status**: Active - loads only after explicit user consent
- **Implementation**:
  - `lib/consent.js`'s `loadGoogleAnalytics()` injects the `gtag.js` script tag and
    fires `gtag('config', ...)` — called only client-side, only once consent is
    `'accepted'` (fresh click or a previously stored decision read back on a later page
    load). A module-level guard prevents double-injection.
  - Consent decision lives in `localStorage` under the key `seyu-analytics-consent`
    (`'accepted'` | `'declined'`; the key's absence means undecided). Reads/writes are
    wrapped in try/catch (`readConsent()`/`writeConsent()`) — a storage failure
    (private browsing, quota exceeded) is treated as "undecided," not a crash.
  - `components/ConsentBanner.jsx`, mounted from `pages/_app.js`, owns the UI: a GDS
    `BannerNotice` (Accept/Decline) while undecided, and a persistent "Cookie
    preferences" `Button` once decided, which reopens the same banner. SSR-safe —
    renders `null` until a client-side mount effect has resolved the stored decision.
  - Async loading (unchanged from the pre-#18 implementation) to prevent performance
    impact once consent is granted.
  - Configured with tracking ID G-HQ5QPLMJC1 (unchanged, still hardcoded — no new env
    var introduced by this change).
  - **Not** the issue's suggested `GdsSheet`/`GdsDrawer`: those are
    `OverlayManagerProvider`-governed, focus-trapping surfaces — modal behavior the
    issue explicitly disallows for this non-modal banner. See `LEARNINGS.md`'s "GDS
    Component Selection" entry for the full verification trail.

## Authentication System (v1.7.0+ OAuth 2.0)

### OAuth 2.0 / OpenID Connect Architecture

#### Authentication Flow
1. **Admin Page Access**: User visits `/admin` on launchmass.doneisbetter.com
2. **Server-Side Validation**: `getServerSideProps` calls `validateSsoSession(req)` from `lib/auth-oauth.js`
3. **Session Check**: Server reads `sso_session` HttpOnly cookie containing OAuth tokens
4. **No Session**: Redirect to `https://sso.doneisbetter.com/api/oauth/authorize` with client_id, redirect_uri, scopes
5. **OAuth Login**: User authenticates at SSO, receives authorization code
6. **Callback**: SSO redirects to `/api/oauth/callback?code=AUTH_CODE&state=RETURN_URL`
7. **Token Exchange**: Callback handler POSTs to SSO `/api/oauth/token` to exchange code for tokens (access_token, id_token, refresh_token)
8. **User Info**: ID token (JWT) contains user claims (id, email, name, role)
9. **Session Storage**: Tokens stored in HttpOnly cookie (`sso_session`) as base64-encoded JSON
10. **User Persistence**: Valid sessions trigger `upsertUserFromSso()` to sync user data to MongoDB
11. **Audit Logging**: All auth attempts logged via `recordAuthEvent()` to `authLogs` collection
12. **Page Rendering**: Valid sessions render admin interface with user context

#### Components

**Server-Side (`lib/auth-oauth.js`) - Primary Auth Library (v1.7.0+):**
- `getOAuthLoginUrl(redirectAfter)` - Constructs OAuth authorization URL with PKCE
- `validateSsoSession(req)` - Validates session from cookie, checks expiration, syncs users
- `withSsoAuth(handler)` - Middleware wrapper for API route protection
- `withOrgPermission(permission, handler)` - Combined auth + org permission middleware
- `isAppAdmin(user)` - Shared predicate: true if `user.appRole` is `admin`/`superadmin`
  or the canonical `isSuperAdmin` flag (`lib/permissions.js`) is set (v1.23.2+)
- `requireAdminRole(handler, message?)` - Middleware wrapper enforcing `isAppAdmin`;
  used by all `admin/users/**` and `admin/batch-sync-sso` API routes — a caller whose
  `appRole` is not `admin`/`superadmin` and lacks the `isSuperAdmin` flag gets a 403
  (v1.23.2+)
- `logoutOAuth(res)` - Clears session cookie and returns SSO logout URL
- Returns 401 for invalid sessions, attaches `req.user` for valid sessions

**Server-Side (`lib/auth.js`) - REMOVED:**
- **Status**: Removed in v1.17.0 (deprecated in v1.14.0)
- Was original v1.5.0 implementation using cookie forwarding to SSO validate endpoints
- All code now uses `lib/auth-oauth.js` exclusively

**Server-Side (`lib/users.js`):**
- `getUsersCollection()` - Returns MongoDB users collection with auto-indexing
- `upsertUserFromSso(ssoUser)` - Creates/updates user records from OAuth user data
- `recordAuthEvent(data)` - Writes auth attempts to audit log with IP and user agent
- User model includes: ssoUserId, email, name, appRole (user/admin), appStatus, hasAccess

**Server-Side (`lib/permissions.js`) - v1.7.0+:**
- `isSuperAdmin(user)` - Check if user has super admin rights
- `getUserOrgRole(user, orgUuid)` - Get user's role within organization
- `hasOrgPermission(user, orgUuid, permission, req)` - Check specific permission with caching
- `getOrgRole(orgUuid, roleId)` - Load role definition (system or custom) with caching
- `clearExpiredRoleCache()` - Cleanup expired cache entries
- `getPermissionMetrics()` - Get performance metrics (v1.18.0)
- `resetPermissionMetrics()` - Reset metrics counters (v1.18.0)
- Permission matrix: 18 granular permissions (v1.18.0):
  - org: read, write, delete
  - cards: read, create, update, delete, reorder
  - members: read, invite, remove, edit_roles
  - roles: read, write
  - tags: read, write
- Performance monitoring (v1.18.0):
  - Tracks cache hit rate, avg duration, slow checks (>10ms)
  - Logs slow permission checks for debugging
  - Exposes metrics via getPermissionMetrics()

**Server-Side (`lib/ssoPermissions.js`) - v1.13.0+:**
- SSO permission synchronization helper
- Syncs launchmass permissions to central SSO system
- Unified access control across all applications

**Server-Side (`lib/analytics.js`) - v1.18.0+, wired in v1.23.6+:**
- Event logging system with async batching (50 events / 5 seconds)
- Prevents blocking API responses (fire-and-forget pattern)
- Event types: card_click, card_create, card_update, card_delete, admin_action, user_login, org_create/update/delete, role events
- Retry logic with exponential backoff (max 10 retries)
- Graceful shutdown handling (SIGTERM/SIGINT) — best-effort only: a partial in-memory
  batch (under 50 events / 5 seconds since the last flush) can be lost on an abrupt
  serverless cold shutdown; accepted trade-off of the batching design, not exactly-once
- Helper functions:
  - `logEvent(type, data)` - Queue event for async batch write
  - `logCardClick(cardId, orgUuid, userId, href)` - Convenience wrapper (not yet
    called anywhere — requires a future client-side beacon endpoint, see below)
  - `logAdminAction(action, orgUuid, userId, details)` - Convenience wrapper
  - `getQueueStatus()` - Get current queue metrics
  - `flushAndShutdown()` - Flush events before process exit
- Performance: Reduces DB load by 98% (100 writes/sec → 2 writes/sec)
- **Call sites (v1.23.6+, issue #13):** `pages/api/cards/index.js` (POST →
  `CARD_CREATE`), `pages/api/cards/[id].js` (PATCH/DELETE → `CARD_UPDATE`/
  `CARD_DELETE`), `pages/api/cards/reorder.js` (→ `CARD_REORDER`), the three admin
  user-management routes under `pages/api/admin/users/[ssoUserId]/` (→
  `logAdminAction`), and `pages/api/oauth/callback.js` on successful login (→
  `USER_LOGIN`, additive alongside the existing `recordAuthEvent` audit-trail write).
  Not yet wired: `logCardClick` (needs a beacon endpoint) and
  `ORG_CREATE/UPDATE/DELETE` in `pages/api/organizations/**` — both deferred.

**Client-Side:**
- Session monitoring every 5 minutes via `/api/auth/validate` proxy
- Auto-redirect to OAuth login on session expiration (triggers page reload)
- User info display (name/email) in admin header and hamburger menu
- Logout button calls `/api/auth/logout` which clears local session and redirects to SSO logout

#### Database Schema

**users Collection:**
```javascript
{
  ssoUserId: String,        // Unique - from SSO user.id
  email: String,            // User email from OAuth
  name: String,             // Display name from OAuth
  ssoRole: String,          // From SSO user.role (deprecated)
  appRole: String,          // Application role: 'user' | 'admin' (v1.13.0+)
  appStatus: String,        // Status: 'active' | 'pending' | 'suspended' (v1.13.0+)
  hasAccess: Boolean,       // Whether user has access to launchmass (v1.13.0+)
  isAdmin: Boolean,         // Legacy admin flag (being phased out in favor of appRole)
  localPermissions: Object, // Reserved for future granular permissions
  lastLoginAt: String,      // ISO 8601 with milliseconds
  createdAt: String,        // ISO 8601 with milliseconds
  updatedAt: String         // ISO 8601 with milliseconds
}
// Indexes: { ssoUserId: 1 } unique, { email: 1 }, { appRole: 1 }, { appStatus: 1 }
```

**organizationMembers Collection (v1.7.0+):**
```javascript
{
  orgUuid: String,          // Organization UUID reference
  ssoUserId: String,        // User ID from SSO
  role: String,             // Role: 'user' | 'admin'
  addedBy: String,          // SSO user ID who added this member
  createdAt: String,        // ISO 8601 with milliseconds
  updatedAt: String         // ISO 8601 with milliseconds
}
// Indexes: { orgUuid: 1, ssoUserId: 1 } unique compound, { ssoUserId: 1 }, { role: 1 }
```

**authLogs Collection:**
```javascript
{
  ssoUserId: String,   // null if unavailable
  email: String,       // null if unavailable
  status: String,      // 'success' | 'invalid' | 'error'
  message: String,     // Error context or success note
  ip: String,          // Client IP from x-forwarded-for
  userAgent: String,   // Browser user agent
  createdAt: String    // ISO 8601 with milliseconds
}
// Indexes: { createdAt: -1 }, { ssoUserId: 1, createdAt: -1 }
```

**organizationRoles Collection (v1.18.0+):**
```javascript
{
  orgUuid: String,        // Organization UUID
  roleId: String,         // Role identifier (e.g. 'editor', 'moderator')
  name: String,           // Display name
  description: String,    // Role description
  permissions: Array,     // Array of permission strings
  isSystem: Boolean,      // true for system roles (admin, user)
  createdBy: String,      // SSO user ID who created the role
  createdAt: String,      // ISO 8601 with milliseconds
  updatedAt: String       // ISO 8601 with milliseconds
}
// Indexes: { orgUuid: 1, roleId: 1 } unique compound, { orgUuid: 1, isSystem: 1 }
```

**analyticsEvents Collection (v1.18.0+):**
```javascript
{
  timestamp: String,      // ISO 8601 with milliseconds
  eventType: String,      // One of EVENT_TYPES (card_click, card_create, etc.)
  orgUuid: String,        // Organization context (null for global events)
  userId: String,         // SSO user ID (null for anonymous)
  data: Object            // Event-specific metadata (flexible schema)
}
// Indexes: { timestamp: -1 }, { orgUuid: 1, timestamp: -1 }, { eventType: 1, timestamp: -1 }, { userId: 1, timestamp: -1 }
```

#### Critical Requirements

**Domain Requirement:**
- Admin features ONLY work on `*.doneisbetter.com` subdomains
- SSO sets cookies with `Domain=.doneisbetter.com`
- Browsers only send cookies to matching domain hierarchy
- **Localhost admin access is not possible** due to cookie domain mismatch

**Session Management (OAuth 2.0):**
- HttpOnly cookies store OAuth tokens (access_token, id_token, refresh_token)
- Session cookie contains base64-encoded JSON with tokens and user data
- 24-hour token expiration (configurable in SSO)
- Sessions validated on both server (SSR) and client (5-minute periodic monitoring)
- Expired sessions trigger automatic redirect to OAuth authorization flow
- Logout clears local session cookie and redirects to SSO OAuth logout endpoint

**Security Features:**
- OAuth 2.0 Authorization Code flow (industry standard)
- No bearer tokens or client secrets exposed to browser
- HttpOnly, Secure, SameSite=Lax cookies
- Comprehensive audit logging of all auth attempts
- IP address and user agent tracking for security analysis
- Server-side token validation prevents client tampering
- PKCE-ready architecture for additional security

## Data Flow

1. **Main Application**: Server-side rendering fetches cards from MongoDB → renders grid interface with organization context
2. **Admin Operations**: OAuth-authenticated users perform CRUD operations through protected API routes
3. **Permission Enforcement**: API routes verify user permissions via `withOrgPermission` middleware
4. **User Management**: Admins manage user access and roles, with optional SSO permission sync
5. **Analytics Tracking**: Page views and interactions tracked via Google Analytics only after explicit user consent (v1.23.10+, issue #18) — see "Google Analytics (gtag.js) — Consent-Gated" above
6. **Authentication**: OAuth 2.0 session validation with automatic user sync and audit logging
7. **Organization Management**: Users create/edit organizations with custom backgrounds and member management

## Build and Deployment

### Development Environment
- **Command**: `npm run dev`
- **Port**: Default Next.js development server
- **Features**: Hot reloading, development optimization

### Production Build
- **Command**: `npm run build` followed by `npm run start`
- **Optimization**: Next.js production optimizations enabled
- **Deployment**: Vercel-compatible build structure

### Environment Configuration

**Database:**
- **MONGODB_URI**: Database connection string
- **DB_NAME**: Database name (default: 'launchmass')
- **SSO_MONGODB_URI**: Connection string for the SSO service's own database (separate
  cluster from `MONGODB_URI`). Required only by the operator scripts under `scripts/`
  that read/update SSO's `oauthClients` collection directly
  (`enable-client-credentials.mjs`, `find-oauth-client.mjs`, `get-client-secret.mjs`) —
  not used by the running application itself. See issue #7.

**OAuth 2.0 Authentication (v1.7.0+):**
- **SSO_SERVER_URL**: SSO service URL (https://sso.doneisbetter.com)
- **SSO_CLIENT_ID**: OAuth client ID from SSO admin panel
- **SSO_CLIENT_SECRET**: OAuth client secret (server-side only, sensitive)
- **SSO_REDIRECT_URI**: OAuth callback URL (https://launchmass.doneisbetter.com/api/oauth/callback)
- **SESSION_SECRET**: HMAC key that signs/verifies the `sso_session` cookie (server-side only, sensitive; see `lib/session.js`). Falls back to `SSO_CLIENT_SECRET` if unset — set a dedicated value in production so session integrity is independent of the OAuth client secret.
- **NEXT_PUBLIC_SSO_SERVER_URL**: Client-accessible SSO URL
- **NEXT_PUBLIC_SSO_CLIENT_ID**: Public client ID for client-side OAuth redirects
- **NEXT_PUBLIC_SSO_REDIRECT_URI**: Public OAuth callback URL
- **AUTO_GRANT_ACCESS**: Controls first-login access for users with no prior SSO or local
  record (default `true`: auto-grants `appRole: 'user'` + access; `false`: leaves the
  user pending explicit admin approval). Never consulted when SSO already has a
  permission record, or when a local `users` document already exists — see `WARP.md`'s
  Authentication Pattern section for the full precedence order. Never grants admin.
- **SESSION_COOKIE_DOMAIN** (optional, v1.23.0+): `Domain=` scope for the `sso_session`
  cookie. Defaults to `.doneisbetter.com`, matching production today. Only relevant if
  migrating to a different apex domain — see #46.
- **APP_BASE_URL** (optional, v1.23.0+): base origin for the post-logout SSO redirect.
  Defaults to `https://launchmass.doneisbetter.com`. Keep in sync with
  `SESSION_COOKIE_DOMAIN`/`SSO_REDIRECT_URI` during a domain migration.

**Legacy (Deprecated in v1.7.0):**
- ~~**SSO_COOKIE_DOMAIN**: Cookie domain for SSO~~ (v1.5.0 cookie-forwarding approach)
- ~~**SSO_LOGIN_PATH**: SSO login path~~ (v1.5.0 cookie-forwarding approach)
- ~~**SSO_LOGOUT_PATH**: SSO logout path~~ (v1.5.0 cookie-forwarding approach)
- ~~**ADMIN_TOKEN**: Administrative authentication token~~ (Removed in v1.5.0)

**Other:**
- **BASE_URL**: Application base URL for seeding operations

## Static Analysis as the Test Substitute (ESLint, v1.23.8+)

`WARP.md` states a deliberate, standing project rule: **automated tests are
prohibited in this repository** ("this is an MVP factory, no testing allowed"). That
rule removes the usual safety net that would normally catch an unused import, a
dead/unreachable code branch, or a stray `console.log` left in a production path
before it merges. ESLint (`eslint.config.mjs`, wired into `npm run lint`,
`.githooks/pre-commit`, and `.github/workflows/ci.yml`) exists specifically to fill
that gap — it is a load-bearing quality gate in this repo, not a nice-to-have
formatting tool. Concretely, several defects fixed in this codebase's own history
(a field-name mismatch across #6/#12, a dead unwired module in #13) were exactly the
class of bug `no-unused-vars`/`no-undef` catch automatically, at commit time, without
running a single test.

The chosen baseline (`eslint-config-next`'s `next/core-web-vitals`, plus
`no-unused-vars: error`, `no-console: [warn, {allow: ['error','warn']}]`, `no-undef:
error`, `eqeqeq: [error, smart]`) is intentionally narrow: it targets defect classes
(dead code, undefined-reference typos, loose equality footguns, accidental debug
logging), not code style — Prettier/formatting enforcement is explicitly out of scope
(see issue #15's Non-Goals) to keep the barrier to adopting the gate low. `no-console`
is `warn` rather than `error` on purpose: this codebase has extensive legitimate
`console.error`/`console.warn` usage for server-side diagnostics (OAuth flows,
migration scripts under `scripts/`), and promoting it to `error` before a full audit
of the remaining call sites would make the gate too blunt to be trustworthy. See
`LEARNINGS.md` for the flat-config specifics (why `scripts/` needs an explicit `--dir`
flag, why `.cjs` files need `sourceType: 'script'`) discovered while wiring this up.

## Static Typing via JSDoc + tsc --checkJs (v1.23.9+, issue #16)

ESLint (above) catches dead code and undefined references; it does not catch a
type-shape mismatch — a function called with an object that's missing a field, or a
field referenced under the wrong name. That second class of bug is exactly what #12
was: `lib/ssoPermissions.mjs`'s `batchSyncToSSO` read `user.status`/`user.role` for
months, silently matching zero users on every call, because the real schema (see
`lib/users.js`'s `upsertUserFromSso`) stores these as `appStatus`/`appRole`. Nothing in
this codebase — no test, no lint rule — could have caught that; a structural type
checker can, at commit time, with zero runtime cost.

`jsconfig.json` (`checkJs: true`, `allowJs: true`, `noEmit: true`, `strict: false`)
scopes `tsc`'s checker to `lib/**/*.js` and `pages/**/*.js`, without migrating any file
to `.ts` — this repo's source stays 100% `.js`/`.mjs`; types live entirely in JSDoc
comments and one typedef-only module, `lib/types.js` (`UserDoc`, `OrgDoc`, `CardDoc`,
`SessionPayload`). Full `@param`/`@returns` coverage is scoped to six modules —
`lib/users.js`, `lib/permissions.js`, `lib/ssoPermissions.js`, `lib/session.js`,
`lib/org.js`, `lib/db.js` — the ones most implicated in this program's audit findings;
`pages/**` is still checked (for cross-boundary errors when it calls into a now-typed
`lib/` function) but not deliberately annotated, an intentionally incremental scope
matching #16's Non-Goals.

**The boundary-cast problem and its one convention:** the MongoDB driver's own return
types (`Collection.findOne()`, `.find().toArray()`, etc.) are effectively untyped —
annotating a function's `@returns` alone does not give type-checked DB reads, because
the driver result crossing into that function is still whatever the driver inferred
(usually a loose `Document`). Every read-path function in the six annotated modules
casts the driver result once, at that crossing point, with a JSDoc type assertion —
documented in full, with the `unknown`-intermediate fallback for cases tsc rejects a
direct assertion, in `lib/types.js`'s header comment. This is deliberately the *one*
casting pattern reused everywhere, not a per-function ad hoc choice.

`strict: false` is a deliberate choice, not an oversight: the installed `typescript`
package defaults `strict` to `true`, but #16's Non-Goals explicitly scope this to
default strictness (`checkJs` catching real shape mismatches) rather than full strict
mode (`strictNullChecks` and friends, which would demand a much larger annotation
effort for comparatively little of the #12-class payoff) — a possible future
incremental step, not required here. See `WARP.md`'s Quality Gate section for the
`npm run typecheck` command and the JSDoc/boundary-cast convention to follow in new
`lib/` code, and `LEARNINGS.md` for the environment-specific gotchas discovered while
wiring this up (jsconfig.json vs. tsconfig.json CLI discovery, styled-jsx typing, and
more).
