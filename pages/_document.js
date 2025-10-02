import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Custom Document component for Next.js application
 * 
 * This file extends the default HTML document structure to:
 * 1. Inject Google Analytics tracking script into the document head
 * 2. Ensure proper gtag configuration for analytics data collection
 * 
 * Why _document.js: This approach ensures the analytics script loads
 * on every page without requiring individual page modifications,
 * providing consistent tracking across the entire application.
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Google Analytics gtag.js implementation */}
        {/* 
          Google Analytics script injection for tracking ID G-HQ5QPLMJC1
          
          This implementation follows Google's recommended gtag.js approach:
          1. Async script tag loads the gtag library from Google's CDN
          2. dataLayer initialization ensures proper event queuing
          3. gtag function setup enables analytics event tracking
          4. Configuration connects to the specific Google Analytics property
          
          Why in _document.js: Ensures analytics loads on every page render
          and captures all user interactions across the application
        */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-HQ5QPLMJC1"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-HQ5QPLMJC1');
            `,
          }}
        />
      </Head>
      <body>
        {/* Failsafe nav: always-visible minimal navigation with inline styles (very high z-index) */}
        {/* Functional: Guarantees access to key areas even if global styles or data fail to load. */}
        {/* Strategic: Compact top-right overlay; we will hide it on admin routes to avoid overlap. */}
        <div
          id="failsafe-nav"
          style={{
            position: 'fixed',
            top: 8,
            right: 8,
            zIndex: 2147483647,
            background: 'rgba(0,0,0,0.80)',
            color: '#fff',
            padding: '6px 8px',
            borderRadius: 8,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            fontSize: 14,
          }}
          role="region"
          aria-label="Quick navigation"
        >
          <a href="/" style={{ color: '#fff', textDecoration: 'none' }}>Home</a>
          <a href="/admin" style={{ color: '#fff', textDecoration: 'none' }}>Admin</a>
          <a href="/settings" style={{ color: '#fff', textDecoration: 'none' }}>Settings</a>
        </div>
        {/* Hide the overlay nav on any admin route to avoid UI overlap */}
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){try{var p=location.pathname||'';if(p==='/admin'||p.indexOf('/admin')===0||p.indexOf('/organization/')===0&&p.indexOf('/admin')>0){var el=document.getElementById('failsafe-nav');if(el&&el.parentNode){el.parentNode.removeChild(el);}}}catch(e){}})();"
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
