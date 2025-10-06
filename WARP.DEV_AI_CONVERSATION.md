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

- 2025-10-04T10:26:39.000Z — User Rights Management Implementation Plan: Two-tier permission system with super admins and organization-scoped roles. Scope:
  - Database: organizationMembers collection (orgUuid, ssoUserId, role enum admin|user, audit fields); isSuperAdmin field in users collection (deprecate isAdmin)
  - Migration script: scripts/migrate-user-rights.cjs (idempotent; seed super admins from env SUPERADMINS or first user by createdAt)
  - Permission system: lib/permissions.js (isSuperAdmin, getUserOrgRole, hasOrgPermission, ensureOrgPermission with permission matrix)
  - Auth middleware: extend lib/auth.js with withOrgPermission(permission, handler) wrapping withSsoAuth
  - Member management: /api/organizations/[uuid]/members (GET/POST) and /api/organizations/[uuid]/members/[memberId] (PATCH/DELETE) with last-admin protection
  - API protections: all cards and organizations endpoints enforce org-scoped permissions (cards.read/write/delete, org.read/write/delete, members.read/write)
  - Admin UI: members section with add/edit/remove; permission-aware controls; super admin badge in header
  - Settings UI: filter orgs by membership; show role badges; enable org creation with auto-admin assignment
  - Business rules: super admins access all orgs; org admins full control within org; org users CRUD cards + view members; last admin cannot be removed/demoted
  - Default behavior: org creator auto-assigned admin role in organizationMembers; super admins designated via isSuperAdmin flag
  - Rationale: enable multi-tenant access control; audit trails for membership changes; future-proof for granular permissions; maintain backward compatibility
  - Notes: no tests per policy; no breadcrumbs; ISO 8601 UTC milliseconds timestamps; ESM modules except migration script (CommonJS); reuse lib/db.js, lib/org.js, lib/auth.js patterns; version 1.6.0→1.6.1 (PATCH) pre-dev, then 1.7.0 (MINOR) before commit
  - Owner: AI Agent (Warp) + moldovancsaba
