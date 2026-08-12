# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

> **Agent operating rules live in `CLAUDE.md`** (branding/attribution policy, the
> Issues+labels board taxonomy, the quality gate, environment quirks discovered in
> practice, pre-authorization policy). This file covers the *project itself* — stack,
> commands, architecture, and project rules. Keep both accurate; a stale claim in either
> is a bug, not a rounding error — fix it the moment you notice it, in the same change
> set as whatever work surfaced it.

## Project Overview

**launchmass** is a Next.js application that displays a mobile-first grid of oversized buttons/cards with a JSON-driven admin interface. Each card links to external resources and can be customized with gradients/colors. The application uses MongoDB for data persistence and includes drag-and-drop sorting capabilities in the admin panel.

## Essential Development Commands

### Core Development Workflow
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

### Quality Gate (run before every push — see CLAUDE.md §3 for the full policy)
```bash
# Documentation/version consistency
npm run verify-docs

# ESLint — the test-substitute static-analysis gate (v1.23.8+, issue #15); see
# ARCHITECTURE.md's "Static Analysis as the Test Substitute" section for why this
# exists and what it deliberately does/doesn't enforce
npm run lint

# Credential-pattern guard over staged/tracked files
npm run scan-secrets

# Production build (the only one of these four that actually contacts Next.js's
# compiler — run it for anything touching routing, config, or provider setup)
npm run build
```

### Data Management
```bash
# Seed database with default cards
node scripts/seed-cards.cjs

# Run database migrations (creates collections and indexes)
node scripts/migrate-users-collection.cjs

# Environment variables required for seeding:
# MONGODB_URI - MongoDB connection string
# DB_NAME - Database name (default: launchmass)
```

### Deployment
```bash
# Deploy to Vercel production
vercel --prod
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js (React 19), ES Modules
- **Database**: MongoDB with connection pooling
- **UI Components**: Material-UI (@mui/material), @emotion
- **Drag & Drop**: @dnd-kit for admin card reordering
- **Authentication**: OAuth 2.0 SSO via sso.doneisbetter.com
- **Deployment**: Vercel (assumed from build patterns)

### Project Structure
```
pages/
├── _app.js                  # App wrapper with global background
├── index.js                 # Main page displaying card grid
├── admin/
│   ├── index.js             # Admin interface for card management
│   └── users.js             # User management for pending approvals
├── organization/
│   ├── [slug].js            # Organization-specific card grid
│   └── [slug]/admin.js      # Org-scoped admin interface
└── api/
    ├── cards/
    │   ├── index.js         # GET all cards, POST new card
    │   ├── [id].js          # PATCH/DELETE individual cards
    │   └── reorder.js       # POST bulk reorder cards
    ├── organizations/
    │   ├── index.js         # Organization CRUD
    │   └── [uuid]/members/  # Member management
    ├── admin/users/         # User approval/role management
    ├── auth/
    │   └── validate.js      # Session validation endpoint
    ├── oauth/
    │   ├── callback.js      # OAuth authorization code exchange
    │   └── callback-debug.js# Debug endpoint
    └── tags/
        └── index.js         # Tag suggestions

components/
└── OversizedLink.jsx        # Card component with gradient/color support

lib/
├── db.js                    # MongoDB connection with dev/prod pooling
├── auth-oauth.js            # OAuth 2.0 SSO authentication (lib/auth.js removed in v1.17.0)
├── org.js                   # Organization context and caching
├── permissions.js           # Role-based permission matrix
└── users.js                 # User management and admin rights

scripts/
├── seed-cards.cjs           # Database seeding script
└── migrate-users-collection.cjs  # Database migration for collections
```

### Data Flow
1. **Main Page**: Server-side rendering fetches cards from MongoDB → displays grid
2. **Admin Interface**: OAuth-authenticated users perform CRUD operations through API routes
3. **Authentication**: OAuth 2.0 flow with HttpOnly session cookies (Domain=.doneisbetter.com)
4. **Card Ordering**: Drag-and-drop updates order field in database
5. **Organizations**: Multi-tenant support with org-scoped cards and members

## Key Development Patterns

### Environment Configuration
```bash
# MongoDB Configuration
MONGODB_URI=mongodb://...          # Database connection string
DB_NAME=launchmass               # Database name (optional, defaults to 'launchmass')

# OAuth 2.0 SSO Configuration
SSO_SERVER_URL=https://sso.doneisbetter.com
SSO_CLIENT_ID=your-oauth-client-id
SSO_REDIRECT_URI=https://launchmass.doneisbetter.com/api/oauth/callback

