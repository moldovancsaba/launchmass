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
        {/* Navigation removed - now handled by Header component with hamburger menu */}
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
