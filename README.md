# launchmass

![Version](https://img.shields.io/badge/version-1.5.0-blue)

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

### SSO Integration (v1.5.0+)

**Admin access requires SSO authentication via sso.doneisbetter.com**

**Important**: Admin features only work on **launchmass.doneisbetter.com** (production) due to SSO cookie domain requirements. Localhost admin access is not available.

**Admin Login Flow:**
1. Visit `https://launchmass.doneisbetter.com/admin`
2. You'll be redirected to SSO login at sso.doneisbetter.com
3. Sign in with your SSO credentials (or create account)
4. First-time login automatically grants admin rights
5. You'll be redirected back to the admin interface

**Features:**
- Server-side session validation on every admin page load
- Client-side session monitoring (5-minute intervals)
- Automatic logout on session expiration
- User info displayed in admin header (name/email)
- Comprehensive audit logging in MongoDB

**For Development/Testing:**
- Use Vercel preview deployments with *.doneisbetter.com subdomain
- Public pages work fine on localhost (non-admin routes)

## Documentation

### Organizations
- Organization context is required for admin writes and recommended for reads.
- Headers:
  - X-Organization-UUID (preferred)
  - X-Organization-Slug (fallback)
- Public route: `/organization/[slug]` with optional `?tag=` filtering.
- Admin usage:
  1) Login via SSO (redirected automatically from /admin)
  2) Click "Refresh orgs" and select an organization from the dropdown
  3) All admin actions (Add, Edit, Delete, Reorder) now apply to the selected org
- Optional path-based admin per organization: `/organization/[id]/admin` — pre-scoped admin UI for the org
- Organizations management: available under `/settings` (Organizations section) — create, edit (name/slug/description), and soft-delete organizations (requires SSO authentication)

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and component overview
- [SSO_IMPLEMENTATION.md](SSO_IMPLEMENTATION.md) - Complete SSO authentication guide
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Production deployment checklist
- [TASKLIST.md](TASKLIST.md) - Active development tasks and priorities
- [ROADMAP.md](ROADMAP.md) - Future development plans and milestones
- [RELEASE_NOTES.md](RELEASE_NOTES.md) - Version history and changelog
- [LEARNINGS.md](LEARNINGS.md) - Development insights and lessons learned
- [WARP.md](WARP.md) - AI development guidance and project rules
- [WARP.DEV_AI_CONVERSATION.md](WARP.DEV_AI_CONVERSATION.md) - Timestamped planning log
