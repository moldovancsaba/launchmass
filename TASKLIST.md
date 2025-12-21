# Task List - launchmass

**Version: 1.18.0-alpha**

## Completed Tasks

### ✅ v1.17.0 — Legacy Auth Cleanup & Permission System Design (Completed 2025-12-21T19:28:19.000Z)
- ✅ Removed lib/auth.js (legacy cookie-forwarding authentication)
- ✅ Created comprehensive permission system enhancement design (PERMISSIONS_DESIGN.md)
- ✅ Designed custom role system with 5 role templates
- ✅ Specified 18 granular permissions for future implementation
- ✅ Planned Q2 2026 implementation strategy
- ✅ Completed P0 documentation review (all checks passed)

**Note:** Permission system design complete; implementation scheduled for Q2 2026

### ✅ v1.16.0 — Critical Security Fix (Completed 2025-12-21T18:45:01.000Z)
- ✅ Updated Next.js from 15.5.4 to 15.5.9
- ✅ Resolved 3 critical CVEs (RCE, source exposure, DoS)
- ✅ Corrected Vercel's automated PR (used 15.4.10 instead of 15.5.9)

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

### 🏗️ Phase 1: Foundation & Analysis (v1.18.0) - IN PROGRESS

#### P0 — Critical: Track C - Database Optimization
- **Ticket**: TRACK-C-01
- **Title**: Run index creation on production
- **Owner**: moldovan
- **Expected Delivery**: Week 1
- **Command**: `node scripts/create-indexes.mjs`
- **Impact**: 80% reduction in slow queries
- **Status**: ⏳ Ready to run

#### P1 — High: Track A - Custom Roles Schema
- **Ticket**: TRACK-A-01
- **Title**: Create organizationRoles collection migration
- **Owner**: moldovan  
- **Expected Delivery**: Week 1
- **Tasks**:
  - [ ] Create `scripts/migrate-organization-roles.mjs`
  - [ ] Define system roles (admin, user)
  - [ ] Seed all existing organizations with system roles
  - [ ] Add indexes (orgUuid+roleId unique, orgUuid+isSystem)
- **Files to create**: `scripts/migrate-organization-roles.mjs`
- **Status**: 📝 Next task

#### P1 — High: Track A - Update Permissions Library
- **Ticket**: TRACK-A-02  
- **Title**: Add custom role support to lib/permissions.js
- **Owner**: moldovan
- **Expected Delivery**: Week 1
- **Tasks**:
  - [ ] Add `getOrgRole(orgUuid, roleId)` function
  - [ ] Update `hasOrgPermission()` to load custom roles
  - [ ] Add role caching (5-minute TTL)
  - [ ] Maintain backward compatibility with admin/user
- **Files to modify**: `lib/permissions.js`
- **Status**: 📝 After TRACK-A-01

#### P1 — High: Track B - Analytics Infrastructure  
- **Ticket**: TRACK-B-01
- **Title**: Create analytics event logging system
- **Owner**: moldovan
- **Expected Delivery**: Week 1
- **Tasks**:
  - [ ] Create `lib/analytics.js` with event logging utilities
  - [ ] Define analyticsEvents schema
  - [ ] Add `logEvent(type, data)` function
  - [ ] Implement async batching (prevent perf impact)
  - [ ] Add event types: card_click, card_create, admin_action
- **Files to create**: `lib/analytics.js`
- **Status**: 📝 Can run in parallel

#### P2 — Medium: Track D - Permission Auditing
- **Ticket**: TRACK-D-01
- **Title**: Add permission check performance logging
- **Owner**: moldovan
- **Expected Delivery**: Week 1  
- **Tasks**:
  - [ ] Add timing measurements to `hasOrgPermission()`
  - [ ] Log slow permission checks (>10ms)
  - [ ] Track permission check frequency
  - [ ] Add cache hit/miss metrics
- **Files to modify**: `lib/permissions.js`
- **Status**: 📝 Low priority

### 🚀 Phase 2: Core Implementation (v1.19.0) - PLANNED

#### P1 — High: Track A - Custom Roles API
- **Ticket**: TRACK-A-03
- **Title**: Implement role CRUD endpoints
- **Owner**: moldovan
- **Expected Delivery**: Week 2
- **Endpoints**:
  - [ ] GET /api/organizations/{uuid}/roles
  - [ ] POST /api/organizations/{uuid}/roles
  - [ ] PUT /api/organizations/{uuid}/roles/{roleId}
  - [ ] DELETE /api/organizations/{uuid}/roles/{roleId}
  - [ ] GET /api/roles/templates
- **Files to create**: 5 new API route files
- **Status**: 📅 Week 2

#### P1 — High: Track B - Analytics API
- **Ticket**: TRACK-B-02  
- **Title**: Create analytics summary endpoint
- **Owner**: moldovan
- **Expected Delivery**: Week 2
- **Endpoints**:
  - [ ] GET /api/analytics/summary
  - [ ] GET /api/analytics/cards
  - [ ] GET /api/analytics/users
  - [ ] GET /api/analytics/organizations
- **Files to create**: `pages/api/analytics/` directory
- **Status**: 📅 Week 2

### 🎨 Phase 3: UI & Polish (v1.20.0) - PLANNED

#### P1 — High: Track A - Roles Management UI
- **Ticket**: TRACK-A-04
- **Title**: Build /settings/roles page
- **Owner**: moldovan
- **Expected Delivery**: Week 3
- **Components**:
  - [ ] Role list table
  - [ ] Role creation modal
  - [ ] Role edit modal
  - [ ] Permission checklist
  - [ ] Role deletion with validation
- **Files to create**: `pages/settings/roles.js`
- **Status**: 📅 Week 3

#### P1 — High: Track B - Analytics Dashboard UI
- **Ticket**: TRACK-B-03
- **Title**: Build /admin/analytics page
- **Owner**: moldovan  
- **Expected Delivery**: Week 3
- **Components**:
  - [ ] Summary cards (total clicks, users, orgs)
  - [ ] Card interaction chart
  - [ ] Date range selector
  - [ ] Export functionality
- **Files to create**: `pages/admin/analytics.js`
- **Status**: 📅 Week 3

### 📚 Phase 4: Testing & Documentation (v1.21.0) - PLANNED

#### P0 — Critical: Comprehensive Testing
- **Ticket**: TEST-ALL
- **Title**: Test all 4 tracks end-to-end
- **Owner**: moldovan
- **Expected Delivery**: Week 4
- **Tasks**:
  - [ ] Test custom roles creation/assignment
  - [ ] Verify backward compatibility (admin/user still work)
  - [ ] Test analytics event capture
  - [ ] Load test permission checks
  - [ ] Security audit for permission escalation
- **Status**: 📅 Week 4

### 📋 Ongoing Maintenance

#### P0 — Critical: Documentation Consistency
- **Title**: Documentation consistency maintenance
- **Owner**: AI Agent
- **Expected Delivery**: Ongoing
- **Details**: Automated via pre-commit hook and CI/CD checks (v1.14.0)
- **Status**: ✅ Automated - manual oversight required monthly
