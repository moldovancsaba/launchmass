// Debug endpoint to test SSO validation
export default async function handler(req, res) {
  try {
    console.log('[debug] Starting SSO test');
    
    // Test 1: Check environment variables
    const ssoUrl = process.env.SSO_SERVER_URL;
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME;
    
    console.log('[debug] SSO_SERVER_URL:', ssoUrl ? 'SET' : 'NOT SET');
    console.log('[debug] MONGODB_URI:', mongoUri ? 'SET' : 'NOT SET');
    console.log('[debug] DB_NAME:', dbName || 'default');
    
    if (!ssoUrl) {
      return res.status(500).json({ 
        error: 'SSO_SERVER_URL not configured',
        env: { ssoUrl, mongoUri: !!mongoUri, dbName }
      });
    }
    
    // Test 2: Try to fetch from SSO
    console.log('[debug] Testing fetch to SSO...');
    const publicUrl = `${ssoUrl}/api/public/validate`;
    
    let fetchResult;
    try {
      const resp = await fetch(publicUrl, {
        method: 'GET',
        headers: {
          cookie: req.headers.cookie || '',
          accept: 'application/json',
          'user-agent': 'launchmass-debug',
        },
        cache: 'no-store',
      });
      
      const data = await resp.json();
      fetchResult = {
        status: resp.status,
        ok: resp.ok,
        data,
      };
      console.log('[debug] Fetch successful:', fetchResult);
    } catch (fetchErr) {
      console.error('[debug] Fetch failed:', fetchErr.message);
      fetchResult = {
        error: fetchErr.message,
        stack: fetchErr.stack,
      };
    }
    
    return res.status(200).json({
      success: true,
      env: {
        ssoUrl,
        hasMongoDB: !!mongoUri,
        dbName: dbName || 'default',
      },
      ssoTest: fetchResult,
    });
  } catch (err) {
    console.error('[debug] Top-level error:', err);
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
}
