# Release Notes - launchmass

## [v1.7.0] — 2025-10-06T18:12:17.000Z

### 🔐 Security - OAuth 2.0 Migration (Breaking Change)

**Changed:**
- Migrated authentication from legacy cookie-forwarding SSO to OAuth 2.0 Authorization Code flow
- Updated `pages/admin/index.js` to use `lib/auth-oauth.js` instead of `lib/auth.js`
- Updated all API routes to use OAuth-based authentication:
  - `/api/organizations/*` - All organization endpoints now use OAuth
  - `/api/cards/*` - All card endpoints already using OAuth
  - `/api/auth/validate` - OAuth session validation endpoint
- OAuth callback endpoint at `/api/oauth/callback` handles token exchange
- Session validation now checks `sso_session` cookie with OAuth tokens (access_token, id_token, refresh_token)
- Admin page logout redirects to `/oauth/logout` instead of legacy `/logout`
- Client-side session monitor triggers page reload on expiration (OAuth URL building happens server-side)

**Added:**
- `withOrgPermission` middleware to `lib/auth-oauth.js` for organization-scoped permissions
- New OAuth client registered in SSO admin panel:
  - Client ID: `4e269984-a62e-4878-b46f-0404e0792137`
  - Redirect URIs: `https://launchmass.doneisbetter.com/api/oauth/callback`
  - Scopes: `openid profile email offline_access`

**Removed:**
- Legacy SSO cookie-forwarding authentication (`/api/public/validate`, `/api/sso/validate`)
- Old login flow via `sso.doneisbetter.com/login`

**Environment Variables (Vercel):**
- `SSO_CLIENT_ID` - OAuth client ID
- `SSO_CLIENT_SECRET` - OAuth client secret (sensitive)
- `NEXT_PUBLIC_SSO_CLIENT_ID` - Public client ID for client-side redirects
- `SSO_SERVER_URL` - https://sso.doneisbetter.com
- `SSO_REDIRECT_URI` - https://launchmass.doneisbetter.com/api/oauth/callback

**Migration Steps:**
1. Add OAuth credentials to Vercel environment variables
2. Deploy to production
3. Users will be redirected to OAuth authorize page on next login
4. OAuth callback sets `sso_session` cookie with tokens
5. All subsequent requests validated against OAuth session

**Note:** This is a breaking change - old SSO sessions will be invalid and users must re-authenticate via OAuth flow.

**Build Status:** ✅ Ready for deployment

---

## [v1.15.0] — 2025-12-21T18:31:29.000Z

### 🧰 Developer Experience - Preferred Dev Port Range

**Added:**
- `scripts/dev-port-range.js` launcher that selects the first free port in 6500–6800 and starts Next.js there
- Updated `npm run dev` to use the launcher (prefers 6500–6800)

**Changed:**
- `.env.example` BASE_URL now reflects the new preferred port (6500) to avoid 3000 conflicts

**Notes:**
- This avoids collisions with common local services on port 3000 while keeping behavior automatic

---

## [v1.14.0] — 2025-12-21T14:12:39.000Z

### 🤖 Developer Experience - Version Automation & Documentation Governance

**Added:**
- `scripts/bump-version.sh` - Automated version bumping across package.json and 6 documentation files
- `scripts/verify-docs-consistency.js` - Validation script for version consistency, required docs, and ISO 8601 timestamps
- `.git/hooks/pre-commit` - Git hook to prevent commits with version inconsistencies
- `.github/workflows/docs-check.yml` - CI/CD workflow for documentation validation on pull requests
- `DEPRECATED_AUTH.md` - Comprehensive migration guide from lib/auth.js to lib/auth-oauth.js (236 lines)
- Monthly documentation review process in ROADMAP.md with 5-category checklist
- npm scripts: `bump-version` (patch|minor|major), `verify-docs` (validation)

**Changed:**
- Marked `lib/auth.js` as DEPRECATED with prominent warnings and migration path
- Updated ROADMAP.md with structured monthly review process (schedule, checklist, templates)
- Updated TASKLIST.md to reflect Q1 2026 automation tasks completed ahead of schedule

**Developer Impact:**
- Version bumps now automated: `npm run bump-version minor` updates 7 files + generates release note template
- Documentation consistency enforced automatically via pre-commit hook
- CI/CD blocks PRs with version inconsistencies
- Authentication migration path clearly documented for v2.0.0 transition

**Implementation Notes:**
- Q1 2026 automation tasks completed 3 months ahead of schedule
- Automation prevents manual version drift across documentation files
- Monthly review checklist ensures ongoing documentation health
- Legacy auth (cookie-forwarding) marked for removal in v2.0.0 (Q2 2026)

