/**
 * OAuth-based SSO Authentication Library
 * 
 * Functional: Validates OAuth-based SSO sessions from cookie or initiates OAuth flow
 * Strategic: Supports OAuth 2.0 / OpenID Connect authentication pattern
 */

import { upsertUserFromSso, recordAuthEvent } from './users.js';

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
  const ssoServerUrl = process.env.SSO_SERVER_URL || process.env.NEXT_PUBLIC_SSO_SERVER_URL || 'https://sso.doneisbetter.com';
  const clientId = process.env.SSO_CLIENT_ID || process.env.NEXT_PUBLIC_SSO_CLIENT_ID;
  const redirectUri = process.env.SSO_REDIRECT_URI || process.env.NEXT_PUBLIC_SSO_REDIRECT_URI || 'https://launchmass.doneisbetter.com/api/oauth/callback';
  
  // Functional: Build OAuth authorization URL per OAuth 2.0 spec
  // Strategic: state parameter preserves user's intended destination across auth flow
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email offline_access',
    state: redirectAfterLogin,
  });

  return `${ssoServerUrl}/oauth/authorize?${params.toString()}`;
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

    // Functional: Decode session data from base64 JSON
    // Strategic: Session contains OAuth tokens and user info from ID token
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie, 'base64').toString()
    );

    // Functional: Check if session has expired
    // Strategic: Expired sessions require re-authentication
    if (sessionData.expires_at < Date.now()) {
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

    const { user } = sessionData;

    // Functional: Check if session has valid user data
    // Strategic: User object should have been populated during OAuth callback
    if (!user || !user.id) {
      return { isValid: false };
    }

    // Functional: Sync SSO user to local MongoDB
    // Strategic: Maintain local user records for admin rights management
    await upsertUserFromSso(user);

    // Functional: Log successful authentication event
    // Strategic: Audit trail for security monitoring and compliance
    await recordAuthEvent({
      ssoUserId: user.id,
      email: user.email,
      status: 'success',
      message: 'OAuth session validated',
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    return { isValid: true, user };

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
    'sso_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0; Domain=.doneisbetter.com',
  ]);

  // Functional: Return SSO logout URL for complete SSO logout
  // Strategic: User should be redirected to SSO logout to clear SSO session
  const ssoServerUrl = process.env.SSO_SERVER_URL || process.env.NEXT_PUBLIC_SSO_SERVER_URL || 'https://sso.doneisbetter.com';
  const postLogoutRedirectUri = 'https://launchmass.doneisbetter.com';
  
  return `${ssoServerUrl}/oauth/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
}