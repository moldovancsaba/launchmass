import '@mantine/core/styles.css';
import '@sovereignsquad/gds-theme/styles.css';
import '../styles/globals.css';
import { useRouter } from 'next/router';
import { MantineProvider } from '@mantine/core';
import { OverlayManagerProvider } from '@sovereignsquad/gds-core/client';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Functional: Hide the global info bar on all /admin routes.
  // Strategic: Keep CSS/global styles unchanged and suppress rendering only on admin paths
  // to keep the admin UI clean without duplicating layouts.
  const rawPath = router.asPath || router.pathname || '';
  const pathname = rawPath.split('?')[0].split('#')[0];
  // Bottom info bar removed globally by product decision to avoid UI duplication/overlap.

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
