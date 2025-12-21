# OAuth 2.0 Migration — v1.6.0

**Date:** 2025-10-03T09:27:40.000Z  
**Status:** ⚠️ Historical Document (OAuth completed in v1.7.0)  
**Build:** ✅ Passed (1459ms)
**Note:** OAuth 2.0 successfully implemented and deployed. See AUTH_CURRENT.md for current implementation.

---

## 🎯 What Changed

### The Problem (v1.5.0)
The v1.5.0 implementation assumed SSO used simple cookie-based sessions that could be validated by forwarding cookies to `/api/sso/validate`. **This was incorrect.**

The actual SSO system at `sso.doneisbetter.com` uses:
- **OAuth 2.0** authorization code flow
- **OpenID Connect** for identity
- **Client ID/Secret** authentication
- **Redirect URI** callbacks

### The Solution (v1.6.0)
Complete rewrite of authentication to use proper OAuth 2.0 / OpenID Connect flow:

✅ OAuth callback handler (`/api/oauth/callback`)  
✅ OAuth authentication library (`lib/auth-oauth.js`)  
✅ Updated admin page SSR guard to use OAuth  
✅ Updated all API routes to use OAuth middleware  
✅ Updated session validation endpoint  
✅ Environment variables configured for OAuth  

---

## 📂 Files Created

### 1. `/pages/api/oauth/callback.js` (118 lines)
**Purpose:** OAuth 2.0 callback handler

**What it does:**
- Receives authorization code from SSO after user login
- Exchanges code for access_token, id_token, refresh_token
- Decodes ID token JWT to extract user info (email, name, sub, role)
- Stores tokens in HttpOnly cookie (`sso_session`)
- Syncs user to MongoDB `users` collection
- Logs auth event to MongoDB `authLogs` collection
- Redirects back to original destination

### 2. `/lib/auth-oauth.js` (189 lines)
**Purpose:** OAuth authentication library

**Functions:**
- `getOAuthLoginUrl(redirectAfter)` - Constructs OAuth authorization URL
- `validateSsoSession(req)` - Validates session from cookie
- `withSsoAuth(handler)` - Middleware wrapper for API routes
- `logoutOAuth(res)` - Clears session cookie and returns logout URL

### 3. `OAUTH_SETUP.md` (357 lines)
**Purpose:** Complete OAuth setup and configuration guide

**Contains:**
- OAuth flow diagrams
- Environment variable requirements
- Client credentials setup instructions
- Deployment checklist
- Testing procedures
- Troubleshooting guide

---

## 📝 Files Modified

### Admin Page (`pages/admin/index.js`)
**Changed:**
- Import: `lib/auth.js` → `lib/auth-oauth.js`
- SSR guard now uses `getOAuthLoginUrl()` for redirects
- User props changed: `ssoUserId` → `id`, added `role`
- Comments updated to reflect OAuth flow

### API Routes (5 files)
**Changed in all:**
- Import: `lib/auth.js` → `lib/auth-oauth.js`
- `withSsoAuth` now validates OAuth session from cookie
- Error responses include OAuth login URL

**Files updated:**
- `/api/cards/index.js`
- `/api/cards/[id].js`
- `/api/cards/reorder.js`
- `/api/organizations/index.js`
- `/api/organizations/[uuid].js`

### Session Validation (`pages/api/auth/validate.js`)
**Changed:**
- Import: `lib/auth.js` → `lib/auth-oauth.js`
- Now validates OAuth session from sso_session cookie
- Comments updated to reflect OAuth token validation

### Environment Config (`.env.local`)
**Added:**
```bash
SSO_CLIENT_ID=your-client-id-here
SSO_CLIENT_SECRET=your-client-secret-here
SSO_REDIRECT_URI=https://launchmass.doneisbetter.com/api/oauth/callback
NEXT_PUBLIC_SSO_CLIENT_ID=your-client-id-here
NEXT_PUBLIC_SSO_REDIRECT_URI=https://launchmass.doneisbetter.com/api/oauth/callback
```

**Deprecated (commented out):**
```bash
# SSO_COOKIE_DOMAIN=.doneisbetter.com
# SSO_LOGIN_PATH=/
# SSO_LOGOUT_PATH=/logout
```

---

## 🔄 OAuth 2.0 Authentication Flow

### Before (v1.5.0 - INCORRECT)
```
User → /admin
  ↓ No session
  ↓ Redirect to: sso.doneisbetter.com/?redirect=...
  ↓ User can't login (no login form, only API documentation)
  ✗ STUCK - No way to authenticate
```

