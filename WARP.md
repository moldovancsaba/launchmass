# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

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
├── auth.js                  # Legacy SSO session validation (cookie-based)
├── auth-oauth.js            # OAuth 2.0 SSO authentication
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
3. Valid session → server syncs user to local MongoDB with `isAdmin: true` on first login
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
- OAuth-based SSO authentication with automatic admin rights on first login
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
- OAuth authentication flow in `lib/auth-oauth.js` and `lib/auth.js`
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
3. **Cookie Validation**: Server reads base64-encoded `sso_session` HttpOnly cookie
4. **User Sync**: Valid sessions trigger `upsertUserFromSso()` to create/refresh user data
5. **Audit Logging**: All authentication attempts logged to `authLogs` collection
6. **Page Render**: Valid sessions render admin interface; invalid redirects to SSO authorization endpoint

### Key Rules
- **Authentication Method**: OAuth 2.0 authorization code flow with HttpOnly cookies (Domain=.doneisbetter.com)
- **Localhost Limitation**: Admin features DO NOT work on localhost due to cookie domain mismatch
- **Development Testing**: Use Vercel preview deployments with *.doneisbetter.com subdomain
- **Public Pages**: Non-admin routes work fine on localhost (no SSO required)
- **User Management**: First OAuth login automatically grants admin rights via `users` collection
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
```

**For detailed implementation:** See `SSO_IMPLEMENTATION.md`, `OAUTH_MIGRATION_v1.6.0.md`, and `DEPLOYMENT_GUIDE.md`
