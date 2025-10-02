# Development Learnings - launchmass v1.5.0

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
