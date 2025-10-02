// Functional: SSO session validation and authentication middleware
// Strategic: Single source of truth for authentication; enables cross-domain cookie handling
// by forwarding the Cookie header to SSO service; synchronizes users to local database for
// audit trails and future permission management

import { upsertUserFromSso, recordAuthEvent } from './users.js';

/**
 * Functional: Validate SSO session by forwarding cookie to SSO validate endpoint
 * Strategic: Cross-domain cookie forwarding is why we proxy through our API routes.
 * Browser sends SSO cookies (Domain=.doneisbetter.com) to our app (*.doneisbetter.com),
 * we forward those cookies to SSO service, avoiding CORS complications with credentials.
 * 
 * Why upsert on every validation: Keeps local user data fresh (name, email changes) and
 * updates lastLoginAt for audit/activity tracking
 * 
 * Why audit all attempts: Security monitoring, compliance requirements, incident investigation
 * 
 * @param {Object} req - Next.js API request object with headers.cookie
 * @returns {Promise<{isValid: boolean, user?: Object}>} Validation result with local user if valid
 */
export async function validateSsoSession(req) {
  try {
    // Functional: Extract cookie header from incoming request
    // Strategic: SSO HttpOnly cookies are automatically sent by browser; we forward them verbatim
    const cookieHeader = req.headers.cookie || '';
    const url = `${process.env.SSO_SERVER_URL}/api/sso/validate`;
    
    // Functional: Forward cookie to SSO validation endpoint
    // Strategic: cache: 'no-store' prevents stale session data; cookie forwarding enables
    // SSO to validate the session using its HttpOnly admin-session cookie
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        cookie: cookieHeader,
        accept: 'application/json',
        // Functional: Forward user-agent for audit logging on SSO side
        'user-agent': req.headers['user-agent'] || 'launchmass-client',
      },
      cache: 'no-store',
    });
    
    // Functional: Parse SSO response { isValid, user: { id, email, name, role, permissions } }
    const data = await resp.json();
    
    if (data?.isValid && data?.user?.id) {
      // Functional: Sync user to local database with auto-admin on insert
      // Strategic: Creates audit trail and enables future permission granularity
      const localUser = await upsertUserFromSso(data.user);
      
      // Functional: Record successful authentication event
      // Strategic: Audit compliance and security monitoring
      await recordAuthEvent({
        ssoUserId: data.user.id,
        email: data.user.email,
        status: 'success',
        // Functional: Extract real client IP from proxy headers if present
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      
      return { isValid: true, user: localUser };
    }
    
    // Functional: Invalid session (expired, missing, or malformed)
    // Strategic: Log failed attempts for security monitoring
    await recordAuthEvent({
      ssoUserId: data?.user?.id || null,
      email: data?.user?.email || null,
      status: 'invalid',
      message: data?.message || 'Invalid SSO session',
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
    
    return { isValid: false };
  } catch (err) {
    // Functional: Network error, SSO unreachable, or JSON parse failure
    // Strategic: Log errors for ops monitoring; don't expose internal error details to client
    console.error('[auth] SSO validation error:', err.message);
    
    await recordAuthEvent({
      ssoUserId: null,
      email: null,
      status: 'error',
      message: err?.message || 'SSO validate error',
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
    
    return { isValid: false };
  }
}

/**
 * Functional: Higher-order function wrapping API route handlers with SSO authentication
 * Strategic: Enforces authentication uniformly across all admin/write operations; prevents
 * code duplication and ensures consistent 401 responses for unauthorized requests
 * 
 * Why this pattern: Enables declarative auth protection (wrap handler) vs. imperative checks
 * (manual validation at start of every handler). Cleaner code, harder to forget auth checks.
 * 
 * Usage example:
 * ```js
 * import { withSsoAuth } from '../../../lib/auth.js';
 * 
 * export default async function handler(req, res) {
 *   if (req.method === 'GET') {
 *     // Public read operation
 *     return res.json({ data });
 *   }
 *   if (req.method === 'POST') {
 *     // Protected write operation
 *     return withSsoAuth(async (req, res) => {
 *       // req.user is available here with local user data
 *       console.log('Authenticated user:', req.user.email);
 *       // ... create logic
 *     })(req, res);
 *   }
 * }
 * ```
 * 
 * @param {Function} handler - Async function(req, res) to execute if authenticated
 * @returns {Function} Wrapped handler that validates session before execution
 */
export function withSsoAuth(handler) {
  return async (req, res) => {
    // Functional: Validate SSO session before allowing handler execution
    const { isValid, user } = await validateSsoSession(req);
    
    if (!isValid) {
      // Functional: Return 401 Unauthorized for invalid sessions
      // Strategic: Consistent error response enables client-side redirect to SSO login
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Functional: Attach user to request object for handler access
    // Strategic: Provides authenticated user context to downstream logic (audit logs, user-scoped queries)
    req.user = user;
    
    // Functional: Execute the protected handler with authenticated context
    return handler(req, res);
  };
}
