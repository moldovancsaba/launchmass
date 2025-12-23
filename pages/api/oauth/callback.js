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
    console.error('❌ OAuth error from SSO:', error, error_description);
    return res.redirect(`/?error=sso_error&detail=${encodeURIComponent(error_description || error)}`);
  }

  // Functional: Verify authorization code is present
  // Strategic: Code is required to exchange for access tokens
  if (!code) {
    console.error('❌ No authorization code received');
    return res.redirect('/?error=missing_code&detail=No authorization code in callback');
  }

  try {
    const ssoServerUrl = process.env.SSO_SERVER_URL || 'https://sso.doneisbetter.com';
    const clientId = process.env.SSO_CLIENT_ID;
    const clientSecret = process.env.SSO_CLIENT_SECRET;
    const redirectUri = process.env.SSO_REDIRECT_URI || 'https://launchmass.doneisbetter.com/api/oauth/callback';

    console.log('🔍 OAuth callback initiated');
    console.log('   Code:', code.substring(0, 12) + '...');
    console.log('   State:', state);

    // Functional: Validate required OAuth configuration
    // Strategic: Missing config prevents secure token exchange
    if (!clientId || !clientSecret) {
      console.error('❌ Missing SSO_CLIENT_ID or SSO_CLIENT_SECRET');
      return res.redirect('/?error=config_error&detail=Missing OAuth credentials');
    }

    console.log('🔄 Exchanging authorization code for tokens...');

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

    console.log('📨 Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('❌ Token exchange failed');
      console.error('   Status:', tokenResponse.status);
      console.error('   Error:', errorData);
      
      const errorDetail = errorData.error_description || errorData.error || 'Unknown error';
      return res.redirect(`/?error=token_exchange_failed&detail=${encodeURIComponent(errorDetail)}&status=${tokenResponse.status}`);
    }

    const tokens = await tokenResponse.json();
    const { access_token, id_token, refresh_token } = tokens;

    console.log('✅ Tokens received successfully');
    console.log('   Has access_token:', !!access_token);
    console.log('   Has id_token:', !!id_token);
    console.log('   Has refresh_token:', !!refresh_token);

    // Functional: Decode ID token to get user info (JWT)
    // Strategic: ID token contains user claims (email, name, sub) per OpenID Connect spec
    console.log('🔍 Decoding ID token...');
    const idTokenPayload = JSON.parse(
      Buffer.from(id_token.split('.')[1], 'base64').toString()
    );

    const user = {
      id: idTokenPayload.sub,
      email: idTokenPayload.email,
      name: idTokenPayload.name || idTokenPayload.email,
      role: idTokenPayload.role,
    };

    console.log('👤 User identified:', user.email);

    // WHAT: Check if user has permission to access launchmass
    // WHY: Implements approval-based access control - users need admin approval
    // HOW: Query SSO API for user's app permission record
    console.log('🔐 Checking app permissions...');
    
    const permissionResponse = await fetch(
      `${ssoServerUrl}/api/users/${user.id}/apps/${clientId}/permissions`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    console.log('   Permission check status:', permissionResponse.status);

    let hasAccess = false;
    let userRole = 'none';
    let permissionStatus = 'none';
    let requestedAt = null;

    if (permissionResponse.ok) {
      // WHAT: Permission record exists - check access status
      const permission = await permissionResponse.json();
      hasAccess = permission.hasAccess;
      userRole = permission.role;
      permissionStatus = permission.status;
      requestedAt = permission.requestedAt;
      
      console.log('   Has access:', hasAccess);
      console.log('   Role:', userRole);
      console.log('   Status:', permissionStatus);
    } else if (permissionResponse.status === 404) {
      // WHAT: No permission record exists - create one in "pending" state
      // WHY: First access attempt creates pending approval request
      console.log('   No permission record found, creating request...');
      
      try {
        const requestAccessResponse = await fetch(
          `${ssoServerUrl}/api/users/${user.id}/apps/${clientId}/request-access`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
              userAgent: req.headers['user-agent'],
            }),
          }
        );

        if (requestAccessResponse.ok) {
          const requestData = await requestAccessResponse.json();
          permissionStatus = 'pending';
          requestedAt = requestData.permission?.requestedAt || new Date().toISOString();
          console.log('   ✅ Access request created');
        } else {
          console.error('   ❌ Failed to create access request:', requestAccessResponse.status);
          permissionStatus = 'error';
        }
      } catch (err) {
        console.error('   ❌ Error creating permission record:', err.message);
        permissionStatus = 'error';
      }
    } else if (permissionResponse.status === 401) {
      // WHAT: Permission API returned 401 - treat as no permission (pending)
      // WHY: SSO permission API may have auth issues, but user successfully logged in
      // FALLBACK: Create pending state and let admin approve manually
      console.log('   ⚠️  Permission API returned 401, treating as pending approval');
      console.log('   User will need manual approval in admin panel');
      
      permissionStatus = 'pending';
      requestedAt = new Date().toISOString();
      hasAccess = false; // Ensure user goes to pending page
    } else {
      // Unexpected error from permission API
      console.error('   ❌ Unexpected permission API error:', permissionResponse.status);
      const permError = await permissionResponse.text().catch(() => 'Unknown error');
      return res.redirect(`/?error=permission_check_failed&detail=${encodeURIComponent(permError)}&status=${permissionResponse.status}`);
    }

    // WHAT: If user doesn't have access, redirect to pending page
    // WHY: Users must be approved by admin before accessing app
    if (!hasAccess) {
      // Functional: Log access attempt for admin review
      // Strategic: Admins can see who tried to access and when
      console.log('⏳ User does not have access yet, redirecting to pending page');
      
      const { recordAuthEvent } = await import('../../../lib/users.js');
      await recordAuthEvent({
        ssoUserId: user.id,
        email: user.email,
        status: 'denied',
        message: `Access ${permissionStatus} - awaiting admin approval`,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

      // WHAT: Redirect to access pending page with status information
      // WHY: User needs to know their request is being reviewed
      return res.redirect(
        `/access-pending?status=${permissionStatus}&requested=${encodeURIComponent(requestedAt || '')}`
      );
    }

    console.log('💾 Creating session...');

    // WHAT: User has access - store tokens and permission info in session
    // WHY: Session needs to include user's role for authorization checks
    const sessionData = JSON.stringify({
      access_token,
      id_token,
      refresh_token,
      user: {
        ...user,
        appRole: userRole,
        appStatus: permissionStatus,
        hasAccess: true,
      },
      expires_at: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    res.setHeader('Set-Cookie', [
      `sso_session=${Buffer.from(sessionData).toString('base64')}; ` +
      `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400; ` +
      `Domain=.doneisbetter.com`,
    ]);

    console.log('🔄 Syncing user to local database...');

    // Functional: Sync user to local MongoDB with permission info
    // Strategic: Cache SSO permissions locally for performance
    const { upsertUserFromSso, recordAuthEvent } = await import('../../../lib/users.js');
    
    try {
      await upsertUserFromSso({
        ...user,
        appRole: userRole,
        appStatus: permissionStatus,
        hasAccess: true,
      });
      
      console.log('   ✅ User synced to database');
    } catch (dbError) {
      console.error('   ⚠️  Database sync failed (non-fatal):', dbError.message);
      // Continue anyway - session is created, DB sync can happen later
    }
    
    await recordAuthEvent({
      ssoUserId: user.id,
      email: user.email,
      status: 'success',
      message: `OAuth login successful - role: ${userRole}`,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    console.log('✅ OAuth flow completed successfully!');
    console.log('   Redirecting to:', state || '/admin');

    // Functional: Redirect to original destination or admin page
    // Strategic: Restore user's intended navigation after auth flow
    const redirectTo = state || '/admin';
    return res.redirect(redirectTo);

  } catch (error) {
    console.error('❌ Unexpected error in OAuth callback');
    console.error('   Error name:', error.name);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    console.error('   Timestamp:', new Date().toISOString());
    
    // More specific error based on error type
    let errorType = 'unexpected_error';
    let errorDetail = error.message;
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorType = 'network_error';
      errorDetail = 'Failed to connect to SSO server';
    } else if (error.name === 'SyntaxError') {
      errorType = 'json_parse_error';
      errorDetail = 'Invalid response from server';
    } else if (error.message.includes('MongoDB')) {
      errorType = 'database_error';
      errorDetail = 'Database connection failed';
    }
    
    return res.redirect(`/?error=${errorType}&detail=${encodeURIComponent(errorDetail)}`);
  }
}
