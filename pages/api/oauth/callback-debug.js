/**
 * DEBUG OAuth Callback - Simplified version without permission checks
 * 
 * Use this temporarily to test if OAuth token exchange is working
 * Access via: /api/oauth/callback-debug?code=...&state=...
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error, error_description } = req.query;

  console.log('🔍 DEBUG: OAuth callback triggered');
  console.log('   Code:', code ? code.substring(0, 12) + '...' : 'missing');
  console.log('   State:', state);
  console.log('   Error:', error);

  if (error) {
    console.error('❌ OAuth error from SSO:', error, error_description);
    return res.status(400).json({ error, error_description, step: 'SSO_ERROR' });
  }

  if (!code) {
    console.error('❌ No authorization code');
    return res.status(400).json({ error: 'missing_code', step: 'VALIDATION' });
  }

  try {
    const ssoServerUrl = process.env.SSO_SERVER_URL || 'https://sso.doneisbetter.com';
    const clientId = process.env.SSO_CLIENT_ID;
    const clientSecret = process.env.SSO_CLIENT_SECRET;
    const redirectUri = process.env.SSO_REDIRECT_URI || 'https://launchmass.doneisbetter.com/api/oauth/callback';

    console.log('🔍 Config check');
    console.log('   SSO Server:', ssoServerUrl);
    console.log('   Client ID:', clientId);
    console.log('   Redirect URI:', redirectUri);
    console.log('   Has Secret:', !!clientSecret);

    if (!clientId || !clientSecret) {
      console.error('❌ Missing OAuth configuration');
      return res.status(500).json({ error: 'oauth_config_missing', step: 'CONFIG' });
    }

    console.log('🔄 Exchanging code for tokens...');
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

    console.log('📨 Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('❌ Token exchange failed');
      console.error('   Status:', tokenResponse.status);
      console.error('   Error:', errorData);
      return res.status(400).json({ 
        error: 'token_exchange_failed',
        step: 'TOKEN_EXCHANGE',
        details: errorData,
        ssoStatus: tokenResponse.status
      });
    }

    const tokens = await tokenResponse.json();
    console.log('✅ Token exchange successful!');
    console.log('   Has access_token:', !!tokens.access_token);
    console.log('   Has id_token:', !!tokens.id_token);
    console.log('   Has refresh_token:', !!tokens.refresh_token);

    // Decode ID token
    const idTokenPayload = JSON.parse(
      Buffer.from(tokens.id_token.split('.')[1], 'base64').toString()
    );

    console.log('👤 User info from ID token:');
    console.log('   ID:', idTokenPayload.sub);
    console.log('   Email:', idTokenPayload.email);
    console.log('   Name:', idTokenPayload.name);

    // SUCCESS - Return JSON with all the info
    return res.status(200).json({
      success: true,
      message: 'OAuth flow completed successfully!',
      step: 'SUCCESS',
      user: {
        id: idTokenPayload.sub,
        email: idTokenPayload.email,
        name: idTokenPayload.name || idTokenPayload.email,
      },
      tokens: {
        hasAccessToken: !!tokens.access_token,
        hasIdToken: !!tokens.id_token,
        hasRefreshToken: !!tokens.refresh_token,
      },
      nextSteps: [
        'Token exchange is working ✅',
        'The issue is NOT with SSO or RSA keys',
        'The issue is likely in permission checking or user sync',
        'Check the regular /api/oauth/callback for more specific errors',
      ]
    });

  } catch (error) {
    console.error('❌ Unexpected error in OAuth callback');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    
    return res.status(500).json({
      error: 'unexpected_error',
      step: 'CATCH_BLOCK',
      message: error.message,
      stack: error.stack,
    });
  }
}