### After (v1.6.0 - CORRECT)
```
1. User → https://launchmass.doneisbetter.com/admin
   
2. getServerSideProps validates session
   No sso_session cookie → Generate OAuth URL
   
3. Redirect to: https://sso.doneisbetter.com/oauth/authorize?
     client_id=<CLIENT_ID>&
     redirect_uri=https://launchmass.doneisbetter.com/api/oauth/callback&
     response_type=code&
     scope=openid+profile+email+offline_access&
     state=/admin

4. User logs into SSO (email + token or credentials)
   
5. SSO redirects back: /api/oauth/callback?code=AUTH_CODE&state=/admin

6. Callback handler:
   - POST to sso.doneisbetter.com/api/oauth/token
   - Exchange code for tokens (access_token, id_token, refresh_token)
   - Decode ID token JWT for user info
   - Store in HttpOnly cookie (sso_session)
   - Sync user to MongoDB
   - Log auth event

7. Redirect to: /admin (now with valid session)
   
8. Admin page loads with user info ✅
```

---

## 🚀 Deployment Steps

### Step 1: Get OAuth Client Credentials

In your SSO admin panel at `https://sso.doneisbetter.com/admin`:

1. Find the "launchmass" OAuth client
2. Copy the **Client ID**
3. Copy the **Client Secret**

### Step 2: Add Environment Variables to Vercel

Go to Vercel Project Settings → Environment Variables:

```bash
# OAuth Client Credentials (from SSO admin)
SSO_CLIENT_ID=<paste-your-client-id>
SSO_CLIENT_SECRET=<paste-your-client-secret>

# OAuth Configuration
SSO_SERVER_URL=https://sso.doneisbetter.com
SSO_REDIRECT_URI=https://launchmass.doneisbetter.com/api/oauth/callback

# Public OAuth Config (for client-side)
NEXT_PUBLIC_SSO_SERVER_URL=https://sso.doneisbetter.com
NEXT_PUBLIC_SSO_CLIENT_ID=<paste-your-client-id>
NEXT_PUBLIC_SSO_REDIRECT_URI=https://launchmass.doneisbetter.com/api/oauth/callback

# Keep existing
MONGODB_URI=<existing-value>
DB_NAME=launchmass
```

### Step 3: Verify Redirect URI in SSO Admin

Ensure the redirect URI in SSO admin panel exactly matches:
```
https://launchmass.doneisbetter.com/api/oauth/callback
```

### Step 4: Deploy to Production

```bash
git add -A
git commit -m "feat(auth): migrate to OAuth 2.0 authentication — v1.6.0"
git push origin main
```

Vercel will automatically deploy.

### Step 5: Test OAuth Flow

1. Visit: `https://launchmass.doneisbetter.com/admin`
2. Should redirect to: `sso.doneisbetter.com/oauth/authorize?...`
3. Login with your SSO credentials
4. Should redirect back to admin page with session
5. Check MongoDB `users` and `authLogs` collections

---

## 🆚 Comparison: v1.5.0 vs v1.6.0

| Aspect | v1.5.0 (Cookie Forwarding) | v1.6.0 (OAuth 2.0) |
|--------|----------------------------|-------------------|
| **Auth Method** | Cookie forwarding to `/api/sso/validate` | OAuth 2.0 authorization code flow |
| **Login URL** | `sso.doneisbetter.com/?redirect=...` | `sso.doneisbetter.com/oauth/authorize?client_id=...` |
| **Credentials** | None needed | Client ID + Client Secret |
| **Token Storage** | Assumed SSO cookies | Our own `sso_session` cookie with OAuth tokens |
| **User Login** | ❌ No login form (API only) | ✅ Proper OAuth login flow |
| **Session Validation** | Forward cookies to SSO | Validate our cookie locally |
| **Status** | ❌ Broken - can't authenticate | ✅ Works with proper OAuth credentials |

---

## 🔐 Security Improvements

### v1.6.0 OAuth Implementation

✅ **OAuth 2.0 Standard Flow**
- Industry-standard authorization code flow
- Client credentials never exposed to browser
- PKCE-ready architecture

✅ **Token Security**
- Tokens stored in HttpOnly cookies
- Cannot be accessed by JavaScript (XSS protection)
- Domain-scoped to .doneisbetter.com

✅ **Session Management**
- 24-hour token expiration
- Client-side session monitoring (5-minute intervals)
- Automatic re-authentication on expiration

