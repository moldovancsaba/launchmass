/**
 * OAuth-based SSO Authentication Library
 * 
 * Functional: Validates OAuth-based SSO sessions from cookie or initiates OAuth flow
 * Strategic: Supports OAuth 2.0 / OpenID Connect authentication pattern
 */

import { recordAuthEvent, getUsersCollection } from './users.js';
import { verifySession } from './session.js';
import { isSuperAdmin } from './permissions.js';

/**
 * Session cookie domain, env-driven with a default matching today's production host
 *
 * Functional: Returns the Domain= scope for the sso_session cookie.
 * Strategic: Currently launchmass is pinned to launchmass.doneisbetter.com (see
 * README.md/ARCHITECTURE.md/AUTH_CURRENT.md) — a different apex domain from
 * camera/messmass's shared .messmass.com. That's load-bearing today (it's how Vercel
 * preview deployments on *.doneisbetter.com subdomains keep working) so the default
 * here preserves it exactly. If launchmass is ever migrated onto a messmass.com
 * subdomain to share a session with camera/messmass, set SESSION_COOKIE_DOMAIN to the
 * new value — no further code change needed once DNS/SSO-client-redirect-URI/Vercel
 * domain config are updated for the new host.
 */
export function sessionCookieDomain() {
  return process.env.SESSION_COOKIE_DOMAIN?.trim() || '.doneisbetter.com';
}

/**
 * Initiates OAuth login flow by redirecting to SSO authorization endpoint
 * 
 * Functional: Constructs OAuth authorization URL with client_id, redirect_uri, scopes, state
 * Strategic: Follows OAuth 2.0 authorization code flow for secure authentication
 * 
 * @param {string} redirectAfterLogin - Where to send user after successful login
 * @returns {string} Authorization URL to redirect user to
 */
export function getOAuthLoginUrl(redirectAfterLogin = '/admin') {
  const ssoServerUrl = process.env.SSO_SERVER_URL || 'https://sso.doneisbetter.com';
  const clientId = process.env.SSO_CLIENT_ID;
  const redirectUri = process.env.SSO_REDIRECT_URI || 'https://launchmass.doneisbetter.com/api/oauth/callback';
  
  // Functional: Build OAuth authorization URL per OAuth 2.0 spec
  // Strategic: state parameter preserves user's intended destination across auth flow
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email offline_access',
    state: redirectAfterLogin,
  });

  return `${ssoServerUrl}/api/oauth/authorize?${params.toString()}`;
}

/**
 * Validates SSO session from stored OAuth tokens in cookie
 * 
 * Functional: Reads sso_session cookie, validates tokens, checks expiration
 * Strategic: OAuth tokens stored in HttpOnly cookie prevent XSS, validated server-side
 * 
 * @param {Object} req - Next.js request object with headers
 * @returns {Promise<Object>} { isValid: boolean, user?: Object }
 */
