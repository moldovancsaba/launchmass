import '@mantine/core/styles.css';
import '@sovereignsquad/gds-theme/styles.css';
import '../styles/globals.css';
import { MantineProvider } from '@mantine/core';
import { OverlayManagerProvider } from '@sovereignsquad/gds-core/client';

export default function App({ Component, pageProps }) {
  // Bottom info bar removed globally by product decision to avoid UI duplication/overlap.
  // (Previously this computed the current pathname to conditionally hide the info bar on
  // /admin routes; the info bar itself is gone, so that computation was dead code.)

  return (
    // Functional: MantineProvider backs the guided-tour overlay's Mantine primitives
    // (components/tour/TourOverlay.jsx); OverlayManagerProvider backs its overlay-stack
    // coordination (lib/tour/useTourController.js).
    // Strategic: mounted app-wide (not scoped to /admin like messmass) since Header.jsx,
    // which carries the tour trigger, renders on every page including the public launcher.
    <MantineProvider>
      <OverlayManagerProvider>
        <div className="background-content" />
        <Component {...pageProps} />
      </OverlayManagerProvider>
    </MantineProvider>
  );
}
