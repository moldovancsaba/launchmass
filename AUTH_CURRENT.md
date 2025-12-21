# Authentication Guide - launchmass

**Version: 1.17.0**
**Last Updated:** 2025-12-21T13:33:53.000Z
**Auth System:** OAuth 2.0 / OpenID Connect (v1.7.0+)  
**Primary Library:** `lib/auth-oauth.js`

---

## Overview

Launchmass uses **OAuth 2.0 Authorization Code flow** with **OpenID Connect** for authentication via the central SSO system at `sso.doneisbetter.com`.

### Key Features

- OAuth 2.0 / OpenID Connect standard compliance
- HttpOnly session cookies with 24-hour expiration
- Automatic user sync to local MongoDB
- Comprehensive audit logging
- Server-side and client-side session validation
- Organization-scoped permissions
- SSO permission synchronization

### Critical Requirement

**Admin features ONLY work on `*.doneisbetter.com` subdomains**

- Production: `launchmass.doneisbetter.com`
- Localhost admin access: ❌ NOT POSSIBLE (cookie domain mismatch)
- Testing: Use Vercel preview deployments with `*.doneisbetter.com` subdomain

---

## OAuth 2.0 Flow

### Step-by-Step Authentication

1. **User Access**: User visits `/admin` on launchmass.doneisbetter.com

2. **Session Check**: Server checks for `sso_session` HttpOnly cookie
   - Cookie contains: OAuth tokens (access_token, id_token, refresh_token) + user data
   - Cookie format: Base64-encoded JSON
   - Domain: `.doneisbetter.com`
   - Secure, HttpOnly, SameSite=Lax

3. **No Session → OAuth Redirect**:
   ```
   https://sso.doneisbetter.com/api/oauth/authorize?
     client_id=<CLIENT_ID>&
     redirect_uri=https://launchmass.doneisbetter.com/api/oauth/callback&
     response_type=code&
     scope=openid+profile+email+offline_access&
     state=/admin
   ```

4. **User Authenticates**: User logs into SSO (or already logged in)

5. **OAuth Callback**: SSO redirects back with authorization code:
   ```
   https://launchmass.doneisbetter.com/api/oauth/callback?
     code=<AUTHORIZATION_CODE>&
     state=/admin
   ```

6. **Token Exchange**: `/api/oauth/callback` handler:
   - POSTs to `sso.doneisbetter.com/api/oauth/token`
   - Body: `{ grant_type, code, redirect_uri, client_id, client_secret }`
   - Receives: `{ access_token, id_token, refresh_token, expires_in }`

7. **User Info Extraction**: Decode ID token (JWT) for user claims:
   ```json
   {
     "sub": "user-unique-id",
     "email": "user@example.com",
     "name": "User Name",
     "role": "admin",
     "iat": 1234567890,
     "exp": 1234571490
   }
   ```

8. **Session Storage**: Set `sso_session` HttpOnly cookie with:
   ```json
   {
     "access_token": "...",
     "id_token": "...",
     "refresh_token": "...",
     "user": { "id", "email", "name", "role" },
     "expires_at": 1234571490000
   }
   ```

9. **User Sync**: Call `upsertUserFromSso(user)` to create/update user in MongoDB

10. **Audit Log**: Record auth event in `authLogs` collection

11. **Redirect**: Send user to original destination (`state` parameter)

12. **Authenticated**: User can now access admin features

---

## Environment Variables

### Required (Server-Side)

```bash
# SSO Server
SSO_SERVER_URL=https://sso.doneisbetter.com

# OAuth Client Credentials (from SSO admin panel)
SSO_CLIENT_ID=your-oauth-client-id
SSO_CLIENT_SECRET=your-oauth-client-secret  # SENSITIVE - server only

# OAuth Callback
SSO_REDIRECT_URI=https://launchmass.doneisbetter.com/api/oauth/callback

# Database
MONGODB_URI=mongodb+srv://...
DB_NAME=launchmass
```

### Required (Client-Side - NEXT_PUBLIC_ prefix)

```bash
NEXT_PUBLIC_SSO_SERVER_URL=https://sso.doneisbetter.com
NEXT_PUBLIC_SSO_CLIENT_ID=your-oauth-client-id
NEXT_PUBLIC_SSO_REDIRECT_URI=https://launchmass.doneisbetter.com/api/oauth/callback
```