✅ **Audit Trail**
- All OAuth login attempts logged
- IP address and user agent tracked
- MongoDB `authLogs` collection for compliance

---

## 📚 Documentation Updates Needed

After deployment, update these files:

### README.md
- ✅ OAuth setup instructions
- ✅ Client ID/Secret configuration
- ✅ Redirect URI explanation

### ARCHITECTURE.md
- ✅ OAuth flow diagram
- ✅ Token management explanation
- ✅ Updated environment variables

### WARP.md
- ✅ OAuth configuration section
- ✅ Client credentials requirement

### RELEASE_NOTES.md
- ✅ v1.6.0 changelog
- ✅ Breaking changes note
- ✅ Migration instructions

---

## ⚠️ Breaking Changes

### For Developers
- ❌ `lib/auth.js` is now **deprecated** (use `lib/auth-oauth.js`)
- ✅ Must add OAuth client credentials to environment variables
- ✅ Redirect URI must match exactly in SSO admin panel

### For Users
- No changes - authentication flow transparent to end users
- First-time login still auto-grants admin rights
- Session expiration handled gracefully with auto-redirect

---

## 🧪 Testing Checklist

After deployment with client credentials:

- [ ] Visit `/admin` without session → Redirects to OAuth authorize
- [ ] SSO shows proper login page (not API docs)
- [ ] After login → Redirects to `/api/oauth/callback?code=...`
- [ ] Callback exchanges code for tokens successfully
- [ ] Sets `sso_session` cookie (check DevTools)
- [ ] Redirects back to `/admin`
- [ ] Admin page loads with user info in header
- [ ] Check MongoDB `users` collection → User created
- [ ] Check MongoDB `authLogs` collection → Auth event logged
- [ ] Create/edit/delete cards → All work
- [ ] Session monitoring works (wait 5 minutes, should stay logged in)
- [ ] Logout button works
- [ ] After logout, `/admin` redirects to OAuth login again

---

## 🚨 Known Issues / Limitations

### Localhost Admin Access
❌ **Admin features DO NOT work on localhost**

**Reason:** OAuth callback requires `https://launchmass.doneisbetter.com` as redirect URI. SSO rejects localhost URIs for security.

**Workaround:** Use Vercel preview deployments with `*.doneisbetter.com` subdomain for testing.

### Client Credentials Required
⚠️ **App won't work until you add Client ID and Secret**

Without credentials, OAuth callback will fail with:
- `oauth_config_missing` error
- Or redirect to `/?error=token_exchange_failed`

**Solution:** Get credentials from SSO admin panel and add to Vercel environment variables.

---

## 📊 Success Metrics

**Code Quality:**
- ✅ Build passes without errors
- ✅ All imports updated to OAuth library
- ✅ Comprehensive error handling
- ✅ Detailed comments explaining OAuth flow

**Process:**
- ✅ Version bumped: 1.5.0 → 1.6.0 (MINOR)
- ✅ OAuth callback handler created
- ✅ OAuth auth library created
- ✅ All routes updated
- ✅ Environment variables configured
- ✅ Documentation created (OAUTH_SETUP.md)

**Pending:**
- ⏳ Client credentials from SSO admin
- ⏳ Vercel environment variables added
- ⏳ Production deployment
- ⏳ End-to-end OAuth flow tested
- ⏳ Final documentation updates

---

## 🏁 Next Steps

1. **Get Client Credentials**
   - Login to SSO admin: `https://sso.doneisbetter.com/admin`
   - Find "launchmass" OAuth client
   - Copy Client ID and Client Secret

2. **Configure Vercel**
   - Add `SSO_CLIENT_ID` environment variable
   - Add `SSO_CLIENT_SECRET` environment variable
   - Add `NEXT_PUBLIC_SSO_CLIENT_ID` environment variable

3. **Deploy and Test**
   - Commit and push OAuth changes
   - Test OAuth flow end-to-end
   - Verify user creation and audit logging

4. **Update Documentation**
   - Update README, ARCHITECTURE, WARP with OAuth details
   - Add v1.6.0 to RELEASE_NOTES
   - Mark v1.5.0 SSO approach as deprecated

---

**Status:** ✅ OAuth implementation complete, ready for deployment with client credentials.

**Prepared by:** AI Agent (Warp)  
**Date:** 2025-10-03T09:27:40.000Z  
**Version:** 1.6.0  
**Build Status:** ✅ Passed
