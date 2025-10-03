# OAuth 2.0 / OpenID Connect Setup for SSO

**Date:** 2025-10-02T14:40:52.000Z  
**SSO System:** sso.doneisbetter.com  
**Authentication Flow:** OAuth 2.0 Authorization Code with PKCE + OpenID Connect

---

## 🔑 Current Status

**SSO uses OAuth 2.0, NOT simple cookie forwarding!**

The initial implementation (v1.5.0) incorrectly assumed cookie-based sessions. The SSO system actually uses:
- OAuth 2.0 authorization code flow
- OpenID Connect for identity
- Client ID/Secret authentication
- Redirect URI callbacks

---

## 📋 OAuth Client Configuration

You've registered **launchmass** as an OAuth client in the SSO admin panel with:

```
Client Name: launchmass
Status: Active
Homepage: 🔗 (launchmass.doneisbetter.com)

Client ID: [YOUR_CLIENT_ID_FROM_SSO_ADMIN]
Client Secret: [SHOWN_IN_SSO_ADMIN_PANEL]

Redirect URIs:
- https://launchmass.doneisbetter.com/auth/callback
- https://launchmass.doneisbetter.com/api/oauth/callback

Allowed Scopes:
- openid
- profile
- email
- offline_access
```

---

## 🚀 Required Environment Variables

Add these to **Vercel** environment variables and `.env.local`:

```bash
# OAuth Client Credentials (from SSO admin panel)
SSO_CLIENT_ID=<your-client-id>
SSO_CLIENT_SECRET=<your-client-secret>

# OAuth Configuration
SSO_SERVER_URL=https://sso.doneisbetter.com
SSO_REDIRECT_URI=https://launchmass.doneisbetter.com/api/oauth/callback

# Public OAuth Config (for client-side redirects)
NEXT_PUBLIC_SSO_SERVER_URL=https://sso.doneisbetter.com
NEXT_PUBLIC_SSO_CLIENT_ID=<your-client-id>
NEXT_PUBLIC_SSO_REDIRECT_URI=https://launchmass.doneisbetter.com/api/oauth/callback

# Legacy SSO Config (deprecated - can be removed)
# SSO_COOKIE_DOMAIN=.doneisbetter.com
# SSO_LOGIN_PATH=/
# SSO_LOGOUT_PATH=/logout
```

---

## 🔄 OAuth 2.0 Authentication Flow

### 1. User Visits `/admin`

```
User → https://launchmass.doneisbetter.com/admin
```

### 2. No Session → Redirect to SSO Authorization

```
getServerSideProps → validateSsoSession(req)
  ↓ No sso_session cookie found
  ↓ Redirect to OAuth login URL

User → https://sso.doneisbetter.com/oauth/authorize?
         client_id=<CLIENT_ID>&
         redirect_uri=https://launchmass.doneisbetter.com/api/oauth/callback&
         response_type=code&
         scope=openid+profile+email+offline_access&
         state=/admin
```

### 3. User Logs Into SSO

```
User enters credentials at sso.doneisbetter.com
SSO validates and generates authorization code
```

### 4. SSO Redirects Back with Authorization Code

```
SSO → https://launchmass.doneisbetter.com/api/oauth/callback?
        code=AUTH_CODE_HERE&
        state=/admin
```

### 5. Exchange Authorization Code for Tokens

```
/api/oauth/callback handler:
  POST https://sso.doneisbetter.com/api/oauth/token
    Body: {
      grant_type: "authorization_code",
      code: "AUTH_CODE_HERE",
      redirect_uri: "https://launchmass.doneisbetter.com/api/oauth/callback",
      client_id: "<CLIENT_ID>",
      client_secret: "<CLIENT_SECRET>"
    }
  
  Response: {
    access_token: "...",
    id_token: "...",  // JWT with user claims
    refresh_token: "...",
    expires_in: 3600
  }
```

### 6. Decode ID Token for User Info

```
ID Token (JWT) contains:
{
  sub: "user-unique-id",
  email: "user@example.com",
  name: "User Name",
  role: "admin",
  iat: 1234567890,
  exp: 1234571490
}
```

### 7. Store Session in Cookie

```
Set-Cookie: sso_session=<base64-encoded-json>;
  HttpOnly; Secure; SameSite=Lax;
  Domain=.doneisbetter.com; Max-Age=86400

Session Data:
{
  access_token: "...",
  id_token: "...",
  refresh_token: "...",
  user: { id, email, name, role },
  expires_at: timestamp
}
```

### 8. Sync User to MongoDB

```
upsertUserFromSso(user):
  - Create/update user in `users` collection
  - Set isAdmin: true on first insert
  - Update lastLoginAt timestamp
  
recordAuthEvent(...):
  - Log authentication success to `authLogs` collection
```

