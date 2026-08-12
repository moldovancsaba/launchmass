# launchmass

**Version: 1.23.14**

![Version](https://img.shields.io/badge/version-1.23.14-blue)

launchmass is a multi-tenant, mobile-first card-grid platform: each organization gets
its own public grid of oversized launcher cards (with tags, backgrounds, and custom
branding) plus an OAuth-authenticated admin panel for managing them, gated by an
organization-scoped role/permission system. The UI runs on a SEYU brand identity
(design tokens in `styles/globals.css`) with an incremental migration onto the
Sovereign Squad General Design System (GDS) for new components. Admin access is
SSO-only (`sso.doneisbetter.com`), and Google Analytics tracking only loads after
explicit visitor consent.

Note: The global bottom info bar is automatically suppressed on admin routes (`/admin`)
to keep the admin UI uncluttered.

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

Admin routes (`/admin`, `/settings`, `/organization/[slug]/admin`) require a live OAuth
session and only work on `*.doneisbetter.com` hosts — see [Authentication](#authentication)
below. Public pages (`/`, `/organization/[slug]`) run fine on `localhost`.

## Core Concepts

### Organizations

launchmass is multi-tenant: every card belongs to exactly one organization
(`orgUuid`), and every request that touches cards must resolve an organization
context via the `X-Organization-UUID` header (preferred) or `?orgUuid=`/slug fallback
(`lib/org.js`). Each organization has its own slug, display name, description, and a
custom background (solid color or CSS gradient) used to theme its public grid.

- Public grid: `GET /organization/[slug]` — optional `?tag=` filter.
- Org-scoped admin: `GET /organization/[uuid]/admin` — a path-based alias into the
  admin panel, pre-selecting that organization.
- Organization CRUD (create/edit/delete/set-default) lives at `/settings`.

### Roles & Permissions

Authorization is organization-scoped and separate from authentication: having a valid
SSO login (`withSsoAuth`) proves *who* you are, not what you're allowed to do in a
given organization. Every mutating API route that acts on an organization is gated by
`lib/permissions.js`'s `hasOrgPermission`, composed via `withOrgPermission` in
`lib/auth-oauth.js`.

- **System roles** — `admin` and `user` — are hardcoded in `lib/permissions.js` for
  fast, DB-free lookups. `admin` has full org, card, member, role, and tag
  permissions; `user` has read/write access to cards but not org, member, or role
  administration.
- **Permission matrix** — 18 granular permissions across five resources: `org.*`
  (read/write/delete), `cards.*` (read/create/update/delete/reorder), `members.*`
  (read/invite/remove/edit_roles), `roles.*` (read/write), `tags.*` (read/write).
- **Custom roles** — the `organizationRoles` collection and `getOrgRole()` can load
  per-organization custom roles with an arbitrary permission subset, cached with a
  5-minute TTL. This data-layer support has shipped since v1.18.0; a dedicated role-
  management UI (`/settings/roles`) is still a planned Phase 2 item — see
  `PERMISSIONS_DESIGN.md`.
- **Super admin** — `isSuperAdmin(user)` bypasses all organization-level checks
  entirely. Separate from the app-level `admin`/`superadmin` `appRole` used to gate
  the app-wide `/admin/users` panel (`isAppAdmin()` checks either).
- A denied permission check returns `403` with the specific permission that was
  missing; a request with no resolvable organization context returns `400`.

### Cards

A card is the unit of content shown on an organization's grid: a label, a link, an
optional background and tag list, and a manual sort order. Card CRUD and reordering
are all organization-scoped and permission-gated:

- `GET /api/cards` — public once an organization context is resolved (no session
  required); `400` without one.
- `POST /api/cards` — requires `cards.create` in the target org.
- `PATCH` / `DELETE /api/cards/[id]` — require `cards.update` / `cards.delete`.
- `POST /api/cards/reorder` — requires `cards.reorder` (admin-only in the system role
  matrix).

The admin panel (`/admin`) manages cards for whichever organization is selected in its
org switcher, with drag-and-drop reordering, inline editing, tag autocomplete, and a
structured background editor (solid color or multi-stop gradient, with a raw-CSS
fallback mode) — see `ARCHITECTURE.md`'s "Structured Background Editor" section for
the full mode-detection and validation behavior.

## Authentication

### OAuth 2.0 / SSO (v1.7.0+)

**Admin access requires OAuth 2.0 authentication via `sso.doneisbetter.com`.**

**Critical:** Admin features only work on `*.doneisbetter.com` hosts (production:
`launchmass.doneisbetter.com`) — SSO sets its session cookie scoped to
`.doneisbetter.com` by default, and browsers won't send it to `localhost`. Localhost
admin access is not possible; public pages are unaffected.

**Authentication flow** (`lib/auth-oauth.js`):
1. Visit an admin route (e.g. `/admin`) without a valid session.
2. Server-side (`getServerSideProps`) calls `validateSsoSession(req)`, which finds no
   `sso_session` cookie (or an invalid/expired/tampered one) and redirects to SSO's
   authorization endpoint.
3. Sign in at SSO; SSO redirects back to `/api/oauth/callback` with an authorization
   code, which is exchanged for tokens.
4. The tokens and a snapshot of the user's app role/status are stored in an
   **HMAC-signed** `sso_session` cookie (`lib/session.js`; verified, not merely
   base64-decoded, on every read — a forged or tampered cookie is rejected).
5. The user is synced into MongoDB's `users` collection (`upsertUserFromSso`).
6. On every subsequent request, `validateSsoSession` re-reads `appRole`/`hasAccess`/
   `appStatus` from MongoDB — **not** from the cookie's copies — so an admin-side
   access revocation takes effect on the user's very next request regardless of what
   the still-validly-signed cookie says.

**Authorization layering:**
- `withSsoAuth` — proves a valid, non-revoked session exists. Used alone only for
  routes that don't act on a specific organization.
- `requireAdminRole` — composes with `withSsoAuth` to additionally require
  `isAppAdmin(req.user)` (app-level `admin`/`superadmin` role, or the `isSuperAdmin`
  flag). Gates `/admin/users` and its API routes.
- `withOrgPermission(permission, handler)` — composes authentication with an
  organization-scoped permission check (see [Roles & Permissions](#roles--permissions)
  above). This is the only correct way to gate a mutating route that acts on an
  organization; `withSsoAuth` alone is not sufficient.

**Other features:**
- Client-side session monitoring every 5 minutes, with automatic redirect to SSO login
  on expiration.
- Comprehensive audit logging (`authLogs` collection) of every auth attempt.
- SSO permission synchronization — an admin can batch-push local role state to the
  central SSO system (`lib/ssoPermissions.js`, `/admin/users`' "Batch sync" action).

**For development/testing:** use a Vercel preview deployment on a `*.doneisbetter.com`
subdomain, or work against public (non-admin) routes on `localhost`.

**See [AUTH_CURRENT.md](AUTH_CURRENT.md) for the complete, authoritative authentication
reference** (session internals, cookie domain handling, revocation semantics).

## Admin Workflow

1. **Sign in** — visit `/admin` (or any admin route); an unauthenticated visit
   redirects through SSO and back.
2. **Create an organization** — `/settings` → the Organizations form (name, slug,
   description, background, optional "use slug as public URL"). The creator becomes
   that organization's first member.
3. **Manage cards** — `/admin`, using the organization switcher to pick which org
   you're editing (or land directly on one via `/organization/[uuid]/admin`). Add,
   edit, reorder (drag-and-drop), tag, and set backgrounds for cards; changes are
   permission-checked per the matrix above.
4. **Manage organization membership** — org membership records live in the
   `organizationMembers` collection and are managed via
   `/api/organizations/[uuid]/members` (list/invite/remove/change role); there is no
   dedicated membership-management page yet, only the API and the read-only role badge
   shown per organization on `/settings`.
5. **Manage app-level users and access** — `/admin/users` (app admins/superadmins
   only): approve or deny pending sign-ups, grant/revoke access, change a user's
   app-wide role (`user`/`admin`), and batch-sync permissions to SSO.

## Environment Variables

Copy [`.env.example`](.env.example) to `.env.local` and fill in real values — it is the
authoritative, up-to-date list (database connection, OAuth client credentials, session
signing secret, optional debug flags) with inline comments for every variable. Don't
duplicate that list here; see also `ARCHITECTURE.md`'s "Environment Configuration"
section for how each variable is used at runtime, and `AUTH_CURRENT.md` for the
auth-specific ones.

## Also in this codebase

A few things worth knowing exist, even though they're not this README's focus (see the
docs below for detail):

- **Guided tour** (`lib/tour/*`, `components/tour/TourOverlay.jsx`) — an optional
  spotlight walkthrough of the hamburger menu, manually triggered, "seen" state
  persisted in `localStorage`.
- **GDS component adoption** — select UI surfaces (tag chips, the structured
  background editor, empty/error states, the analytics consent banner) are built on
  `@sovereignsquad/gds-core`/`gds-theme`, vendored at `6.0.0` (`vendor/gds/*.tgz`); the
  rest of the UI remains Material-UI/plain SEYU CSS.
- **Consent-gated Google Analytics** — `gtag.js` only loads after a visitor accepts a
  cookie-consent banner; the decision is remembered in `localStorage` and can be
  changed anytime via a persistent "Cookie preferences" control.
- **Static analysis as the test substitute** — automated tests are deliberately not
  used in this repo (see `WARP.md`); ESLint and `tsc --checkJs` (over JSDoc-typed
  `lib/`/`pages/` code) are the standing quality gate instead, alongside a
  secret-scanning guard (`npm run scan-secrets`) on staged/tracked files.

## Documentation

### Essential Guides
- [AUTH_CURRENT.md](AUTH_CURRENT.md) - **OAuth 2.0 authentication guide** (authoritative)
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and components
- [PERMISSIONS_DESIGN.md](PERMISSIONS_DESIGN.md) - Custom role system design (Phase 2: Q2 2026)
- [TASKLIST.md](TASKLIST.md) - Active tasks and completed work
- [ROADMAP.md](ROADMAP.md) - Development plans
- [RELEASE_NOTES.md](RELEASE_NOTES.md) - Version history
- [LEARNINGS.md](LEARNINGS.md) - Development insights and patterns

### Development Resources
- [WARP.md](WARP.md) - Dev commands and project rules
- [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) - Standing operating rules for AI coding agents in this repo
- [WARP.DEV_AI_CONVERSATION.md](WARP.DEV_AI_CONVERSATION.md) - Timestamped planning log
- [docs/archive/](docs/archive/) - Historical documentation