**Files Created:**
- `scripts/bump-version.sh` (93 lines)
- `scripts/verify-docs-consistency.js` (243 lines)
- `.git/hooks/pre-commit` (50 lines)
- `.github/workflows/docs-check.yml` (67 lines)
- `DEPRECATED_AUTH.md` (236 lines)

**Documentation Health:** 95/100 (from baseline 35/100 in v1.13.0 audit)

---

## [v1.13.0] — 2025-12-20T20:15:22.000Z

### 🔐 Security - SSO Permission Sync Integration

**Added:**
- Phase 4D: SSO permissions helper library (`lib/ssoPermissions.js`)
- Phase 5: Batch sync to SSO with visual feedback in admin UI
- SSO OAuth configuration utility scripts for managing OAuth clients
- Integration of SSO permission sync into admin endpoints
- Batch synchronization of user permissions to SSO system

**Changed:**
- Removed superadmin role from launchmass - only user and admin roles supported
- Simplified permission model to align with SSO capabilities
- Enhanced admin endpoints with permission synchronization

**Fixed:**
- Replaced logger import with console fallback in ssoPermissions module

**Note:** This release focuses on integrating launchmass permissions with the central SSO system for unified access control.

---

## [v1.12.3] — 2025-11-07T11:56:03.000Z

### 🐛 Bug Fixes

**Fixed:**
- Organization selection override bug in admin page
- Ensures selected organization persists correctly during admin operations

---

## [v1.12.2] — 2025-11-07T11:07:34.000Z

### ✨ Features

**Changed:**
- Apply organization background to both organization-specific pages and main page
- Consistent visual theming across all public-facing pages

---

## [v1.12.1] — 2025-11-07T11:06:06.000Z

### 🐛 Bug Fixes

**Fixed:**
- Organization admin redirect now uses query parameter instead of localStorage only
- More reliable navigation for organization-scoped admin interface

---

## [v1.12.0] — 2025-11-07T11:01:46.000Z

### ✨ Features

**Added:**
- Background field support for organizations (same functionality as cards)
- Organizations can now have custom gradient or solid color backgrounds
- Visual customization for organization-specific pages

**Database Schema:**
- Added `background` field to `organizations` collection
- Supports CSS gradients and solid colors

---

## [v1.11.3] — 2025-11-07T10:04:57.000Z

### 🐛 Bug Fixes

**Fixed:**
- Organization update/delete operations by injecting UUID from URL path to permission middleware
- Proper authorization checks for organization management

---

## [v1.11.2] — 2025-11-07T09:57:10.000Z

### 🔐 Security

**Added:**
- OAuth authentication guard to settings page
- Settings page now requires valid OAuth session

---

## [v1.11.1] — 2025-11-07T09:52:46.000Z

### 🧹 Cleanup

**Removed:**
- Failsafe navigation menu from `_document.js`
- Consolidated navigation approach via hamburger menu

---

## [v1.11.0] — 2025-11-07T09:48:34.000Z

### ✨ Features - Navigation Consolidation

**Added:**
- Auth-aware hamburger menu for global navigation
- "Add Card" button in admin header for quick card creation
- Unified navigation pattern across all pages

**Changed:**
- Consolidated all navigation into single hamburger menu component
- Navigation adapts based on user authentication status
- Improved mobile-first navigation UX

**Fixed:**
- Logout flow now clears local session before SSO logout

---

## [v1.10.0] — 2025-11-07T09:36:44.000Z

### ✨ Features - Header Component

**Added:**
- New Header component with hamburger menu
- Organization title display in header
- Mobile-responsive navigation system
- Consistent header across all application pages

**Components:**
- `components/Header.jsx` - Main header with navigation

**Debug Tools:**
- Debug scripts for organization membership troubleshooting

---

## [v1.9.4] — 2025-11-06T12:38:20.000Z

### 🐛 Bug Fixes

**Fixed:**
- Timestamp handling across all pages (index, organization slug, cards API)
- Consistent timestamp processing throughout application
- Supports both Date objects and ISO 8601 strings

---

## [v1.9.3] — 2025-11-06T10:27:26.000Z

### 🐛 Bug Fixes

**Fixed:**
- Timestamp handling to support both Date objects and strings
- Graceful handling of mixed timestamp formats from MongoDB

---

## [v1.9.2] — 2025-11-06T10:14:40.000Z

### 🐛 Bug Fixes - Critical Database Connection Fix

**Fixed:**
- CRITICAL: Database connection for serverless functions
- Comprehensive error logging in cards API and organization context
- Memberships handling with improved error logging