### 9. Redirect to Original Destination

```
User → https://launchmass.doneisbetter.com/admin
  (now with valid sso_session cookie)
```

---

## 📂 Files Created for OAuth Integration

### `/pages/api/oauth/callback.js`
- Handles OAuth callback from SSO
- Exchanges authorization code for tokens
- Decodes ID token for user info
- Stores session in HttpOnly cookie
- Syncs user to MongoDB
- Redirects to original destination

### `/lib/auth-oauth.js`
- `getOAuthLoginUrl(redirectAfter)` - Constructs OAuth authorization URL
- `validateSsoSession(req)` - Validates session from cookie
- `withSsoAuth(handler)` - Middleware wrapper for API routes
- `logoutOAuth(res)` - Clears session cookie and returns SSO logout URL

---

## 🔧 Required Code Changes

### 1. Update Admin Page SSR Guard

Replace `lib/auth.js` import with `lib/auth-oauth.js`:

```javascript
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
```

### 2. Update API Routes

Replace `lib/auth.js` import with `lib/auth-oauth.js`:

```javascript
import { withSsoAuth } from '../../../lib/auth-oauth.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return withSsoAuth(async (req, res) => {
      // req.user contains authenticated user
      // Protected operation
    })(req, res);
  }
}
```

### 3. Update Client-Side Session Validation

Replace `/api/auth/validate.js` to check cookie-based session:

```javascript
import { validateSsoSession } from '../../../lib/auth-oauth.js';

export default async function handler(req, res) {
  const { isValid, user } = await validateSsoSession(req);
  return res.json({ isValid, user });
}
```

---

## ✅ Deployment Checklist

- [ ] Get Client ID from SSO admin panel
- [ ] Get Client Secret from SSO admin panel  
- [ ] Add SSO_CLIENT_ID to Vercel environment variables
- [ ] Add SSO_CLIENT_SECRET to Vercel environment variables
- [ ] Add NEXT_PUBLIC_SSO_CLIENT_ID to Vercel environment variables
- [ ] Verify redirect URIs match in SSO admin (`/api/oauth/callback`)
- [ ] Deploy new OAuth callback handler
- [ ] Update admin page to use `auth-oauth.js`
- [ ] Update all API routes to use `auth-oauth.js`
- [ ] Test OAuth flow end-to-end
- [ ] Verify user creation in MongoDB
- [ ] Verify audit logging in MongoDB

---

## 🧪 Testing OAuth Flow

### 1. Clear Cookies
```javascript
// In browser console
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

### 2. Visit Admin Page
```
https://launchmass.doneisbetter.com/admin
```

### 3. Expected Behavior
- Redirects to `sso.doneisbetter.com/oauth/authorize?...`
- Shows SSO login page
- After login, redirects to `/api/oauth/callback?code=...`
- Callback exchanges code for tokens
- Sets `sso_session` cookie
- Redirects back to `/admin`
- Admin page loads with user info

### 4. Verify in DevTools
- **Network tab**: Check redirect chain
- **Application → Cookies**: Verify `sso_session` cookie exists
- **Console**: Check for errors

### 5. Verify in MongoDB
```javascript
// Check users collection
db.users.find({ email: "your@email.com" })

// Check authLogs collection
db.authLogs.find({ email: "your@email.com" }).sort({ createdAt: -1 }).limit(5)
```

---

## 🚨 Troubleshooting

### "Redirect URI mismatch" error
**Problem:** SSO rejects callback because URI doesn't match  
**Solution:** Verify redirect URI in SSO admin exactly matches:
```
https://launchmass.doneisbetter.com/api/oauth/callback
```

### "Invalid client_id" error
**Problem:** Client ID not configured or wrong  
**Solution:** Copy Client ID from SSO admin panel, add to environment variables

### "Unauthorized client" error
**Problem:** Client Secret missing or incorrect  
**Solution:** Copy Client Secret from SSO admin panel, add to environment variables (server-side only!)

### User redirected but no session
**Problem:** Cookie not being set (domain mismatch or SameSite issues)  
**Solution:** Verify app running on `*.doneisbetter.com`, not localhost

### Token exchange fails (401/403)
**Problem:** Client credentials invalid or token endpoint wrong  
**Solution:** Check `SSO_CLIENT_SECRET` and verify endpoint is `/api/oauth/token`

---

## 📚 OAuth 2.0 / OpenID Connect Resources

- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core Spec](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

---

**Next Steps:** 
1. Get Client ID and Client Secret from SSO admin panel
2. Add to Vercel environment variables
3. Deploy OAuth callback handler
4. Test authentication flow

**Status:** OAuth implementation ready, awaiting client credentials from SSO admin panel.
