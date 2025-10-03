/**
 * OAuth 2.0 / OpenID Connect Callback Handler
 * 
 * Functional: Handles the OAuth callback from sso.doneisbetter.com after user login
 * Strategic: Exchanges authorization code for tokens, validates them, creates session cookie
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error, error_description } = req.query;

  // Functional: Handle OAuth error responses from SSO
  // Strategic: User denied permission or SSO encountered an error
  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.redirect(`/?error=${encodeURIComponent(error_description || error)}`);
  }

  // Functional: Verify authorization code is present
  // Strategic: Code is required to exchange for access tokens
  if (!code) {
    return res.redirect('/?error=missing_code');
  }

  try {
    const ssoServerUrl = process.env.SSO_SERVER_URL || 'https://sso.doneisbetter.com';
    const clientId = process.env.SSO_CLIENT_ID;
    const clientSecret = process.env.SSO_CLIENT_SECRET;
    const redirectUri = process.env.SSO_REDIRECT_URI || 'https://launchmass.doneisbetter.com/api/oauth/callback';

    // Functional: Validate required OAuth configuration
    // Strategic: Missing config prevents secure token exchange
    if (!clientId || !clientSecret) {
      console.error('Missing SSO_CLIENT_ID or SSO_CLIENT_SECRET');
      return res.redirect('/?error=oauth_config_missing');
    }

    // Functional: Exchange authorization code for access token
    // Strategic: POST to token endpoint with client credentials (OAuth 2.0 standard flow)
    const tokenResponse = await fetch(`${ssoServerUrl}/api/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Token exchange failed:', tokenResponse.status, errorData);
      return res.redirect('/?error=token_exchange_failed');
    }

    const tokens = await tokenResponse.json();
    const { access_token, id_token, refresh_token } = tokens;

    // Functional: Decode ID token to get user info (JWT)
    // Strategic: ID token contains user claims (email, name, sub) per OpenID Connect spec
    const idTokenPayload = JSON.parse(
      Buffer.from(id_token.split('.')[1], 'base64').toString()
    );

    const user = {
      id: idTokenPayload.sub,
      email: idTokenPayload.email,
      name: idTokenPayload.name || idTokenPayload.email,
      role: idTokenPayload.role,
    };

    // Functional: Store tokens in secure HttpOnly cookie
    // Strategic: HttpOnly prevents XSS attacks, domain scoping enables SSO across subdomains
    const sessionData = JSON.stringify({
      access_token,
      id_token,
      refresh_token,
      user,
      expires_at: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    res.setHeader('Set-Cookie', [
      `sso_session=${Buffer.from(sessionData).toString('base64')}; ` +
      `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400; ` +
      `Domain=.doneisbetter.com`,
    ]);

    // Functional: Sync user to local MongoDB
    // Strategic: Maintain local user records for admin rights and audit trail
    const { upsertUserFromSso, recordAuthEvent } = await import('../../../lib/users.js');
    
    await upsertUserFromSso(user);
    await recordAuthEvent({
      ssoUserId: user.id,
      email: user.email,
      status: 'success',
      message: 'OAuth login successful',
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // Functional: Redirect to original destination or admin page
    // Strategic: Restore user's intended navigation after auth flow
    const redirectTo = state || '/admin';
    return res.redirect(redirectTo);

  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.redirect('/?error=authentication_failed');
  }
}
