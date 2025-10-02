// Functional: Same-origin API endpoint for client-side session validation
// Strategic: Avoids CORS complications by providing a local proxy to SSO validation;
// enables client-side session monitoring without exposing SSO service directly

import { validateSsoSession } from '../../../lib/auth.js';

/**
 * Functional: Validate current user's SSO session
 * Strategic: Always returns 200 (even for invalid sessions) to avoid CORS preflight issues;
 * client checks the isValid field to determine authentication state
 * 
 * Why proxy instead of direct SSO calls: Client-side fetch to cross-origin SSO with credentials
 * requires complex CORS setup; this same-origin endpoint is simpler and more reliable
 * 
 * @param {Object} req - Next.js API request
 * @param {Object} res - Next.js API response
 * @returns {Object} { isValid: boolean, user?: Object }
 */
export default async function handler(req, res) {
  // Functional: Only support GET method for session validation
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Functional: Validate session via SSO and return result
  // Strategic: Result includes isValid boolean and user object if authenticated
  const result = await validateSsoSession(req);
  
  // Functional: Always return 200 with validation result
  // Strategic: Simplifies client logic and avoids CORS preflight for error status codes
  return res.status(200).json(result);
}