# Client-side SSO Configuration (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_SSO_SERVER_URL=https://sso.doneisbetter.com
```

### Card Data Schema
Cards stored in MongoDB `cards` collection with fields:
- `title` - Display title
- `href` - External link URL  
- `description` - Subtitle text
- `background` - CSS gradient or color value
- `tags` - Array of tag strings for filtering
- `orgUuid` - Organization UUID reference
- `order` - Sort order (numeric)
- `createdAt/updatedAt` - ISO 8601 timestamps with milliseconds

### Authentication Pattern
Admin operations require valid OAuth session from SSO service. Authentication flow:
1. User visits `/admin` → server validates `sso_session` HttpOnly cookie
2. Invalid session → redirect to SSO authorization endpoint
3. Valid session → server syncs user to local MongoDB. Role/access on first login are decided in this precedence order (`pages/api/oauth/callback.js`): (a) if SSO already has a permission record for the user, SSO's `role`/`status` fully govern (`approved`→access granted with that role, `pending`/`revoked`/unknown→no access) — `AUTO_GRANT_ACCESS` is not consulted in this case; (b) if SSO has no record but a local `users` document already exists, that document's stored `appRole`/`hasAccess` govern; (c) only if *neither* exists (a true first-ever login) does `AUTO_GRANT_ACCESS` decide — default `true` grants `appRole: 'user'` + access immediately, `false` leaves the user pending explicit approval. First login never auto-grants **admin** under any of these paths — admin requires an explicit grant via the `admin/users/*` endpoints (or a pre-existing SSO record that already says `admin`/`superadmin`).
4. Client maintains session via 5-minute interval validation checks
5. Session expiration → auto-redirect to SSO login

### Background/Styling System
- Supports CSS gradients and solid colors
- Default gradient: `linear-gradient(90deg, rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%)`
- Admin interface parses multi-line CSS input and extracts background values

### Component Patterns
- **OversizedLink**: Handles gradient vs solid color detection
- **Admin Cards**: Inline editing with form state management
- **Drag & Drop**: Uses @dnd-kit with optimistic UI updates

## Project Rules Compliance

This project follows strict development protocols:

### Prohibited Practices
- **Tests are forbidden** - This is an MVP factory, no testing allowed
- **Breadcrumb navigation** - Explicitly prohibited in UI design
- **Hardcoded styles** - Must use centralized styling system

### Mandatory Practices
- **Comprehensive commenting** - All code must explain what it does and why
- **Strict versioning** - Follow MAJOR.MINOR.PATCH with increment rules
- **Complete documentation** - Update README.md, TASKLIST.md, RELEASE_NOTES.md, etc.
- **ISO 8601 timestamps** - Format: YYYY-MM-DDTHH:MM:SS.sssZ

### Version Management Protocol
1. **Before `npm run dev`**: Increment PATCH (+1)
2. **Before GitHub commit**: Increment MINOR (+1), reset PATCH to 0
3. **Production deployment**: Verify version consistency across all files

## Critical Development Notes

### Database Connection
- Uses connection pooling pattern for dev/production environments
- Global connection reuse in development to prevent connection exhaustion
- **Database Policy**: Always use production MongoDB for local development (no separate dev/staging DBs)
  - Timestamp: 2025-10-01T11:15:00.000Z

### Admin Interface Features
- OAuth-based SSO authentication; new users default to `user` role (auto-granted access unless `AUTO_GRANT_ACCESS=false`), admin rights require explicit approval — see Authentication section below
- Real-time card editing with optimistic updates
- Drag-and-drop reordering with bulk database updates
- Organization selector for multi-tenant card management
- User management page for approving pending users and role changes
- **CRITICAL**: Admin features DO NOT work on localhost due to cookie domain mismatch

### CSS Architecture
- Global styles in `styles/globals.css`
- Montserrat font family from Google Fonts
- Fixed gradient background with semi-transparent card overlays
- Mobile-first responsive grid layout
- CSS-in-JS with @emotion for dynamic styling

### API Design
- RESTful endpoints with proper HTTP methods
- OAuth authentication middleware via `withSsoAuth` wrapper
- Organization permission middleware via `withOrgPermission` wrapper
- Consistent error handling: 400 (missing context), 401 (auth), 403 (permission denied)
- ObjectId string conversion for client compatibility
- Bulk operations for efficiency (reorder endpoint)

## Integration Points

When working with this codebase, pay attention to:
- OAuth authentication flow in `lib/auth-oauth.js` (legacy `lib/auth.js` removed in v1.17.0)
- MongoDB connection patterns in `lib/db.js`
- Organization context resolution in `lib/org.js` (caches by slug)
- Permission matrix and role checking in `lib/permissions.js`
- Card component gradient/color logic in `components/OversizedLink.jsx`
- API route error handling with org context checks
- CSS grid responsive behavior in `styles/globals.css`
- User sync and admin rights logic in `lib/users.js`

## Database Policy — Local Development

- Rule: Always use the production MongoDB for local development (no separate dev/staging DBs).
- Rationale: Ensures data parity and identical behavior between localhost and production; avoids schema/index drift and hidden bugs.
- Scope: All contributors and all local environments.
- Security: Do not commit secrets. Use .env.local (gitignored) to store MONGODB_URI and SSO configuration.
- Operational Note: Writes must follow business rules since they affect production data.
- Timestamp: 2025-10-01T11:15:00.000Z

## Authentication — OAuth 2.0 SSO Integration (v1.6.0+)

**Critical: Admin features ONLY work on launchmass.doneisbetter.com (production subdomain)**

### OAuth 2.0 Flow
1. **Admin Page Access**: User visits `/admin` on launchmass.doneisbetter.com
2. **Server-Side Validation**: `getServerSideProps` calls `validateSsoSession(req)` from `lib/auth-oauth.js`
3. **Cookie Validation**: Server reads the HMAC-signed `sso_session` HttpOnly cookie (`lib/session.js`, `SESSION_SECRET`) — the signature is verified before any content is trusted. The cookie's *physical contents* are sensitive: `access_token`, `id_token`, `refresh_token`, and a `user` object including `appRole`/`appStatus`/`hasAccess` (all set in `pages/api/oauth/callback.js`'s call to `signSession`) — never log or print this cookie's value. What's *trusted for authorization*, however, is narrower than what it contains: `validateSsoSession` re-reads `appRole`/`hasAccess`/`appStatus` from MongoDB on every request rather than trusting the cookie's copies of those fields, so a DB-side revocation takes effect immediately regardless of what the (still-valid, still-signed) cookie says
4. **User Sync**: New/returning users are synced to the local `users` collection during the OAuth callback (`upsertUserFromSso()`); subsequent requests read the existing DB record rather than re-syncing from the cookie
5. **Audit Logging**: All authentication attempts logged to `authLogs` collection
6. **Page Render**: Valid sessions render admin interface; invalid redirects to SSO authorization endpoint

### Key Rules
- **Authentication Method**: OAuth 2.0 authorization code flow with HttpOnly cookies (Domain=.doneisbetter.com)
- **Localhost Limitation**: Admin features DO NOT work on localhost due to cookie domain mismatch
- **Development Testing**: Use Vercel preview deployments with *.doneisbetter.com subdomain
- **Public Pages**: Non-admin routes work fine on localhost (no SSO required)
- **User Management**: First OAuth login creates a `users` collection record with `appRole: 'user'` by default (see Key Rules above) — admin rights are a separate, explicit grant, never automatic
- **Audit Trail**: All authentication attempts logged in `authLogs` collection with IP/user agent
- **Session Monitoring**: Client-side 5-minute interval checks with auto-redirect on expiration
- **Legacy Auth**: ADMIN_TOKEN bearer token system removed (use OAuth 2.0 instead)
- **Timestamp**: 2025-10-02T14:18:45.000Z

### Environment Variables Required
```bash
# OAuth 2.0 Configuration
SSO_SERVER_URL=https://sso.doneisbetter.com
SSO_CLIENT_ID=your-oauth-client-id
SSO_REDIRECT_URI=https://launchmass.doneisbetter.com/api/oauth/callback

# Client-side (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_SSO_SERVER_URL=https://sso.doneisbetter.com

# MongoDB
MONGODB_URI=mongodb+srv://...
DB_NAME=launchmass

# Optional (v1.23.0+) — session cookie domain migration prep, see AUTH_CURRENT.md
# SESSION_COOKIE_DOMAIN=.doneisbetter.com
# APP_BASE_URL=https://launchmass.doneisbetter.com
```

**For detailed implementation:** See `AUTH_CURRENT.md` (authoritative auth guide) and `ARCHITECTURE.md`
