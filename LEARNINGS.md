# Development Learnings - launchmass v1.13.0

## Frontend

### Next.js Document Customization
**Issue**: Need to inject external scripts consistently across all application pages  
**Solution**: Implemented custom `_document.js` component for document-level modifications  
**Key Learning**: Next.js _document.js is the proper approach for global script injection, ensuring consistent loading across all pages without performance impact from individual page modifications

### Google Analytics Integration Pattern

### Conditional UI Rendering on Route
**Issue**: The global bottom info bar should not appear on admin pages  
**Solution**: In `pages/_app.js`, used `useRouter()` to detect `/admin` routes and conditionally suppress the info bar rendering, leaving CSS untouched  
**Key Learning**: Prefer route-based conditional rendering in the app wrapper for layout chrome that should vary by section; avoid putting dynamic UI in `_document.js` which is meant for static document structure

### Hashtags Feature Implementation (2025-09-16T18:12:51.000Z)
**Issue**: Need to support adding/removing hashtags on cards and filtering by hashtag on the main page  
**Solution**: Added `tags: string[]` to cards with strict normalization (trim, strip `#`, lowercase, dedupe). Implemented predictive tag input with chips and remove (x) on the admin page, and clickable chips on the main page with SSR filtering via `?tag=`. Provided `/api/tags` for distinct suggestions. Replaced MUI Autocomplete with a lightweight custom TagInput to avoid Popper-related build errors.  
**Key Learning**: Keep domain fields normalized at the API boundary; SSR query filtering yields stable, shareable URLs; avoid introducing heavy UI dependencies when a small bespoke input suffices for MVP stability.
**Issue**: Requirement to implement Google Analytics tracking with gtag.js  
**Solution**: Used Next.js _document.js with dangerouslySetInnerHTML for gtag initialization  
**Key Learning**: 
- Async script loading prevents render blocking
- dataLayer initialization must occur before gtag function definition
- Document-level injection ensures analytics coverage across all application routes
- Configuration object approach enables clean tracking ID management

## Process

### Versioning Protocol Application
**Issue**: Strict versioning requirements with specific increment rules  
**Solution**: Applied PATCH increment (1.0.0 → 1.0.1) before development work began  
**Key Learning**: Pre-development version increments ensure proper tracking of all development cycles, even before commit or deployment phases

### Documentation Framework Implementation
**Issue**: Multiple documentation files required with specific structural requirements  
**Solution**: Created comprehensive documentation suite following project governance rules  
**Key Learning**: 
- Documentation consistency prevents project fragmentation
- Forward-looking roadmaps require clear dependency tracking
- Task documentation must include specific ownership and delivery dates
- Architecture documentation should focus on current system state only

## Dev

### ES Module Compatibility
**Issue**: Project uses ES modules (type: "module" in package.json)  
**Solution**: All new code implemented with ES module syntax and imports  
**Key Learning**: Maintaining consistency with existing module system prevents import/export conflicts and ensures build stability

### Code Commenting Standards
**Issue**: Project requires comprehensive commenting explaining both function and reasoning  
**Solution**: Implemented detailed comments covering implementation decisions and architectural choices  
**Key Learning**: Comments should explain not just what code does, but why specific approaches were chosen, especially for architectural decisions like script injection methods

## Security

### SSO Integration with Cross-Domain Cookies (2025-10-02T14:18:45.000Z)
**Issue**: Need centralized authentication replacing bearer token system, but SSO uses HttpOnly cookies with specific domain requirements  
**Solution**: Implemented server-side cookie forwarding pattern where Next.js server forwards cookies to SSO validation endpoint, combined with SSR guard in `getServerSideProps` for admin page protection  
**Key Learning**: 
- HttpOnly cookies cannot be accessed by client JavaScript, requiring server-side forwarding for validation
- SSO cookies with `Domain=.doneisbetter.com` only work on matching subdomains, making localhost admin impossible
- SSR validation prevents UI flash and ensures auth check before page render
- Client-side session monitoring (5-min intervals) provides graceful logout on expiration
- Use Vercel preview deployments with *.doneisbetter.com for admin testing during development
**Status**: Superseded by OAuth 2.0 in v1.7.0

