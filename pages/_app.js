import '@mantine/core/styles.css';
import '@sovereignsquad/gds-theme/styles.css';
import '../styles/globals.css';
import { MantineProvider } from '@mantine/core';
import { OverlayManagerProvider } from '@sovereignsquad/gds-core/client';
import ConsentBanner from '../components/ConsentBanner';

export default function App({ Component, pageProps }) {
  // Bottom info bar removed globally by product decision to avoid UI duplication/overlap.
  // (Previously this computed the current pathname to conditionally hide the info bar on
  // /admin routes; the info bar itself is gone, so that computation was dead code.)

  return (
    // Functional: MantineProvider backs the guided-tour overlay's Mantine primitives
    // (components/tour/TourOverlay.jsx) and the consent banner's GDS primitives
    // (components/ConsentBanner.jsx); OverlayManagerProvider backs the tour's
    // overlay-stack coordination (lib/tour/useTourController.js) -- the consent
    // banner deliberately does NOT use it (see ConsentBanner.jsx's doc comment:
    // it must stay non-modal, not overlay-stack-governed).
    // Strategic: mounted app-wide (not scoped to /admin like messmass) since Header.jsx,
    // which carries the tour trigger, renders on every page including the public launcher.
    <MantineProvider>
      <OverlayManagerProvider>
        <div className="background-content" />
        <Component {...pageProps} />
        {/* Consent-gated Google Analytics loading (issue #18). gtag.js moved here,
            client-side and consent-gated, out of pages/_document.js's former
            unconditional server-rendered injection. */}
        <ConsentBanner />
      </OverlayManagerProvider>
    </MantineProvider>
  );
}