### Security Notes

- **Client Secret**: NEVER expose to browser, server-side only
- **Redirect URI**: Must match exactly in SSO admin panel
- **Scopes**: `openid profile email offline_access` (OpenID Connect + refresh)

---

## Code Examples

### Protected Page (SSR)

```javascript
// pages/admin/index.js
import { validateSsoSession, getOAuthLoginUrl } from '../../lib/auth-oauth.js';

export async function getServerSideProps(context) {
  const { isValid, user } = await validateSsoSession(context.req);
  
  if (!isValid) {
    const loginUrl = getOAuthLoginUrl(context.resolvedUrl);
    return {
      redirect: {
        destination: loginUrl,
        permanent: false,
      },
    };
  }
  
  return { props: { user } };
}

export default function AdminPage({ user }) {
  return <div>Welcome, {user.name}!</div>;
}
```

### Protected API Route

```javascript
// pages/api/cards/index.js
import { withSsoAuth } from '../../../lib/auth-oauth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Public read - no auth needed
    return res.json({ cards });
  }
  
  if (req.method === 'POST') {
    // Protected write - requires auth
    return withSsoAuth(async (req, res) => {
      // req.user is available here
      console.log('Authenticated user:', req.user.email);
      // ... create card logic
    })(req, res);
  }
}
```

### Protected API Route with Org Permission

```javascript
// pages/api/cards/[id].js
import { withOrgPermission } from '../../../lib/auth-oauth.js';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    return withOrgPermission('cards.delete', async (req, res) => {
      // req.user authenticated AND has cards.delete permission
      // req.orgContext contains organization info
      // ... delete card logic
    })(req, res);
  }
}
```

### Client-Side Session Monitoring

```javascript
// pages/admin/index.js
useEffect(() => {
  const checkSession = async () => {
    const res = await fetch('/api/auth/validate');
    const { isValid } = await res.json();
    if (!isValid) {
      // Trigger page reload - SSR will redirect to OAuth login
      window.location.reload();
    }
  };
  
  // Check every 5 minutes
  const interval = setInterval(checkSession, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

---

## Database Schema

### users Collection

```javascript
{
  ssoUserId: String,        // Unique - from OAuth sub claim
  email: String,            // User email
  name: String,             // Display name
  ssoRole: String,          // Role from SSO (deprecated)
  appRole: String,          // 'user' | 'admin' (v1.13.0+)
  appStatus: String,        // 'active' | 'pending' | 'suspended'
  hasAccess: Boolean,       // Access control flag
  isAdmin: Boolean,         // Legacy admin flag
  localPermissions: Object, // Future granular permissions
  lastLoginAt: String,      // ISO 8601 timestamp
  createdAt: String,        // ISO 8601 timestamp
  updatedAt: String         // ISO 8601 timestamp
}

// Indexes:
// - { ssoUserId: 1 } unique
// - { email: 1 }
// - { appRole: 1 }
// - { appStatus: 1 }
```

### authLogs Collection

```javascript
{
  ssoUserId: String,   // User ID (null if unavailable)
  email: String,       // User email (null if unavailable)
  status: String,      // 'success' | 'invalid' | 'error'
  message: String,     // Context message
  ip: String,          // Client IP (from x-forwarded-for)
  userAgent: String,   // Browser user agent
  createdAt: String    // ISO 8601 timestamp
}

// Indexes:
// - { createdAt: -1 }
// - { ssoUserId: 1, createdAt: -1 }
```

### organizationMembers Collection

```javascript
{
  orgUuid: String,     // Organization UUID
  ssoUserId: String,   // User ID from SSO
  role: String,        // 'user' | 'admin'
  addedBy: String,     // SSO user ID
  createdAt: String,   // ISO 8601 timestamp
  updatedAt: String    // ISO 8601 timestamp
}

// Indexes:
// - { orgUuid: 1, ssoUserId: 1 } unique compound
// - { ssoUserId: 1 }
// - { role: 1 }
```

---

## Permission System

### Permission Matrix

```javascript
// lib/permissions.js

const PERMISSIONS = {
  // Card permissions
  'cards.read': ['user', 'admin'],
  'cards.write': ['user', 'admin'],
  'cards.delete': ['admin'],
  
  // Organization permissions
  'org.read': ['user', 'admin'],
  'org.write': ['admin'],
  'org.delete': ['admin'],
  
  // Member permissions
  'members.read': ['user', 'admin'],
  'members.write': ['admin'],
};
```

### Middleware Usage

```javascript
import { withOrgPermission } from '../lib/auth-oauth.js';

