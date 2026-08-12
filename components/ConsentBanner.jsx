import { useEffect, useState } from 'react';
import { BannerNotice, Button, Group } from '@sovereignsquad/gds-core';
import { readConsent, writeConsent, loadGoogleAnalytics } from '../lib/consent';

/**
 * Consent-gated analytics banner + persistent "Cookie preferences" control.
 *
 * WHAT: Renders nothing until after client-side mount -- the decision depends
 * on localStorage, which does not exist during SSR, so rendering anything
 * consent-related on the server would be a guess that could mismatch what
 * the client renders on hydration. Once mounted:
 *   - undecided (no stored key), or preferences re-opened -> shows a GDS
 *     BannerNotice with Accept/Decline actions, fixed to the bottom of the
 *     viewport.
 *   - stored 'accepted' -> gtag.js loads automatically, banner stays hidden.
 *   - stored 'declined' -> banner stays hidden, gtag.js never loads.
 * A persistent "Cookie preferences" button is always rendered once mounted
 * (whenever the banner itself isn't already showing), so the decision can be
 * changed at any time -- GDPR requires withdrawing consent to be at least as
 * easy as giving it.
 *
 * WHY BannerNotice, not GdsSheet/GdsDrawer (the issue's suggested
 * candidates): inspecting the actually-installed gds-core@6.0.0 dist
 * (node_modules/@sovereignsquad/gds-core/dist/client.d.ts) shows GdsSheet is
 * literally `GdsDrawer` with `mobileFullscreen` defaulted -- an
 * overlay-manager-governed surface that traps focus and is designed to be
 * closed via its policy (Escape / outside click / programmatic). That is
 * modal behavior, which issue #18 explicitly rules out ("must not block
 * interaction with the page underneath ... non-modal"). BannerNotice is
 * GDS's in-flow, non-overlay alert primitive (role="status"/"alert" with a
 * matching ARIA live region, built on Mantine's Alert) -- it never
 * registers with the overlay stack, never traps focus, and renders no
 * backdrop, so the page underneath stays fully interactive while it's
 * shown. It is document-flow by default; this component wraps it in a
 * fixed-position container so it behaves as a persistent bottom banner.
 * That positioning is plain inline style (no GDS layout primitive governs
 * "pin to viewport edge"), but the banner's own typography, color, spacing,
 * radius, and interaction states are all BannerNotice's untouched,
 * GDS-token-driven rendering -- the only non-token value here is the fixed
 * positioning, not the banner's visual design.
 */
export default function ConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [consent, setConsent] = useState(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    const stored = readConsent();
    setConsent(stored);
    setMounted(true);
    if (stored === 'accepted') loadGoogleAnalytics();
  }, []);

  function handleAccept() {
    writeConsent('accepted');
    setConsent('accepted');
    setPreferencesOpen(false);
    loadGoogleAnalytics();
  }

  function handleDecline() {
    writeConsent('declined');
    setConsent('declined');
    setPreferencesOpen(false);
  }

  // SSR-safe: nothing consent-related renders before the client-side effect
  // above has run and confirmed whether a decision is already stored.
  if (!mounted) return null;

  const showBanner = consent === null || preferencesOpen;

  if (showBanner) {
    return (
      <div
        role="region"
        aria-label="Cookie consent"
        style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 'var(--mantine-z-index-app)', padding: '12px 16px' }}
      >
        <BannerNotice
          title="We use cookies"
          message="launchmass uses Google Analytics to understand how the site is used. Analytics only loads if you accept."
          severity="info"
          action={
            <Group gap="sm" wrap="wrap">
              <Button size="sm" onClick={handleAccept}>Accept</Button>
              <Button size="sm" variant="default" onClick={handleDecline}>Decline</Button>
            </Group>
          }
        />
      </div>
    );
  }

  return (
    <Button
      size="xs"
      variant="subtle"
      onClick={() => setPreferencesOpen(true)}
      style={{ position: 'fixed', left: 12, bottom: 12, zIndex: 'var(--mantine-z-index-app)' }}
    >
      Cookie preferences
    </Button>
  );
}
