# Release Notes - launchmass

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