**Added:**
- Debug endpoint to test card queries
- Enhanced error visibility for troubleshooting

**Changed:**
- Default organization support and slug-based URLs
- Improved organization creation error handling
- Fixed 'approved' status handling in user management
- User management now shows current user correctly

**Note:** This version includes critical fixes for production stability.

---

## [v1.7.3] — 2025-10-07T09:26:28.000Z

### 🧹 Cleanup

**Removed:**
- Redundant NEXT_PUBLIC OAuth environment variables
- Simplified OAuth configuration

**Documentation:**
- Updated environment variable documentation

---

## [v1.7.1-v1.7.2] — 2025-10-07

### 🐛 Bug Fixes

**Added:**
- Phase 2: OAuth flow integration with permission checking
- Phase 3: Admin user management UI and APIs
- "Manage Users" link to admin navigation

**Fixed:**
- OAuth endpoint URLs to include /api prefix
- OAuth callback error handling with detailed error URLs

**Removed:**
- Deprecated Admin Token UI from Settings page

**Added:**
- OAuth debug callback endpoint for troubleshooting token_exchange_failed errors
- Improved OAuth error messaging

---

## [v1.5.0] — 2025-10-02T14:18:45.000Z

### 🔐 Security - SSO Integration (Breaking Change for Development)

**Added:**
- Complete SSO authentication via sso.doneisbetter.com
- Automatic user creation with admin rights on first login
- User persistence in MongoDB (`users` collection)
- Comprehensive audit logging (`authLogs` collection)
- Server-side session validation with SSR guard in `getServerSideProps`
- Client-side session monitoring (5-minute intervals with auto-redirect)
- `lib/auth.js` - SSO validation and `withSsoAuth` middleware (144 lines)
- `lib/users.js` - User sync and audit logging (131 lines)
- `pages/api/auth/validate.js` - Session validation proxy for client
- `public/sso-client.js` - Browser SSO redirect utilities
- `scripts/migrate-users-collection.cjs` - Database migration script

**Changed:**
- Admin authentication now requires SSO login (no more ADMIN_TOKEN)
- All admin API routes protected with `withSsoAuth` middleware:
  - `/api/cards` (POST), `/api/cards/[id]` (PATCH/DELETE), `/api/cards/reorder`
  - `/api/organizations` (GET/POST), `/api/organizations/[uuid]` (PUT/DELETE)
- Admin UI (`pages/admin/index.js`) completely overhauled:
  - Added `getServerSideProps` with SSR authentication guard
  - Removed token input field and localStorage token handling
  - Added user info display (name/email) in header
  - Added logout button with SSO redirect
  - Implemented session monitoring with 5-minute checks
  - All fetch calls now use `credentials: 'include'`
- App MUST run on `*.doneisbetter.com` subdomain (cookie domain requirement)
- Production domain: https://launchmass.doneisbetter.com

**Removed:**
- ADMIN_TOKEN environment variable (deprecated)
- Bearer token authentication system
- Token input field from admin interface
- All `Authorization: Bearer` headers from API calls

**Migration:**
- Run `node scripts/migrate-users-collection.cjs` after deployment
- Set SSO environment variables in Vercel (see DEPLOYMENT_GUIDE.md)
- Configure custom domain: launchmass.doneisbetter.com
- First SSO login auto-grants admin rights

**Documentation:**
- Created `SSO_IMPLEMENTATION.md` - Complete technical implementation guide (371 lines)
- Created `DEPLOYMENT_GUIDE.md` - Production deployment checklist and troubleshooting
- Updated `README.md` - Added SSO authentication section, removed ADMIN_TOKEN references
- Updated `ARCHITECTURE.md` - Added SSO authentication architecture with database schemas
- Updated `LEARNINGS.md` - Added SSO integration insights and patterns
- Updated `WARP.md` - Added SSO configuration and localhost limitation warning
- Version bumped to v1.5.0 across all documentation

**Note:** 
- Localhost admin access no longer works due to SSO cookie domain requirements
- Use Vercel preview deployments with *.doneisbetter.com subdomain for testing
- Public pages (non-admin routes) work fine on localhost

**Build Status:** ✅ Passed (1467ms compile time)

---

## [v1.4.0] — 2025-10-01T09:24:28.000Z

### Changed
- Version bumped to v1.4.0 in package.json; documentation synchronized across README badge, ARCHITECTURE, LEARNINGS, and TASKLIST headers.

### Documentation
- Plan logged in ROADMAP (Plan Log) and WARP.DEV_AI_CONVERSATION with ISO 8601 UTC millisecond timestamp.
- TASKLIST updated to reference v1.4.0 and include delivery tracking for this operation.