// Requires auth + org context + specific permission
export default withOrgPermission('cards.write', async (req, res) => {
  // req.user: authenticated user
  // req.orgContext: organization context
  // User has cards.write permission for this org
});
```

---

## Logout Flow

### Server-Side Logout

```javascript
// pages/api/auth/logout.js
import { logoutOAuth } from '../../lib/auth-oauth.js';

export default async function handler(req, res) {
  const ssoLogoutUrl = logoutOAuth(res); // Clears session cookie
  return res.json({ logoutUrl: ssoLogoutUrl });
}
```

### Client-Side Logout

```javascript
const handleLogout = async () => {
  const res = await fetch('/api/auth/logout');
  const { logoutUrl } = await res.json();
  // Redirect to SSO logout (clears SSO session)
  window.location.href = logoutUrl;
};
```

---

## Troubleshooting

### "Infinite redirect loop to SSO"

**Cause:** App not on `*.doneisbetter.com` subdomain  
**Fix:** Ensure domain is `launchmass.doneisbetter.com`, not localhost

### "Redirect URI mismatch" error

**Cause:** OAuth callback URL doesn't match SSO registration  
**Fix:** Verify in SSO admin panel:
```
Redirect URI: https://launchmass.doneisbetter.com/api/oauth/callback
```

### "Invalid client_id" error

**Cause:** Client ID not configured or incorrect  
**Fix:** Check `SSO_CLIENT_ID` environment variable

### "Unauthorized client" error

**Cause:** Client secret missing or incorrect  
**Fix:** Check `SSO_CLIENT_SECRET` (server-side only, never in NEXT_PUBLIC_)

### "401 Unauthorized" on API calls

**Cause:** Session expired or cookies not sent  
**Fix:** Verify `credentials: 'include'` in fetch calls (already implemented)

### Session not persisting

**Cause:** Cookie domain mismatch  
**Fix:** Must use `*.doneisbetter.com` subdomain, not localhost

---

## Security Best Practices

1. **Client Secret**: Never expose to browser, environment variable server-side only
2. **HttpOnly Cookies**: Prevent XSS attacks by making tokens inaccessible to JavaScript
3. **Secure Flag**: Cookies only sent over HTTPS
4. **SameSite**: Lax setting prevents CSRF while allowing OAuth redirects
5. **Token Expiration**: 24-hour sessions with refresh token capability
6. **Audit Logging**: All auth attempts logged for security monitoring
7. **IP Tracking**: Client IP recorded for suspicious activity detection
8. **PKCE-Ready**: Architecture supports PKCE extension for additional security

---

## Migrating from v1.5.0 Cookie-Forwarding

If upgrading from v1.5.0 SSO cookie-forwarding approach:

1. ✅ Get OAuth client credentials from SSO admin panel
2. ✅ Update all imports: `lib/auth.js` → `lib/auth-oauth.js`
3. ✅ Set OAuth environment variables (client_id, client_secret)
4. ✅ Update SSR guards to use `getOAuthLoginUrl()` for redirects
5. ✅ No database migration needed (users collection compatible)
6. ✅ Test OAuth flow on `*.doneisbetter.com` subdomain
7. ✅ Users will re-authenticate via OAuth on first access

**See `docs/archive/OAUTH_MIGRATION_v1.6.0.md` for detailed migration history.**

---

## Related Documentation

- **ARCHITECTURE.md** - Authentication System section
- **WARP.md** - Development setup and OAuth configuration
- **LEARNINGS.md** - OAuth 2.0 Migration insights
- **lib/auth-oauth.js** - Source code with detailed comments
- **docs/archive/** - Historical authentication docs (v1.5.0, v1.6.0)

---

## Support

For authentication issues:
1. Check this guide first
2. Review ARCHITECTURE.md for system overview
3. Check `authLogs` collection in MongoDB for error details
4. Verify environment variables are set correctly
5. Ensure app running on `*.doneisbetter.com` subdomain

**Last Updated:** 2025-12-21T13:33:53.000Z  
**Current Version:** v1.13.0  
**Auth Library:** lib/auth-oauth.js (v1.7.0+)
