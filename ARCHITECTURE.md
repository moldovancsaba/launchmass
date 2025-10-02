# System Architecture - launchmass v1.5.0

## Overview

launchmass is a Next.js application featuring a mobile-first grid interface with administrative capabilities and integrated analytics tracking.

## Core Components

### Frontend Layer

#### Next.js Framework (v15.5.4)
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
- **Dependencies**: Material-UI components, drag-and-drop functionality, SSO authentication
- **Status**: Active - Content management system
- **Authentication**: Server-side rendering with SSO session validation via `getServerSideProps`
- **Session Monitoring**: Client-side 5-minute interval checks with auto-redirect on expiration

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
  - `cards` - Card content and metadata
  - `organizations` - Organization management
  - `users` - SSO user persistence and admin rights (v1.5.0+)
  - `authLogs` - Authentication audit trail (v1.5.0+)

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
  - `/api/auth/validate` - Client-side session validation proxy

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
  - Fields: uuid (UUIDv4), name, slug (unique, lowercase), description, isActive (bool), createdAt, updatedAt
  - Indexes: { slug: 1, unique: true }, { uuid: 1, unique: true }, { isActive: 1 }
- Cards (existing):
  - Added: orgUuid (authoritative), orgSlug (denormalized)
  - Indexes: { orgUuid: 1, order: 1 }, optionally { orgUuid: 1, tags: 1 }

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

### Admin Flow
- /admin includes an org selector. Save ADMIN_TOKEN, refresh orgs, select org. All admin writes require org context.

#### Google Analytics (gtag.js)
- **Role**: User behavior tracking and analytics collection
- **Dependencies**: Google Tag Manager CDN
- **Status**: Active - Analytics tracking enabled
- **Implementation**: 
  - Injected via Next.js _document.js for consistent coverage
  - Async loading to prevent performance impact
  - Configured with tracking ID G-HQ5QPLMJC1

## Authentication System (v1.5.0+)

### SSO Integration Architecture

#### Authentication Flow
1. **Admin Page Access**: User visits `/admin` on launchmass.doneisbetter.com
2. **Server-Side Validation**: `getServerSideProps` calls `validateSsoSession(req)`
3. **Cookie Forwarding**: Server forwards cookies to `https://sso.doneisbetter.com/api/sso/validate`
4. **SSO Validation**: SSO service validates HttpOnly session cookie
5. **User Response**: SSO returns `{ isValid: true/false, user: { id, email, name, role, permissions } }`
6. **User Persistence**: Valid sessions trigger `upsertUserFromSso()` to sync user data
7. **Audit Logging**: All auth attempts logged via `recordAuthEvent()` to `authLogs` collection
8. **Page Rendering**: Valid sessions render admin interface; invalid sessions redirect to SSO login

#### Components

**Server-Side (`lib/auth.js`):**
- `validateSsoSession(req)` - Forwards cookies to SSO, syncs users, logs events
- `withSsoAuth(handler)` - Middleware wrapper for API route protection
- Returns 401 for invalid sessions, attaches `req.user` for valid sessions

**Server-Side (`lib/users.js`):**
- `getUsersCollection()` - Returns MongoDB users collection with auto-indexing
- `upsertUserFromSso(ssoUser)` - Creates/updates user records, sets `isAdmin: true` on insert only
- `recordAuthEvent(data)` - Writes auth attempts to audit log with IP and user agent

**Client-Side:**
- Session monitoring every 5 minutes via `/api/auth/validate` proxy
- Auto-redirect to SSO login on session expiration
- User info display (name/email) in admin header
- Logout button redirects to SSO logout endpoint

#### Database Schema

**users Collection:**
```javascript
{
  ssoUserId: String,        // Unique - from SSO user.id
  email: String,
  name: String,
  ssoRole: String,          // From SSO user.role
  isAdmin: Boolean,         // Set to true on insert only (future-proof for RBAC)
  localPermissions: Object, // Empty object, reserved for future use
  lastLoginAt: String,      // ISO 8601 with milliseconds
  createdAt: String,        // ISO 8601 with milliseconds
  updatedAt: String         // ISO 8601 with milliseconds
}
// Indexes: { ssoUserId: 1 } unique, { email: 1 }
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

**Session Management:**
- HttpOnly cookies prevent client-side JavaScript access
- Server-side forwarding required for cookie validation
- Sessions validated on both server (SSR) and client (periodic monitoring)
- Expired sessions trigger automatic redirect to SSO login

**Security Features:**
- No bearer tokens or client-side secret storage
- Comprehensive audit logging of all auth attempts
- IP address and user agent tracking for security analysis
- Server-side session validation prevents client tampering

## Data Flow

1. **Main Application**: Server-side rendering fetches cards from MongoDB → renders grid interface
2. **Admin Operations**: SSO-authenticated users perform CRUD operations through protected API routes
3. **Analytics Tracking**: All page views and interactions tracked via Google Analytics
4. **Authentication**: SSO-based session validation with automatic user sync and audit logging

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

**SSO Authentication (v1.5.0+):**
- **SSO_SERVER_URL**: SSO service URL (https://sso.doneisbetter.com)
- **SSO_COOKIE_DOMAIN**: Cookie domain for SSO (.doneisbetter.com)
- **SSO_LOGIN_PATH**: SSO login path (/)
- **SSO_LOGOUT_PATH**: SSO logout path (/logout)
- **NEXT_PUBLIC_SSO_SERVER_URL**: Client-accessible SSO URL
- **NEXT_PUBLIC_SSO_LOGIN_PATH**: Client-accessible login path
- **NEXT_PUBLIC_SSO_LOGOUT_PATH**: Client-accessible logout path

**Legacy (Deprecated in v1.5.0):**
- ~~**ADMIN_TOKEN**: Administrative authentication token~~ (Removed - use SSO)

**Other:**
- **BASE_URL**: Application base URL for seeding operations
