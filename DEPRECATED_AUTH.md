# Migration Guide: lib/auth.js → lib/auth-oauth.js

**Status**: lib/auth.js is DEPRECATED as of v1.13.0  
**Target Removal**: v2.0.0  
**Migration Deadline**: Before Q2 2026

## Overview

The legacy `lib/auth.js` module (cookie-forwarding SSO authentication) has been superseded by `lib/auth-oauth.js` (OAuth 2.0 token-based authentication). All new development should use the OAuth 2.0 module, and existing code should be migrated before v2.0.0.

## Why This Change?

### Technical Reasons
1. **OAuth 2.0 Standard**: Industry-standard authentication protocol with better security guarantees
2. **Direct Token Validation**: OAuth tokens validated directly from cookie without extra network call to SSO server
3. **Improved Performance**: Eliminates roundtrip latency to SSO validation endpoint on every request
4. **Better Security**: Token-based sessions with structured expiration handling vs. opaque cookie forwarding

### Architectural Benefits
- Clearer separation between authentication (OAuth tokens) and authorization (org permissions)
- Simpler debugging with structured session data vs. opaque cookies
- Better alignment with modern web authentication standards

## API Compatibility

**Good News**: The two modules have identical exported APIs, making migration straightforward.

### Exported Functions (Both Modules)
- `validateSsoSession(req)` - Validates session and returns user data
- `withSsoAuth(handler)` - Higher-order function for protecting API routes
- `withOrgPermission(permission, handler)` - Organization-scoped authorization wrapper

### OAuth-Specific Functions (auth-oauth.js only)
- `getOAuthLoginUrl(redirectAfterLogin)` - Generate OAuth authorization URL
- `logoutOAuth(res)` - Clear OAuth session cookie

## Migration Steps

### Step 1: Update Imports

**Before** (lib/auth.js):
```javascript
import { validateSsoSession, withSsoAuth, withOrgPermission } from '../../../lib/auth.js';
```

**After** (lib/auth-oauth.js):
```javascript
import { validateSsoSession, withSsoAuth, withOrgPermission } from '../../../lib/auth-oauth.js';
```

### Step 2: No Code Changes Required

Because the APIs are identical, **no changes to your handler logic are needed**. The function signatures, return values, and behavior are preserved.

**Example** (no changes needed):
```javascript
// This code works identically with either module
export default async function handler(req, res) {
  if (req.method === 'POST') {
    return withSsoAuth(async (req, res) => {
      // req.user available with local user data
      console.log('Authenticated user:', req.user.email);
      // ... your logic
    })(req, res);
  }
}
```

### Step 3: Update Server-Side Props (if applicable)

**getServerSideProps** with authentication:

```javascript
// Before (lib/auth.js)
import { validateSsoSession } from '../lib/auth.js';

export async function getServerSideProps(context) {
  const { isValid, user } = await validateSsoSession(context.req);
  
  if (!isValid) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
  
  return { props: { user } };
}
```

```javascript
// After (lib/auth-oauth.js) - same logic
import { validateSsoSession, getOAuthLoginUrl } from '../lib/auth-oauth.js';

export async function getServerSideProps(context) {
  const { isValid, user } = await validateSsoSession(context.req);
  
  if (!isValid) {
    return {
      redirect: {
        destination: getOAuthLoginUrl(context.resolvedUrl),
        permanent: false,
      },
    };
  }
  
  return { props: { user } };
}
```

## Session Cookie Differences

### Legacy auth.js (Cookie Forwarding)
- **Cookie Names**: `user-session` or `admin-session` (set by SSO server)
- **Cookie Domain**: `.doneisbetter.com`
- **Validation**: Forwarded to SSO server `/api/public/validate` or `/api/sso/validate`
- **Network Cost**: Extra HTTP request to SSO server on every validation

### OAuth auth-oauth.js (Token-Based)
- **Cookie Name**: `sso_session` (set by launchmass callback handler)
- **Cookie Domain**: `.doneisbetter.com`
- **Cookie Content**: Base64-encoded JSON with OAuth tokens and user info
- **Validation**: Local token expiration check (no network call)
- **Network Cost**: Zero (tokens validated locally)

