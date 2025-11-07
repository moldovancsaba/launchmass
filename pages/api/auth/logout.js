/**
 * Launchmass Logout Endpoint
 * 
 * POST /api/auth/logout - Clear local session and redirect to SSO logout
 * 
 * WHAT: Handles complete logout flow for Launchmass
 * WHY: Users need to logout from both Launchmass AND SSO
 * HOW: Clear sso_session cookie, then redirect to SSO logout endpoint
 * 
 * Strategic: Two-phase logout ensures both local and SSO sessions are cleared
 */

import { logoutOAuth } from '../../../lib/auth-oauth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // WHAT: Clear local sso_session cookie
    // WHY: Remove Launchmass session immediately
    // HOW: Use logoutOAuth() which sets cookie with Max-Age=0
    const ssoLogoutUrl = logoutOAuth(res);
    
    // WHAT: Return SSO logout URL for client-side redirect
    // WHY: Client needs to redirect to SSO to complete full logout
    return res.status(200).json({
      success: true,
      redirectUrl: ssoLogoutUrl,
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    // WHAT: Still return SSO logout URL even on error
    // WHY: User should be able to logout even if something fails
    const ssoServerUrl = process.env.SSO_SERVER_URL || 'https://sso.doneisbetter.com';
    const postLogoutRedirectUri = encodeURIComponent('https://launchmass.doneisbetter.com');
    
    return res.status(200).json({
      success: true,
      redirectUrl: `${ssoServerUrl}/api/oauth/logout?post_logout_redirect_uri=${postLogoutRedirectUri}`,
    });
  }
}