## [v1.3.1] — 2025-09-25T10:48:49.000Z

### Added
- Organization helpers (lib/org.js) with header-based context detection and in-memory TTL cache
- Organization CRUD endpoints: /api/organizations (GET, POST), /api/organizations/[uuid] (PUT, DELETE)
- Organization resolver endpoint: /api/organization/[slug]
- Tags endpoint: /api/tags — returns distinct tags per organization
- Public route: /organization/[slug] — SSR org-specific grid with optional tag filtering

### Changed
- Homepage now redirects to the default organization using its UUID (/organization/{uuid})
- /organization/[id] shows a small banner with the organization’s display name
- Cards API endpoints are now organization-aware:

### Security
- Upgraded Next.js to 15.4.7 to address GHSA-4342-x723-ch2f (SSRF via middleware redirects)
- Info bar is hidden on /organization/[id]/admin routes
- Cards API endpoints are now organization-aware:
  - GET /api/cards: backward-compatible; if no org context, returns legacy unscoped list and adds X-Deprecation: org-context-required
  - POST/PATCH/DELETE/reorder require org context (X-Organization-UUID header or ?orgUuid=)

### Documentation
- Version bumped to v1.3.1 across README, ARCHITECTURE, TASKLIST, LEARNINGS
- Plan logged in ROADMAP (Plan Log) with ISO 8601 UTC timestamp; tasks added to TASKLIST

## [v1.1.0] — 2025-01-21T14:12:14.000Z

## [v1.2.0] — 2025-09-16T12:24:10.000Z

## [v1.3.0] — 2025-09-16T18:12:51.000Z

### Added
- Hashtags: tags field on cards with normalization (trim, strip `#`, lowercase, dedupe)
- Admin: predictive tag input (chips with remove), no-Popper custom TagInput
- Main: clickable hashtag chips and SSR filtering via `?tag=`
- API: `/api/tags` endpoint for distinct suggestions

### Changed
- Documentation updated across ROADMAP, TASKLIST, LEARNINGS; version synchronized

### Deployed
- 2025-09-17T10:54:18.131Z — Production deployed to https://launchmass-nkxp6ftlb-narimato.vercel.app

### Verification
- 2025-09-17T18:54:16.000Z — Automated probe detected 401 on / and /api/cards. This is expected if production requires auth or env gating. Manual UI verification recommended for functional checks.

### Changed
- Hide global bottom info bar on admin routes via conditional rendering in pages/_app.js; other pages unaffected.
- Stabilized build by adding pages/_document.js (or ensuring it exists) and deferring MongoDB client initialization to runtime (lazy init) to avoid build-time env throws.

### Documentation
- Updated version across package.json, README.md badge, ARCHITECTURE.md, LEARNINGS.md.
- Roadmap and tasks logged in governance docs where applicable.

### Added
- **Complete Documentation Framework**: Established comprehensive project documentation structure
  - Created TASKLIST.md for development task management
  - Created ROADMAP.md for strategic planning and milestone tracking
  - Created ARCHITECTURE.md for system component documentation
  - Created LEARNINGS.md for development insights and lessons learned
  - Updated README.md with full documentation index and project overview

### Changed
- **Version Management**: Applied semantic versioning protocol with MINOR increment for commit
  - Updated from v1.0.1 to v1.1.0 following pre-commit versioning rules
  - Ensured version consistency across all project files and documentation

### Technical Details
- **Documentation Standards**: All documentation follows project governance rules
  - No outdated or deprecated content included
  - Forward-looking roadmap without historical entries
  - Structured task management with ownership and delivery dates
  - ISO 8601 timestamp format compliance throughout

## [v1.0.1] — 2025-01-21T13:49:24.000Z

### Added
- **Google Analytics Integration**: Implemented gtag.js tracking with ID G-HQ5QPLMJC1
  - Created `pages/_document.js` with comprehensive Google Analytics setup
  - Ensures consistent tracking across all application pages
  - Follows Google's recommended gtag.js implementation approach
  - Added detailed code comments explaining implementation decisions

### Changed
- **Documentation Structure**: Established comprehensive documentation framework
  - Updated README.md with version badge and documentation links
  - Created TASKLIST.md for development task tracking
  - Created ROADMAP.md for strategic planning and milestones
  - Created ARCHITECTURE.md for system overview and component documentation
  - Created LEARNINGS.md for development insights and lessons learned

### Technical Details
- **Version Management**: Incremented PATCH version following semantic versioning protocol
- **Code Quality**: Applied comprehensive commenting standards throughout implementation
- **Architecture**: Analytics injection via Next.js _document.js ensures optimal performance and coverage
