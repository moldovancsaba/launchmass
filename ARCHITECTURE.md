# System Architecture - launchmass

**Version: 1.17.0**

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

#### API Routes (`pages/api/`)
- **Role**: RESTful API endpoints for data operations
- **Dependencies**: Next.js API routes, MongoDB integration, SSO authentication middleware
- **Status**: Active - Data management interface
- **Authentication**: All write operations protected by `withSsoAuth` middleware (v1.5.0+)
- **Endpoints**:
  - `/api/cards/` - CRUD operations for card management (POST protected)
  - `/api/cards/[id]` - Individual card operations (PATCH/DELETE protected)
  - `/api/cards/reorder` - Bulk reordering functionality (protected)
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
  - `/api/cards` and related endpoints — org-aware
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
- `hasOrgPermission(user, orgUuid, permission)` - Check specific permission
- `ensureOrgPermission(user, orgUuid, permission)` - Throws error if no permission
- Permission matrix: cards.read/write/delete, org.read/write/delete, members.read/write

**Server-Side (`lib/ssoPermissions.mjs`) - v1.13.0+:**
- SSO permission synchronization helper
- Syncs launchmass permissions to central SSO system
- Unified access control across all applications

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

**OAuth 2.0 Authentication (v1.7.0+):**
- **SSO_SERVER_URL**: SSO service URL (https://sso.doneisbetter.com)
- **SSO_CLIENT_ID**: OAuth client ID from SSO admin panel
- **SSO_CLIENT_SECRET**: OAuth client secret (server-side only, sensitive)
- **SSO_REDIRECT_URI**: OAuth callback URL (https://launchmass.doneisbetter.com/api/oauth/callback)
- **NEXT_PUBLIC_SSO_SERVER_URL**: Client-accessible SSO URL
- **NEXT_PUBLIC_SSO_CLIENT_ID**: Public client ID for client-side OAuth redirects
- **NEXT_PUBLIC_SSO_REDIRECT_URI**: Public OAuth callback URL

**Legacy (Deprecated in v1.7.0):**
- ~~**SSO_COOKIE_DOMAIN**: Cookie domain for SSO~~ (v1.5.0 cookie-forwarding approach)
- ~~**SSO_LOGIN_PATH**: SSO login path~~ (v1.5.0 cookie-forwarding approach)
- ~~**SSO_LOGOUT_PATH**: SSO logout path~~ (v1.5.0 cookie-forwarding approach)
- ~~**ADMIN_TOKEN**: Administrative authentication token~~ (Removed in v1.5.0)

**Other:**
- **BASE_URL**: Application base URL for seeding operations
