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

    // WHAT: Fetch permissions from SSO first (source of truth)
    // WHY: SSO is where admins grant access, so we need to check SSO permissions
    // HOW: Use getPermissionFromSSO to query SSO permission API
    console.log('🔐 Fetching permissions from SSO...');
    
    const { upsertUserFromSso, recordAuthEvent } = await import('../../../lib/users.js');
    const { getPermissionFromSSO } = await import('../../../lib/ssoPermissions.mjs');
    
    let hasAccess = false;
    let userRole = 'user'; // Default role for new users
    let permissionStatus = 'active';
    let isFirstLogin = false;
    let ssoPermission = null;
    
    // WHAT: Try to fetch permissions from SSO
    // WHY: SSO is the source of truth for user permissions
    try {
      ssoPermission = await getPermissionFromSSO(user.id);
      
      if (ssoPermission) {
        // WHAT: SSO has permission record - use it as source of truth
        // WHY: SSO is where admins grant access
        console.log('   ✅ SSO permission found');
        console.log('   SSO role:', ssoPermission.role);
        console.log('   SSO status:', ssoPermission.status);
        
        // Map SSO permission to launchmass format
        // WHAT: Map SSO roles to launchmass roles
        // WHY: Launchmass only supports 'user' and 'admin', but SSO also has 'superadmin'
        const ssoRole = ssoPermission.role || 'user';
        if (ssoRole === 'superadmin') {
          userRole = 'admin'; // Map superadmin to admin in launchmass
        } else {
          userRole = ssoRole; // 'user' or 'admin' map directly
        }
        
        // Map SSO status to launchmass status
        if (ssoPermission.status === 'approved') {
          hasAccess = true;
          permissionStatus = 'active';
        } else if (ssoPermission.status === 'pending') {
          hasAccess = false;
          permissionStatus = 'pending';
        } else if (ssoPermission.status === 'revoked') {
          hasAccess = false;
          permissionStatus = 'suspended';
        } else {
          // Unknown status - default to pending
          hasAccess = false;
          permissionStatus = 'pending';
        }
        
        console.log('   Mapped to launchmass:');
        console.log('   Has access:', hasAccess);
        console.log('   Role:', userRole);
        console.log('   Status:', permissionStatus);
      } else {
        // WHAT: No SSO permission record - check local database as fallback
        // WHY: Support legacy users or cases where SSO sync hasn't happened yet
        console.log('   ⚠️  No SSO permission found, checking local database...');
        
        try {
          const clientPromise = await import('../../../lib/db.js').then(m => m.default);
          const client = await clientPromise;
          const db = client.db(process.env.DB_NAME || 'launchmass');
          const usersCol = db.collection('users');
          
          const existingUser = await usersCol.findOne({ ssoUserId: user.id });
          
          if (existingUser) {
            // WHAT: Existing user in local DB - use their stored permissions
            // WHY: Fallback for users created before SSO permission sync
            hasAccess = existingUser.hasAccess !== false; // Default to true if not explicitly set
            userRole = existingUser.appRole || 'user';
            permissionStatus = existingUser.appStatus || 'active';
            
            console.log('   📋 Existing user found in local DB');
            console.log('   Has access:', hasAccess);
            console.log('   Role:', userRole);
            console.log('   Status:', permissionStatus);
          } else {
            // WHAT: New user - check environment variable for auto-grant policy
            // WHY: Allow configuration of open vs approval-based access
            // DEFAULT: Auto-grant access (launchmass is internal tool)
            isFirstLogin = true;
            const autoGrantAccess = process.env.AUTO_GRANT_ACCESS !== 'false'; // Default true
            
            if (autoGrantAccess) {
              hasAccess = true;
              userRole = 'user';
              permissionStatus = 'active';
              console.log('   ✅ New user - auto-granting access (AUTO_GRANT_ACCESS=true)');
            } else {
              hasAccess = false;
              userRole = 'none';
              permissionStatus = 'pending';
              console.log('   ⏳ New user - pending approval (AUTO_GRANT_ACCESS=false)');
            }
          }
        } catch (dbError) {
          console.error('   ❌ Database error checking permissions:', dbError.message);
          // WHAT: On DB error, deny access for security
          // WHY: Fail-safe - don't grant access if we can't verify
          hasAccess = false;
          permissionStatus = 'error';
        }
      }
    } catch (ssoError) {
      // WHAT: SSO permission fetch failed - fallback to local database
      // WHY: Don't block login if SSO is temporarily unavailable
      console.error('   ⚠️  Failed to fetch SSO permissions:', ssoError.message);
      console.log('   Falling back to local database...');
      
      try {
        const clientPromise = await import('../../../lib/db.js').then(m => m.default);
        const client = await clientPromise;
        const db = client.db(process.env.DB_NAME || 'launchmass');
        const usersCol = db.collection('users');
        
        const existingUser = await usersCol.findOne({ ssoUserId: user.id });
        
        if (existingUser) {
          hasAccess = existingUser.hasAccess !== false;
          userRole = existingUser.appRole || 'user';
          permissionStatus = existingUser.appStatus || 'active';
          
          console.log('   📋 Using local DB permissions (SSO unavailable)');
          console.log('   Has access:', hasAccess);
          console.log('   Role:', userRole);
          console.log('   Status:', permissionStatus);
        } else {
          // No local user either - deny access
          hasAccess = false;
          permissionStatus = 'pending';
          console.log('   ⏳ No local user found - access denied');
        }
      } catch (dbError) {
        console.error('   ❌ Database error:', dbError.message);
        hasAccess = false;
        permissionStatus = 'error';
      }
    }
    
    // WHAT: If user doesn't have access, redirect to pending page
    // WHY: Users must be approved by admin before accessing app
    if (!hasAccess) {
      console.log('⏳ User does not have access, redirecting to pending page');
      
      // WHAT: Create user record in database with pending status
      // WHY: Admin can see pending users in /admin/users and approve them
      try {
        await upsertUserFromSso({
          ...user,
          appRole: userRole,
          appStatus: permissionStatus,
          hasAccess: false,
        });
      } catch (err) {
        console.error('   ⚠️  Failed to create user record:', err.message);
      }
      
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
        `/access-pending?status=${permissionStatus}&requested=${encodeURIComponent(new Date().toISOString())}`
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

    // Functional: Create or update user in local MongoDB
    // Strategic: Store user permissions locally for fast access
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
