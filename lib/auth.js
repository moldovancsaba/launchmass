// Functional: SSO session validation and authentication middleware
// Strategic: Single source of truth for authentication; enables cross-domain cookie handling
// by forwarding the Cookie header to SSO service; synchronizes users to local database for
// audit trails and future permission management

import { upsertUserFromSso, recordAuthEvent } from './users.js';
import { hasOrgPermission, getUserOrgRole } from './permissions.js';
import { getOrgContext } from './org.js';

/**
 * Functional: Validate SSO session by forwarding cookie to SSO validate endpoint
 * Strategic: Cross-domain cookie forwarding is why we proxy through our API routes.
 * Browser sends SSO cookies (Domain=.doneisbetter.com) to our app (*.doneisbetter.com),
 * we forward those cookies to SSO service, avoiding CORS complications with credentials.
 * 
 * Why dual validation: Supports both public users (user-session cookie) and admin users
 * (admin-session cookie). Checks public endpoint first (most common), falls back to admin.
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
    // Functional: Validate environment configuration
    // Strategic: Fail gracefully if SSO_SERVER_URL is not configured
    if (!process.env.SSO_SERVER_URL) {
      console.error('[auth] SSO_SERVER_URL not configured');
      return { isValid: false };
    }
    
    // Functional: Extract cookie header from incoming request
    // Strategic: SSO HttpOnly cookies are automatically sent by browser; we forward them verbatim
    const cookieHeader = req.headers.cookie || '';
    
    // Functional: Try public user validation first (most common case)
    // Strategic: Public users have 'user-session' cookie, admins have 'admin-session' cookie
    const publicUrl = `${process.env.SSO_SERVER_URL}/api/public/validate`;
    let resp;
    try {
      resp = await fetch(publicUrl, {
        method: 'GET',
        headers: {
          cookie: cookieHeader,
          accept: 'application/json',
          'user-agent': req.headers['user-agent'] || 'launchmass-client',
        },
        cache: 'no-store',
      });
    } catch (fetchErr) {
      console.error('[auth] Failed to fetch from SSO:', fetchErr.message);
      return { isValid: false };
    }
    
    let data;
    try {
      data = await resp.json();
    } catch (jsonErr) {
      console.error('[auth] Failed to parse SSO response:', jsonErr.message);
      return { isValid: false };
    }
    
    // Functional: If public validation fails, try admin validation
    // Strategic: Enables both public and admin users to access launchmass
    if (!data?.isValid) {
      const adminUrl = `${process.env.SSO_SERVER_URL}/api/sso/validate`;
      try {
        resp = await fetch(adminUrl, {
          method: 'GET',
          headers: {
            cookie: cookieHeader,
            accept: 'application/json',
            'user-agent': req.headers['user-agent'] || 'launchmass-client',
          },
          cache: 'no-store',
        });
        data = await resp.json();
      } catch (adminErr) {
        console.error('[auth] Failed to fetch from admin SSO:', adminErr.message);
        return { isValid: false };
      }
    }
    
    if (data?.isValid && data?.user?.id) {
      // Functional: Sync user to local database with auto-admin on insert
      // Strategic: Creates audit trail and enables future permission granularity
      // WHY NON-BLOCKING: Database failures shouldn't block SSO authentication
      let localUser;
      try {
        localUser = await upsertUserFromSso(data.user);
      } catch (dbErr) {
        console.error('[auth] Failed to sync user to database:', dbErr.message);
        // Functional: Use SSO user data as fallback if database sync fails
        // Strategic: Auth succeeds even if local database is temporarily unavailable
        localUser = {
          ssoUserId: data.user.id,
          email: data.user.email,
          name: data.user.name,
          ssoRole: data.user.role,
          isAdmin: true, // Safe default per auto-admin policy
        };
      }
      
      // Functional: Record successful authentication event (non-blocking)
      // Strategic: Audit compliance and security monitoring
      recordAuthEvent({
        ssoUserId: data.user.id,
        email: data.user.email,
        status: 'success',
        // Functional: Extract real client IP from proxy headers if present
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
      }).catch(err => {
        // Don't block auth flow if logging fails
        console.error('[auth] Failed to log successful auth:', err.message);
      });
      
      return { isValid: true, user: localUser };
    }
    
    // Functional: Invalid session (expired, missing, or malformed)
    // Strategic: Log failed attempts for security monitoring (non-blocking)
    recordAuthEvent({
      ssoUserId: data?.user?.id || null,
      email: data?.user?.email || null,
      status: 'invalid',
      message: data?.message || 'Invalid SSO session',
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    }).catch(err => {
      // Don't block auth flow if logging fails
      console.error('[auth] Failed to log invalid session:', err.message);
    });
    
    return { isValid: false };
  } catch (err) {
    // Functional: Network error, SSO unreachable, or JSON parse failure
    // Strategic: Log errors for ops monitoring; don't expose internal error details to client
    console.error('[auth] SSO validation error:', err.message);
    
    // Non-blocking error logging
    recordAuthEvent({
      ssoUserId: null,
      email: null,
      status: 'error',
      message: err?.message || 'SSO validate error',
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    }).catch(logErr => {
      // Don't block auth flow if logging fails
      console.error('[auth] Failed to log error event:', logErr.message);
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

/**
 * Functional: Higher-order function wrapping API route handlers with organization permission checks
 * Strategic: Enforces org-scoped authorization after SSO authentication; combines authentication
 * and authorization in a single composable middleware pattern
 * 
 * Why separate from withSsoAuth: Enables layered security (auth then authz); some endpoints need
 * auth only (like listing orgs) while others need org-specific permissions (like managing cards)
 * 
 * HTTP Status Codes:
 * - 400 Bad Request: Missing organization context when required
 * - 401 Unauthorized: Not authenticated (no valid SSO session)
 * - 403 Forbidden: Authenticated but lacks required permission
 * 
 * Usage example:
 * ```js
 * import { withSsoAuth } from '../../../lib/auth.js';
 * import { withOrgPermission } from '../../../lib/auth.js';
 * 
 * export default async function handler(req, res) {
 *   if (req.method === 'POST') {
 *     // Require SSO auth AND cards.write permission in the org
 *     return withSsoAuth(
 *       withOrgPermission('cards.write', async (req, res) => {
 *         // req.user has authenticated user
 *         // req.orgContext has { orgUuid, orgSlug, org }
 *         // req.userOrgRole has 'admin' | 'user'
 *         // ... create card logic
 *       })
 *     )(req, res);
 *   }
 * }
 * ```
 * 
 * @param {string} permission - Required permission string (e.g. 'cards.write', 'members.read')
 * @param {Function} handler - Async function(req, res) to execute if permission granted
 * @returns {Function} Wrapped handler that checks permission before execution
 */
export function withOrgPermission(permission, handler) {
  return async (req, res) => {
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
