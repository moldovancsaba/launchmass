# Task List - launchmass v1.13.0

## Completed Tasks

### ✅ v1.14.0 — Version Automation & Documentation Governance (Completed 2025-12-21T14:30:00.000Z)
- ✅ Create scripts/bump-version.sh for automated version updates
- ✅ Create scripts/verify-docs-consistency.js for validation
- ✅ Add pre-commit hook for version consistency enforcement
- ✅ Create .github/workflows/docs-check.yml for CI/CD validation
- ✅ Mark lib/auth.js as DEPRECATED with migration warnings
- ✅ Create DEPRECATED_AUTH.md migration guide
- ✅ Add monthly documentation review process to ROADMAP.md
- ✅ Add npm scripts: bump-version, verify-docs

**Note:** Implemented Q1 2026 automation tasks ahead of schedule (originally planned for Jan-Mar 2026)

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
  Details: Automated via pre-commit hook and CI/CD checks (v1.14.0)
  Status: ✅ Automated - manual oversight still required monthly

### P2 — Medium Priority
- Title: Permission system enhancements
  Owner: moldovan
  Expected Delivery: 2026-Q1
  Details: Refine organization permission matrix based on usage patterns, consider granular permissions

### P3 — Low Priority
- Title: Legacy auth cleanup - Phase 2
  Owner: moldovan
  Expected Delivery: v2.0.0 (Q2 2026)
  Details: Phase 1 complete (deprecation warnings, migration guide). Phase 2: Remove lib/auth.js entirely after migration period
