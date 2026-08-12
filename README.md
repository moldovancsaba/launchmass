# launchmass

**Version: 1.23.6**

![Version](https://img.shields.io/badge/version-1.23.6-blue)

Mobile-first grid of oversized buttons with a simple JSON-driven admin page. Features Google Analytics tracking and centralized SSO authentication.

Note: The global bottom info bar is automatically suppressed on admin routes (/admin) to keep the admin UI uncluttered.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (public pages only)
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Authentication

### OAuth 2.0 Integration (v1.7.0+)

**Admin access requires OAuth 2.0 authentication via sso.doneisbetter.com**

**Critical:** Admin features ONLY work on **launchmass.doneisbetter.com** (production) due to OAuth cookie domain requirements. Localhost admin access is NOT possible.

**Authentication Flow:**
1. Visit `https://launchmass.doneisbetter.com/admin`
2. Redirected to OAuth authorization at sso.doneisbetter.com
3. Sign in with SSO credentials (email + token or password)
4. OAuth callback exchanges authorization code for tokens
5. Tokens stored in HttpOnly session cookie
6. User auto-synced to MongoDB with role/permissions
7. Redirected back to admin interface

**Features:**
- OAuth 2.0 Authorization Code flow with OpenID Connect
- HttpOnly cookies with 24-hour expiration
- Server-side session validation (SSR)
- Client-side session monitoring (5-minute intervals)
- Automatic re-authentication on expiration
- User management with role-based access control
- SSO permission synchronization (v1.13.0)
- Comprehensive audit logging

**For Development/Testing:**
- Use Vercel preview deployments with *.doneisbetter.com subdomain
- Public pages work on localhost (non-admin routes)

**See AUTH_CURRENT.md for complete authentication documentation.**

## Key Features

### Organizations (v1.3.1+)
- Multi-tenant architecture with organization-scoped data
- Organization context via X-Organization-UUID header or query parameter
- Public route: `/organization/[slug]` with optional `?tag=` filtering
- Optional path-based admin: `/organization/[id]/admin` for org-scoped management
- Custom backgrounds per organization (v1.12.0)
- Organization management in `/settings` page

### User Management (v1.7.0+)
- Admin interface at `/admin/users` for access control
- Role-based permissions (user/admin)
- Organization membership management
- SSO permission synchronization (v1.13.0)
- User status workflows (active/pending/suspended)
- Comprehensive audit logging

### Admin Interface (v1.7.0+)
- OAuth 2.0 authenticated admin panel
- Drag-and-drop card reordering
- Inline card editing
- Organization selector
- Tag management with autocomplete
- Hamburger menu navigation (v1.11.0)
- Mobile-responsive design

### Guided Tour (v1.19.0)
- Spotlight-and-tooltip walkthrough of the hamburger menu, reachable via "❓ Guided tour"
- Steps adapt to auth state: Home always shown, Admin/Organizations/Manage Users once signed in, Login when not
- Same tour engine (`lib/tour/*`, `components/tour/TourOverlay.jsx`) as camera, messmass, and fanmass, built on `@sovereignsquad/gds-core`'s `OverlayManagerProvider`
- "Seen" state persisted in `localStorage`, replay anytime from the same menu item

### Tag Chips (v1.20.0, GDS pilot; bumped to 6.0.0 in v1.22.0)
- Card tag pills (`components/OversizedLink.jsx`) and the active-filter bar (`pages/index.js`) now render via `@sovereignsquad/gds-core`'s `ChoiceChip`, replacing the legacy `.tag-chip` CSS class on those two surfaces
- `@sovereignsquad/gds-core`/`gds-theme` are vendored at `6.0.0` (`vendor/gds/*.tgz`, `file:` dependency) — the only version ever published anywhere is `3.9.0`, so this is a self-built pilot, not a registry install; see `LEARNINGS.md`

## Documentation

### Essential Guides
- [AUTH_CURRENT.md](AUTH_CURRENT.md) - **OAuth 2.0 authentication guide** (authoritative)
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and components (v1.23.2)
- [TASKLIST.md](TASKLIST.md) - Active tasks and completed work
- [ROADMAP.md](ROADMAP.md) - 2026 development plans
- [RELEASE_NOTES.md](RELEASE_NOTES.md) - Version history v1.0.1-v1.23.2
- [LEARNINGS.md](LEARNINGS.md) - Development insights and patterns
- [PERMISSIONS_DESIGN.md](PERMISSIONS_DESIGN.md) - Custom role system design (Q2 2026)

### Development Resources
- [WARP.md](WARP.md) - AI agent development guidance and project rules
- [WARP.DEV_AI_CONVERSATION.md](WARP.DEV_AI_CONVERSATION.md) - Timestamped planning log
- [docs/archive/](docs/archive/) - Historical documentation (v1.5.0-v1.6.0 auth)