export async function validateSsoSession(req) {
  try {
    // Functional: Extract sso_session cookie from request
    // Strategic: OAuth tokens stored in base64-encoded JSON in HttpOnly cookie
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [key, ...v] = c.split('=');
        return [key, v.join('=')];
      })
    );

    const sessionCookie = cookies.sso_session;
    if (!sessionCookie) {
      // Functional: No session cookie found
      // Strategic: User needs to initiate OAuth login flow
      await recordAuthEvent({
        ssoUserId: null,
        email: null,
        status: 'invalid',
        message: 'No session cookie present',
        ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      return { isValid: false };
    }

    // Functional: Verify the HMAC signature before trusting the cookie contents.
    // Strategic: A plain base64 cookie is forgeable into an admin session; verifySession
    //   returns null unless the payload was signed with the server secret.
    const sessionData = verifySession(sessionCookie);
    if (!sessionData) {
      await recordAuthEvent({
        ssoUserId: null,
        email: null,
        status: 'invalid',
        message: 'Invalid or tampered session',
        ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      return { isValid: false };
    }

    // Functional: Check if session has expired (value is signed, so tamper-proof)
    // Strategic: Expired sessions require re-authentication
    if (!sessionData.expires_at || sessionData.expires_at < Date.now()) {
      await recordAuthEvent({
        ssoUserId: sessionData.user?.id || null,
        email: sessionData.user?.email || null,
        status: 'invalid',
        message: 'Session expired',
        ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      return { isValid: false };
    }

    // Functional: Identity comes from the (now verified) cookie.
    const identity = sessionData.user;
    if (!identity || !identity.id) {
      return { isValid: false };
    }

    // Functional: Authorize against the DB, which is the source of truth — NOT the cookie.
    // Strategic: The cookie only proves identity. Role/access live in the DB and can be
    //   revoked by an admin; those changes must take effect immediately. Previously this
    //   path called upsertUserFromSso(cookieUser), which let a stale/forged cookie
    //   overwrite the DB record — so revocation never stuck. We no longer write here.
    const users = await getUsersCollection();
    const dbUser = await users.findOne({ ssoUserId: identity.id });
    if (!dbUser || dbUser.hasAccess === false || dbUser.appStatus === 'suspended') {
      await recordAuthEvent({
        ssoUserId: identity.id,
        email: identity.email || null,
        status: 'invalid',
        message: 'Access revoked or user not found',
        ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      return { isValid: false };
    }

    // WHAT: No success audit-log write here.
    // WHY: validateSsoSession runs on every authenticated request (and 5-min client polls);
    //   logging success each time floods authLogs. Login is recorded once in the OAuth callback.
    return { isValid: true, user: dbUser };

  } catch (error) {
    // Functional: Handle session validation errors
    // Strategic: Log errors for debugging but don't expose sensitive information
    console.error('Session validation error:', error);
    
    await recordAuthEvent({
      ssoUserId: null,
      email: null,
      status: 'error',
      message: `Session validation failed: ${error.message}`,
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    
    return { isValid: false };
  }
}

/**
 * Higher-order function that wraps API handlers with OAuth authentication
 * 
 * Functional: Validates session before allowing access to protected API endpoints
 * Strategic: Centralized auth middleware prevents code duplication across API routes
 * 
 * @param {Function} handler - API route handler function
 * @returns {Function} Wrapped handler with OAuth authentication
 */
export function withSsoAuth(handler) {
  return async function(req, res) {
    // Functional: Validate session using OAuth tokens
    // Strategic: Early return with 401 if session invalid, proceed with user data if valid
    const { isValid, user } = await validateSsoSession(req);
    
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid OAuth session required',
        loginUrl: getOAuthLoginUrl(req.url),
      });
    }
    
    // Functional: Attach authenticated user to request object
    // Strategic: Handlers can access user data via req.user for permissions/audit logging
    req.user = user;
    
    return handler(req, res);
  };
}

/**
 * OAuth logout by clearing session cookie
 * 
 * Functional: Clears sso_session cookie to log user out
 * Strategic: Client-side logout that can be called from admin interface
 * 
 * @param {Object} res - Next.js response object
 * @returns {string} SSO logout URL for complete logout
 */
export function logoutOAuth(res) {
  // Functional: Clear session cookie
  // Strategic: Immediate logout on launchmass side
  res.setHeader('Set-Cookie', [
    `sso_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0; Domain=${sessionCookieDomain()}`,
  ]);

  // Functional: Return SSO logout URL for complete SSO logout
  // Strategic: User should be redirected to SSO logout to clear SSO session
  const ssoServerUrl = process.env.SSO_SERVER_URL || 'https://sso.doneisbetter.com';
  const postLogoutRedirectUri = process.env.APP_BASE_URL?.trim() || 'https://launchmass.doneisbetter.com';
  
  return `${ssoServerUrl}/api/oauth/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
}

/**
 * Shared predicate: is this user authorized as an app-level admin (or superadmin)?
 *
 * Functional: True if user.appRole is 'admin'/'superadmin', OR the canonical
 * isSuperAdmin flag (lib/permissions.js) is set.
 * Strategic: scripts/migrate-user-rights.cjs seeds isSuperAdmin: true independently
 * of appRole (e.g. on an org's first user), and lib/permissions.js's isSuperAdmin()
 * is what the rest of the permission system (hasOrgPermission) already treats as
 * authoritative — checking appRole alone would lock a real superadmin out. Single
 * source of truth for "is this an app-level admin", reused by requireAdminRole below
 * (API routes) and pages/admin/users.js's getServerSideProps (a page, not an API
 * route, so it can't use the res.status()-based HOF).
 *
 * @param {Object} user - req.user / SSO session user (as attached by withSsoAuth / validateSsoSession)
 * @returns {boolean}
 */
export function isAppAdmin(user) {
  return user?.appRole === 'admin' || user?.appRole === 'superadmin' || isSuperAdmin(user);
}

/**
 * Higher-order function wrapping API route handlers with app-admin authorization
 *
 * Functional: Rejects any caller who is not an app admin/superadmin (per isAppAdmin)
 * with 403, before invoking the handler. Must be composed inside withSsoAuth — the
 * check needs req.user, which withSsoAuth attaches — e.g.
 * withSsoAuth(requireAdminRole(handler)).
 * Strategic: Single implementation of the admin-role gate previously duplicated
 * inline across pages/api/admin/users/index.js, .../[ssoUserId]/change-role.js,
 * .../[ssoUserId]/grant-access.js, .../[ssoUserId]/revoke-access.js, and
 * pages/api/admin/batch-sync-sso.js. This is a pure refactor of an already-correct
 * check (see issue #9) — the `message` parameter lets each call site keep its own
 * pre-existing 403 message text so behavior is unchanged from before consolidation.
 *
 * @param {Function} handler - Async function(req, res) to run if caller is an admin
 * @param {string} [message] - 403 body's `message` field; each call site passes its
 *   own pre-existing message text (see call sites for the exact strings preserved)
 * @returns {Function} Wrapped handler
 */
export function requireAdminRole(handler, message = 'Admin or superadmin role required') {
  return async (req, res) => {
    if (!isAppAdmin(req.user)) {
      return res.status(403).json({ error: 'Forbidden', message });
    }
    return handler(req, res);
  };
}

/**
 * Higher-order function wrapping API route handlers with organization permission checks
 *
 * Functional: Enforces org-scoped authorization after OAuth authentication
 * Strategic: Combines authentication and authorization in composable middleware pattern
 *
 * @param {string} permission - Required permission string (e.g. 'cards.write', 'members.read')
 * @param {Function} handler - Async function(req, res) to execute if permission granted
 * @returns {Function} Wrapped handler that checks permission before execution
 */
export function withOrgPermission(permission, handler) {
  return async (req, res) => {
    // Functional: Import dependencies here to avoid circular imports
    const { getOrgContext } = await import('./org.js');
    const { hasOrgPermission, getUserOrgRole } = await import('./permissions.js');
    
    // Functional: Resolve organization context from headers or query parameters
    // Strategic: Reuses existing org.js helper; supports both X-Organization-UUID header and ?orgUuid= query
    const orgContext = await getOrgContext(req);
    
    // Functional: Org context required for org-scoped permissions
    // Strategic: 400 Bad Request is appropriate for missing required context (client error)
    if (!orgContext?.orgUuid) {
      return res.status(400).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING',
        message: 'Provide X-Organization-UUID header or ?orgUuid= query parameter'
      });
    }
    
    // Functional: Check if authenticated user has required permission in this org
    // Strategic: Uses hasOrgPermission from permissions.js; handles super admin bypass,
    // role lookup, and permission matrix check in one call
    const allowed = await hasOrgPermission(req.user, orgContext.orgUuid, permission, req);
    
    if (!allowed) {
      // Functional: 403 Forbidden for authenticated users without permission
      // Strategic: Distinguishes from 401 (not authenticated); tells client user is known but not allowed
      return res.status(403).json({
        error: 'Forbidden',
        code: 'PERMISSION_DENIED',
        permission: permission,
        message: `You do not have permission to perform this action (required: ${permission})`
      });
    }
    
    // Functional: Attach org context and user's role to request for handler convenience
    // Strategic: Avoids redundant database lookups in handlers; enables audit logging with org context
    req.orgContext = orgContext;
    
    // Functional: Fetch and cache user's role for potential use in handler
    // Strategic: Some handlers need to know if user is admin vs user (e.g. for conditional UI logic)
    req.userOrgRole = await getUserOrgRole(req.user.ssoUserId, orgContext.orgUuid);
    
    // Functional: Execute the protected handler with full auth and authz context
    return handler(req, res);
  };
}
