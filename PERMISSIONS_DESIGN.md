# Permission System Enhancement Design

**Version: 1.18.0**  
**Status: Phase 1 Complete (Foundation)**  
**Phase 2 Target: Q2 2026 (API/UI)**

---

## Executive Summary

This document outlines the design for enhancing launchmass's permission system from a binary admin/user model to a flexible, organization-scoped role-based access control (RBAC) system with custom roles, permission templates, and granular controls.

**Phase 1 Status (v1.18.0): ✅ COMPLETE**
- organizationRoles collection created
- Migration script: `scripts/migrate-organization-roles.mjs`
- Custom role support in `lib/permissions.js` with caching
- 18 granular permissions (expanded from 8)
- System roles (admin/user) hardcoded for performance
- Custom roles loaded from MongoDB with 5-minute TTL cache
- Performance monitoring built-in
- Backward compatible with existing admin/user roles

**Phase 2 Target (Q2 2026):**
- Role CRUD API endpoints
- Role management UI at `/settings/roles`
- Permission templates UI
- Role assignment in member management
- Comprehensive testing and documentation

---

## Design Principles

1. **Backward Compatibility**: Existing admin/user roles continue to work
2. **Organization Isolation**: Roles defined per-organization (multi-tenant safe)
3. **MVP First**: Start with essential features, iterate based on usage
4. **Performance**: Caching strategies to avoid permission check overhead
5. **Security**: Fail-safe defaults (deny unless explicitly granted)

---

## Data Model

### New Collection: `organizationRoles`

```javascript
{
  _id: ObjectId,
  orgUuid: String,           // Organization UUID (indexed)
  roleId: String,            // Unique role ID within org (e.g., "editor", "viewer")
  roleName: String,          // Display name (e.g., "Content Editor")
  permissions: Array<String>, // List of permission strings
  isSystem: Boolean,         // true for built-in admin/user roles
  description: String,       // Optional role description
  createdAt: String,         // ISO 8601 timestamp
  updatedAt: String,         // ISO 8601 timestamp
  createdBy: String          // SSO user ID who created role
}

// Indexes:
// { orgUuid: 1, roleId: 1 } unique
// { orgUuid: 1, isSystem: 1 }
```

### Updated Collection: `organizationMembers`

```javascript
{
  _id: ObjectId,
  orgUuid: String,
  ssoUserId: String,
  role: String,              // NOW: Can be "admin", "user", or custom roleId
  addedBy: String,
  createdAt: String,
  updatedAt: String
}

// Existing indexes remain:
// { orgUuid: 1, ssoUserId: 1 } unique
// { ssoUserId: 1 }
// { role: 1 }
```

---

## Permission Types

### Current (Keep)
- `org.read` - View organization details
- `org.write` - Edit organization settings
- `org.delete` - Delete organization
- `cards.read` - View cards
- `cards.write` - Create/edit cards
- `cards.delete` - Delete cards
- `members.read` - View organization members
- `members.write` - Add/remove/edit members

### New (Granular)
- `cards.create` - Create new cards (split from cards.write)
- `cards.update` - Edit existing cards (split from cards.write)
- `cards.reorder` - Change card order
- `members.invite` - Invite new members (split from members.write)
- `members.remove` - Remove members (split from members.write)
- `members.edit_roles` - Change member roles
- `roles.read` - View organization roles
- `roles.write` - Create/edit custom roles
- `tags.read` - View tags
- `tags.write` - Create/edit tags

---

## Role Templates

Built-in role templates that organizations can instantiate:

### 1. Admin (System Role)
```javascript
{
  roleId: "admin",
  roleName: "Administrator",
  isSystem: true,
  permissions: [
    "org.read", "org.write", "org.delete",
    "cards.read", "cards.create", "cards.update", "cards.delete", "cards.reorder",
    "members.read", "members.invite", "members.remove", "members.edit_roles",
    "roles.read", "roles.write",
    "tags.read", "tags.write"
  ]
}
```

### 2. User (System Role)
```javascript
{
  roleId: "user",
  roleName: "User",
  isSystem: true,
  permissions: [
    "cards.read", "cards.create", "cards.update", "cards.delete",
    "members.read",
    "tags.read"
  ]
}
```

### 3. Editor (Template)
```javascript
{
  roleId: "editor",
  roleName: "Content Editor",
  isSystem: false,
  permissions: [
    "cards.read", "cards.create", "cards.update", "cards.reorder",
    "members.read",
    "tags.read", "tags.write"
  ]
}
```

### 4. Viewer (Template)
```javascript
{
  roleId: "viewer",
  roleName: "Viewer",
  isSystem: false,
  permissions: [
    "cards.read",
    "members.read",
    "tags.read"
  ]
}
```

### 5. Moderator (Template)
```javascript
{
  roleId: "moderator",
  roleName: "Moderator",
  isSystem: false,
  permissions: [
    "cards.read", "cards.update", "cards.delete",
    "members.read", "members.remove",
    "tags.read", "tags.write"
  ]
}
```

---

## API Changes

### New Endpoints

#### 1. List Organization Roles
```
GET /api/organizations/{uuid}/roles
Auth: Required (members.read permission)
Response: [{ roleId, roleName, permissions, isSystem, description }]
```

