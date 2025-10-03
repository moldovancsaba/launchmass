// Functional: Same-origin API endpoint for client-side OAuth session validation
// Strategic: Avoids exposing OAuth tokens to browser; enables client-side session monitoring
// to detect expiration and trigger re-authentication via OAuth flow

import { validateSsoSession } from '../../../lib/auth-oauth.js';

/**
 * Functional: Validate current user's OAuth session from sso_session cookie
 * Strategic: Always returns 200 (even for invalid sessions) to simplify client logic;
 * client checks the isValid field to determine authentication state and trigger OAuth re-login
 * 
 * Why server-side validation: OAuth tokens stored in HttpOnly cookie cannot be accessed by
 * client JavaScript; this endpoint validates session server-side without exposing tokens
 * 
 * @param {Object} req - Next.js API request with sso_session cookie
 * @param {Object} res - Next.js API response
 * @returns {Object} { isValid: boolean, user?: Object }
 */
export default async function handler(req, res) {
  // Functional: Only support GET method for session validation
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Functional: Validate OAuth session from cookie (checks expiration, validates tokens)
  // Strategic: Result includes isValid boolean and user object from OAuth ID token claims
  const result = await validateSsoSession(req);
  
  // Functional: Always return 200 with validation result
  // Strategic: Simplifies client logic and avoids CORS preflight for error status codes
  return res.status(200).json(result);
}
