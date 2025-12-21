# Task List - launchmass v1.13.0

## Completed Tasks

### ✅ v1.13.0 — SSO Permission Sync Integration (Completed 2025-12-20T20:15:22.000Z)
- ✅ Create lib/ssoPermissions.mjs for SSO permission synchronization
- ✅ Implement batch sync to SSO with visual feedback in admin UI
- ✅ Add SSO OAuth configuration utility scripts
- ✅ Integrate SSO permission sync into admin endpoints
- ✅ Remove superadmin role - simplify to user/admin only
- ✅ Update user model with appRole, appStatus, hasAccess fields

### ✅ v1.12.x — Organization Backgrounds & Bug Fixes (Completed 2025-11-07)
- ✅ Add background field support to organizations (v1.12.0)
- ✅ Apply organization backgrounds to all public pages (v1.12.2)
- ✅ Fix organization admin redirect using query parameters (v1.12.1)
- ✅ Fix organization selection override bug in admin (v1.12.3)

### ✅ v1.11.x — Navigation Consolidation (Completed 2025-11-07)
- ✅ Create unified Header component with hamburger menu (v1.10.0)
- ✅ Consolidate navigation into auth-aware menu (v1.11.0)
- ✅ Add "Add Card" button to admin header (v1.11.0)
- ✅ Add OAuth guard to settings page (v1.11.2)
- ✅ Fix logout flow - clear local session before SSO (v1.11.0)
- ✅ Fix organization update/delete permissions (v1.11.3)

### ✅ v1.9.x — Critical Stability Fixes (Completed 2025-11-06)
- ✅ Fix database connection for serverless functions (v1.9.2)
- ✅ Fix timestamp handling across all pages (v1.9.2-v1.9.4)
- ✅ Add comprehensive error logging to cards API (v1.9.2)
- ✅ Fix organization membership handling (v1.9.2)

### ✅ v1.7.x — OAuth 2.0 Migration (Completed 2025-10-07)
- ✅ Create lib/auth-oauth.js with OAuth 2.0 support
- ✅ Create /api/oauth/callback for authorization code exchange
- ✅ Update all API routes to use OAuth authentication
- ✅ Create /admin/users page for user management
- ✅ Create lib/permissions.js with permission matrix
- ✅ Add organizationMembers collection
- ✅ Remove redundant NEXT_PUBLIC OAuth variables (v1.7.3)
- ✅ Fix OAuth endpoint URLs (v1.7.1)

### ✅ v1.5.0 — SSO Integration (Completed 2025-10-02)
- ✅ Create lib/users.js and lib/auth.js (cookie-forwarding approach)
- ✅ Create migration script and API proxy
- ✅ Protect API routes with withSsoAuth middleware
- ✅ Admin UI overhaul with SSR guard
- ✅ Remove ADMIN_TOKEN authentication
- ✅ Create comprehensive documentation

### ✅ Earlier Tasks
- ✅ Hashtag system with filtering (v1.3.0)
- ✅ Organization multi-tenancy (v1.3.1)
- ✅ Google Analytics integration (v1.0.1)

## Active Tasks

### P0 — Critical
- Title: Documentation consistency maintenance
  Owner: AI Agent
  Expected Delivery: Ongoing
  Details: Ensure version numbers, release notes, and architecture docs stay synchronized

### P1 — High Priority
- Title: Version automation implementation
  Owner: moldovan
  Expected Delivery: 2026-Q1
  Details: Implement pre-commit hooks and scripts to automate version bumping across all files (from overdue P2 task)

### P2 — Medium Priority
- Title: Permission system enhancements
  Owner: moldovan
  Expected Delivery: 2026-Q1
  Details: Refine organization permission matrix based on usage patterns, consider granular permissions

### P3 — Low Priority
- Title: Legacy auth cleanup
  Owner: moldovan
  Expected Delivery: 2026-Q2
  Details: Remove deprecated lib/auth.js after confirming no dependencies, consolidate to OAuth 2.0 only
