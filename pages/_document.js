import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Custom Document component for Next.js application
 *
 * WHAT: Extends the default HTML document structure (font preconnects only).
 *
 * Google Analytics: previously this file unconditionally injected gtag.js
 * into every server-rendered page, before any user consent could be
 * collected -- a GDPR/ePrivacy Directive compliance gap for SEYU's EU-based
 * sports-org clients. That injection has been removed. gtag.js now loads
 * client-side and consent-gated instead -- see components/ConsentBanner.jsx
 * and lib/consent.js, mounted from pages/_app.js. See GitHub issue #18.
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* SEYU brand fonts — preconnect for faster loading (stylesheet imported in globals.css) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>
      <body>
        {/* Navigation removed - now handled by Header component with hamburger menu */}
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
