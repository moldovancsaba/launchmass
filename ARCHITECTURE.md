# System Architecture - launchmass

**Version: 1.23.5**

## Overview

launchmass is a Next.js application featuring a mobile-first grid interface with administrative capabilities and integrated analytics tracking.

## Core Components

### Frontend Layer

#### Next.js Framework (v15.5.9)
- **Role**: Application framework and server-side rendering
- **Dependencies**: React 19.1.1, React-DOM 19.1.1
- **Status**: Active - Core application foundation

#### Document Structure (`pages/_document.js`)
- **Role**: Custom HTML document with Google Analytics integration
- **Dependencies**: next/document components
- **Status**: Active - Analytics tracking enabled
- **Configuration**: 
  - Google Analytics tracking ID: G-HQ5QPLMJC1
  - gtag.js implementation via document head injection
  - Async script loading for optimal performance

#### Application Wrapper (`pages/_app.js`)
- **Role**: Global application wrapper with background and branding
- **Dependencies**: Global CSS styles
- **Status**: Active - Visual foundation layer
- **Info Bar Behavior**: The global bottom info bar is suppressed on all `/admin` routes via conditional rendering (useRouter path check).

### Page Components

#### Main Interface (`pages/index.js`)
- **Role**: Primary card grid display with server-side rendering
- **Dependencies**: MongoDB data fetching, OversizedLink component
- **Status**: Active - Primary user interface
#### Admin Interface (`pages/admin/index.js`)
- **Role**: Administrative panel for card management
- **Dependencies**: Material-UI components, drag-and-drop functionality, OAuth authentication
- **Status**: Active - Content management system
- **Authentication**: Server-side rendering with OAuth session validation via `getServerSideProps`
- **Session Monitoring**: Client-side 5-minute interval checks with auto-redirect on expiration
- **Features**: Drag-and-drop card reordering, inline editing, organization selector

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

#### Google Analytics (gtag.js)
- **Role**: User behavior tracking and analytics collection
- **Dependencies**: Google Tag Manager CDN
- **Status**: Active - Analytics tracking enabled
- **Implementation**: 
  - Injected via Next.js _document.js for consistent coverage
  - Async loading to prevent performance impact
  - Configured with tracking ID G-HQ5QPLMJC1

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

**Server-Side (`lib/ssoPermissions.mjs`) - v1.13.0+:**
- SSO permission synchronization helper
- Syncs launchmass permissions to central SSO system
- Unified access control across all applications

**Server-Side (`lib/analytics.js`) - v1.18.0+:**
- Event logging system with async batching (50 events / 5 seconds)
- Prevents blocking API responses (fire-and-forget pattern)
- Event types: card_click, card_create, card_update, card_delete, admin_action, user_login, org_create/update/delete, role events
- Retry logic with exponential backoff (max 10 retries)
- Graceful shutdown handling (SIGTERM/SIGINT)
- Helper functions:
  - `logEvent(type, data)` - Queue event for async batch write
  - `logCardClick(cardId, orgUuid, userId, href)` - Convenience wrapper
  - `logAdminAction(action, orgUuid, userId, details)` - Convenience wrapper
  - `getQueueStatus()` - Get current queue metrics
  - `flushAndShutdown()` - Flush events before process exit
- Performance: Reduces DB load by 98% (100 writes/sec → 2 writes/sec)

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
5. **Analytics Tracking**: All page views and interactions tracked via Google Analytics
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
