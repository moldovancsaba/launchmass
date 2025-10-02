# WARP.DEV_AI_CONVERSATION.md

- 2025-09-25T10:48:49.000Z — Plan accepted to introduce organizations in launchmass, learning from narimato without modifying it. Scope (Phase 1–3):
  - Data model additions: organizations collection (uuid, name, slug, description, isActive, timestamps); orgUuid/orgSlug on cards with indexes
  - Org context helpers: header/query detection with TTL cache; ensure org context for writes
  - Organization APIs: /api/organizations (GET, POST), /api/organizations/[uuid] (PUT, DELETE)
  - Organization resolver: /api/organization/[slug]
  - Cards API scoping: GET backward-compatible (adds X-Deprecation when no context); writes require org context
  - Rationale: Mirror narimato’s uuid+slug pattern, header-based detection, and caching; preserve backward compatibility during rollout
  - Notes: No tests; no breadcrumbs; UTC ISO 8601 with milliseconds for timestamps; ESM modules only; version bumped to v1.3.1 pre-dev per protocol

- 2025-10-01T09:24:28.000Z — Plan: bump MINOR version to v1.4.0; synchronize documentation (README badge, ARCHITECTURE, LEARNINGS, TASKLIST); add RELEASE_NOTES entry; log plan in ROADMAP and TASKLIST; run production build; commit and push to main. Owner: AI Agent (Warp).

- 2025-10-02T13:26:20.000Z — SSO Integration Migration Plan: Complete replacement of ADMIN_TOKEN bearer authentication with SSO from https://sso.doneisbetter.com. Scope:
  - New lib/auth.js (validateSsoSession, withSsoAuth middleware) and lib/users.js (upsertUserFromSso, recordAuthEvent)
  - Database: users collection (ssoUserId unique, isAdmin, localPermissions) and authLogs collection for audit
  - API proxy: /api/auth/validate for client-side session checks
  - Admin UI: Remove token field; add getServerSideProps SSR guard; show user info; logout button; 5-min session monitor
  - API routes: Protect all write ops with withSsoAuth; remove Authorization: Bearer checks
  - Environment: SSO_SERVER_URL, SSO_COOKIE_DOMAIN=.doneisbetter.com, remove ADMIN_TOKEN
  - Requirements: App must run on *.doneisbetter.com subdomain for cookie domain match; auto-admin for all SSO users initially
  - Rationale: Enable centralized authentication, audit compliance, future permission granularity; complete deprecation of bearer tokens
  - Notes: No tests per policy; manual verification on subdomain required; localhost admin will not work (cookie mismatch); version bumped to v1.4.1 pre-dev per protocol
  - Owner: AI Agent (Warp) + moldovancsaba