## Environment Variables

Both modules use the same environment variables:

```bash
# Required for both
SSO_SERVER_URL=https://sso.doneisbetter.com

# OAuth 2.0 specific (required for auth-oauth.js)
SSO_CLIENT_ID=your-oauth-client-id
SSO_REDIRECT_URI=https://launchmass.doneisbetter.com/api/oauth/callback

# Client-side OAuth (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_SSO_SERVER_URL=https://sso.doneisbetter.com
```

**Note**: If migrating to OAuth, ensure `SSO_CLIENT_ID` and `SSO_REDIRECT_URI` are configured.

## Testing Your Migration

### 1. Verify Authentication Flow
1. Clear all cookies for `.doneisbetter.com` domain
2. Visit `/admin` page
3. Should redirect to OAuth login at SSO server
4. After login, should be redirected back to `/admin`
5. Verify `sso_session` cookie is set with HttpOnly flag

### 2. Verify API Route Protection
```bash
# Should return 401 without valid session
curl -X POST https://launchmass.doneisbetter.com/api/cards

# Should succeed with valid session cookie
curl -X GET https://launchmass.doneisbetter.com/api/cards \
  -H "Cookie: sso_session=..."
```

### 3. Verify Organization Permissions
```bash
# Should return 403 if user lacks permission
curl -X POST https://launchmass.doneisbetter.com/api/cards \
  -H "Cookie: sso_session=..." \
  -H "X-Organization-UUID: ..." \
  -d '{"title":"Test"}'
```

## Files Currently Using lib/auth.js

Run this command to find all imports of the legacy module:

```bash
grep -r "from.*lib/auth\.js" pages/
```

**Known Usage** (as of v1.13.0):
- Some API routes in `pages/api/` may still use legacy auth
- Check and migrate each occurrence individually

## Rollback Plan

If OAuth migration causes issues, you can temporarily rollback:

1. **Revert imports** back to `lib/auth.js`
2. **Clear OAuth cookies**: Delete `sso_session` cookie
3. **Restore legacy cookies**: Ensure `user-session` or `admin-session` are set by SSO server
4. **File a bug report**: Document the issue for investigation

**Note**: Rollback is only available until v2.0.0 when lib/auth.js will be removed.

## Timeline

- **v1.6.0** (2025-10-02): OAuth 2.0 authentication introduced in `lib/auth-oauth.js`
- **v1.13.0** (2025-12-21): `lib/auth.js` marked as DEPRECATED
- **v1.14.0 - v1.99.0**: Migration period (both modules coexist)
- **v2.0.0** (Target: Q2 2026): `lib/auth.js` REMOVED (breaking change)

## Support

If you encounter issues during migration:

1. **Check AUTH_CURRENT.md**: Current authentication documentation
2. **Review LEARNINGS.md**: Common authentication pitfalls
3. **Inspect Network Tab**: Verify OAuth flow and cookie handling
4. **Check Logs**: Server logs show authentication validation attempts

## Checklist

Use this checklist to track your migration progress:

- [ ] Identify all files importing `lib/auth.js`
- [ ] Update imports to `lib/auth-oauth.js`
- [ ] Verify OAuth environment variables are set
- [ ] Test authentication flow on staging/preview
- [ ] Test API route protection
- [ ] Test organization permissions
- [ ] Update any custom authentication logic
- [ ] Verify logout functionality
- [ ] Deploy to production
- [ ] Monitor authentication logs for errors
- [ ] Remove fallback to `lib/auth.js` after stable period

## Summary

**Migration Complexity**: ⭐ Low (API-compatible, import change only)  
**Testing Required**: ⭐⭐ Medium (verify OAuth flow works correctly)  
**Urgency**: ⭐ Low (deadline: v2.0.0 in Q2 2026)  
**Benefit**: ⭐⭐⭐ High (modern standard, better security, improved performance)

**Bottom Line**: Change the import path, test OAuth flow, done. The modules are API-compatible by design.