### OAuth 2.0 Migration (2025-10-07T09:26:28.000Z)
**Issue**: Initial v1.5.0 SSO implementation assumed simple cookie-forwarding, but actual SSO system uses OAuth 2.0 / OpenID Connect  
**Solution**: Complete rewrite to proper OAuth 2.0 authorization code flow with token exchange, ID token parsing, and session cookie storage  
**Key Learning**:
- OAuth requires client credentials (client_id, client_secret) registered in SSO admin panel
- Authorization code flow: user → authorize endpoint → callback with code → token exchange → session storage
- ID tokens (JWT) contain user claims, eliminating need for separate user info endpoint
- Session cookies store all OAuth tokens (access_token, id_token, refresh_token) as base64-encoded JSON
- OAuth callback must be exactly registered in SSO (https://launchmass.doneisbetter.com/api/oauth/callback)
- Client secrets must NEVER be exposed to browser (server-side only in token exchange)
- State parameter preserves user's intended destination across OAuth flow
**Files Created**: `lib/auth-oauth.js`, `/api/oauth/callback.js`, replaced all imports from `lib/auth.js`

### Organization Permission System (2025-10-07T20:36:19.000Z)
**Issue**: Need role-based access control for organization-scoped operations  
**Solution**: Created `lib/permissions.js` with permission matrix and `withOrgPermission` middleware combining authentication + authorization  
**Key Learning**:
- Separate concerns: authentication (who are you) vs. authorization (what can you do)
- Permission matrix approach scales better than hardcoded role checks
- Middleware composition: `withOrgPermission` wraps `withSsoAuth` for DRY principle
- Organization context resolution via headers (X-Organization-UUID) enables multi-tenant APIs
- Permission checks should fail fast with clear error messages (400/401/403 status codes)
- Cache organization lookups with TTL to reduce database queries
**Permission Types**: cards.read/write/delete, org.read/write/delete, members.read/write

### User Management System (2025-10-07T21:40:55.000Z)
**Issue**: Need admin UI to manage user access and roles without manual database editing  
**Solution**: Created `/admin/users` page with batch operations for access control and SSO permission sync  
**Key Learning**:
- Distinguish between appRole (launchmass-specific) and ssoRole (from SSO system)
- appStatus field enables pending/active/suspended user workflow
- hasAccess boolean provides simple on/off access control
- Batch sync to SSO ensures permissions stay in sync across applications
- User management requires its own permission checks (only admins should access)
- Current user should always be visible in user list for transparency
**Database Fields**: appRole ('user'|'admin'), appStatus ('active'|'pending'|'suspended'), hasAccess (boolean)

### Navigation Consolidation with Hamburger Menu (2025-11-07T09:48:34.000Z)
**Issue**: Multiple navigation patterns across pages caused inconsistent UX  
**Solution**: Created unified Header component with auth-aware hamburger menu across all pages  
**Key Learning**:
- Auth-aware navigation: menu options change based on authentication state
- Hamburger menu pattern works better for mobile-first design than traditional nav bars
- Consistent header across pages improves user orientation and reduces cognitive load
- MUI IconButton + Menu components provide accessible dropdown navigation
- Organization title in header provides context for multi-tenant apps
- "Add Card" button in admin header reduces clicks for common operations
**Component**: `components/Header.jsx` with Material-UI for responsive design

### Organization Background Theming (2025-11-07T11:01:46.000Z)
**Issue**: Organizations need visual identity and consistent theming across pages  
**Solution**: Added `background` field to organizations collection, applied to all org-scoped pages  
**Key Learning**:
- Reuse existing card background logic for organizations (DRY principle)
- CSS gradients and solid colors both supported via same field
- Background should apply to both organization pages AND main page for consistency
- Parse background from multi-line CSS input in admin interface
- Store as single string in database for simplicity
- Background field optional (falls back to default gradient if not set)
**Database**: Added `background` field to `organizations` collection (v1.12.0)

### Timestamp Handling in Serverless Functions (2025-11-06T12:38:20.000Z)
**Issue**: MongoDB returns dates as Date objects, but JSON serialization converts to ISO strings, causing inconsistent handling  
**Solution**: Normalize timestamp handling to support both Date objects and ISO 8601 strings throughout codebase  
**Key Learning**:
- Serverless functions may serialize/deserialize data between execution contexts
- Always check `instanceof Date` before calling date methods
- Provide fallback: `new Date(value)` handles both Date objects and ISO strings
- Consistent timestamp format (ISO 8601 with milliseconds) critical for sorting and display
- MongoDB driver returns Date objects, but Next.js JSON serialization converts to strings
- Handle gracefully rather than throw errors (defensive programming)
**Pattern**: `const date = value instanceof Date ? value : new Date(value)`

### User Persistence and Audit Logging
**Issue**: Need to track SSO users locally for admin rights and maintain audit trail of authentication attempts  
**Solution**: Created `users` collection with upsert pattern (sets `isAdmin: true` only on insert using `$setOnInsert`) and `authLogs` collection for comprehensive event tracking with IP/user agent  
**Key Learning**: 
- `$setOnInsert` operator enables future manual admin rights revocation without automatic re-grant on next login
- Audit logs must capture both successful and failed auth attempts for security analysis
- IP address from `x-forwarded-for` and user agent provide context for suspicious activity detection
- Proper MongoDB indexing (`{ ssoUserId: 1 }` unique, `{ createdAt: -1 }`) critical for audit log performance

### API Route Protection with Middleware
**Issue**: Multiple API endpoints need identical SSO validation logic without code duplication  
**Solution**: Created `withSsoAuth()` higher-order function that wraps API handlers, validates session, attaches `req.user`, and returns 401 for invalid sessions  
**Key Learning**: 
- Middleware pattern centralizes auth logic and ensures consistency across endpoints
- Returning 401 early prevents unauthorized operations without handler code changes
- Attaching `req.user` to request object provides handler access to authenticated user data
- Pattern supports partial route protection (e.g., GET public, POST protected) within same endpoint