#### 2. Create Custom Role
```
POST /api/organizations/{uuid}/roles
Auth: Required (roles.write permission)
Body: { roleId, roleName, permissions, description }
Response: { roleId, roleName, permissions, createdAt }
```

#### 3. Update Custom Role
```
PUT /api/organizations/{uuid}/roles/{roleId}
Auth: Required (roles.write permission)
Body: { roleName?, permissions?, description? }
Response: { roleId, roleName, permissions, updatedAt }
Validation: Cannot modify system roles (admin/user)
```

#### 4. Delete Custom Role
```
DELETE /api/organizations/{uuid}/roles/{roleId}
Auth: Required (roles.write permission)
Validation: 
  - Cannot delete system roles
  - Cannot delete role if members are using it
  - Must reassign members first
```

#### 5. Get Role Templates
```
GET /api/roles/templates
Auth: Required
Response: [{ roleId, roleName, permissions, description }]
```

---

## Updated lib/permissions.js

```javascript
// NEW: Load role from organizationRoles collection
export async function getOrgRole(orgUuid, roleId) {
  // Check system roles first (admin/user)
  if (roleId === 'admin') return SYSTEM_ROLES.admin;
  if (roleId === 'user') return SYSTEM_ROLES.user;
  
  // Load custom role from database
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'launchmass');
  const col = db.collection('organizationRoles');
  
  const role = await col.findOne(
    { orgUuid: String(orgUuid), roleId: String(roleId) },
    { projection: { permissions: 1, _id: 0 } }
  );
  
  return role ? { permissions: new Set(role.permissions) } : null;
}

// UPDATED: hasOrgPermission now loads custom roles
export async function hasOrgPermission(user, orgUuid, permission, req = null) {
  if (isSuperAdmin(user)) return true;
  if (!user?.ssoUserId || !orgUuid || !permission) return false;
  
  // Get user's role in org (from organizationMembers)
  const roleId = await getUserOrgRole(user.ssoUserId, orgUuid);
  if (!roleId) return false;
  
  // Load role definition (system or custom)
  const role = await getOrgRole(orgUuid, roleId);
  if (!role) return false;
  
  // Check permission
  return role.permissions.has(permission);
}
```

---

## Migration Strategy

### Phase 1: Schema Setup (Week 1)
1. Create `organizationRoles` collection with indexes
2. Seed system roles (admin/user) for all existing organizations
3. Update `lib/permissions.js` to support custom roles
4. Add backward compatibility layer

### Phase 2: API Implementation (Week 2)
1. Implement role CRUD endpoints
2. Add role validation middleware
3. Update member management to support custom roles
4. Add permission checks to all new endpoints

### Phase 3: UI Implementation (Week 3)
1. Add Roles management page (`/settings/roles`)
2. Update member management UI to show role dropdown
3. Add role creation/edit modal
4. Add permission checklist UI

### Phase 4: Testing & Documentation (Week 4)
1. Test all role operations
2. Test permission enforcement across API
3. Update ARCHITECTURE.md
4. Update AUTH_CURRENT.md
5. Create user guide for role management

---

## Security Considerations

1. **Last Admin Protection**: Extend to any role with org.delete permission
2. **Role Deletion**: Block if members are assigned to role
3. **Permission Escalation**: Only admins can create roles with permissions they don't have
4. **System Role Protection**: admin/user roles cannot be modified/deleted
5. **Audit Logging**: Log all role changes (who, what, when)

---

## Performance Optimizations

1. **Role Caching**: Cache role definitions in memory (TTL: 5 minutes)
2. **Permission Cache**: Per-request cache for role lookups (existing)
3. **Database Indexes**: Compound indexes on orgUuid + roleId
4. **Lazy Loading**: Only load role when permission check required

---

## Future Enhancements (v2.0.0+)

1. **Role Inheritance**: Roles can extend other roles
2. **Time-Bound Permissions**: Permissions expire after date
3. **Conditional Permissions**: Permissions based on resource attributes
4. **Permission Groups**: Bundle permissions into logical groups
5. **Role Analytics**: Track role usage and permission patterns
6. **Import/Export Roles**: Share role definitions across organizations

---

## Implementation Checklist

- [ ] Create migration script for organizationRoles collection
- [ ] Update lib/permissions.js with custom role support
- [ ] Add role CRUD API endpoints
- [ ] Update member management API to validate roleId
- [ ] Build role management UI page
- [ ] Update member management UI for custom roles
- [ ] Add permission validation to all API routes
- [ ] Write migration guide for existing integrations
- [ ] Update all documentation (ARCHITECTURE, AUTH_CURRENT, etc.)
- [ ] Create admin user guide for role management
- [ ] Test permission enforcement across all endpoints
- [ ] Deploy database migrations to production
- [ ] Monitor performance impact

---

## Success Metrics

1. **Adoption**: % of organizations using custom roles (target: 30% in Q2 2026)
2. **Performance**: Permission check latency < 10ms (p95)
3. **Security**: Zero permission escalation incidents
4. **UX**: Role creation time < 2 minutes
5. **System**: No backward compatibility breaks

---

## Rollback Plan

If critical issues arise:
1. Feature flag to disable custom roles
2. Fall back to hardcoded admin/user system
3. Preserve data in organizationRoles (don't delete)
4. Re-enable after fixes applied

---

## Document History

- 2025-12-21: Initial design document created
