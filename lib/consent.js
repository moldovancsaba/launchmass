/**
 * Consent-gated Google Analytics loading (GDPR / ePrivacy Directive compliance).
 *
 * WHAT: Centralizes the localStorage-backed consent decision and the gtag.js
 * loader, so both the app entry point (pages/_app.js) and the consent banner
 * UI (components/ConsentBanner.jsx) share one source of truth.
 *
 * WHY: pages/_document.js previously injected gtag.js unconditionally into
 * every server-rendered page, before any consent could be collected -- a
 * compliance gap for SEYU's EU-based sports-org clients (UEFA, EHF, and
 * similar). See GitHub issue #18 for the full design doc.
 */

/** localStorage key holding the consent decision. Absent key = undecided. */
export const CONSENT_STORAGE_KEY = 'seyu-analytics-consent';

/** Google Analytics measurement ID (unchanged by this issue -- still hardcoded, no new env var). */
export const GA_MEASUREMENT_ID = 'G-HQ5QPLMJC1';

/**
 * Reads the stored consent decision.
 *
 * WHAT: Returns 'accepted' | 'declined' | null. null covers both "never
 * decided yet" and any storage failure (private browsing, quota exceeded,
 * storage disabled by the browser/user).
 * WHY: Treating a storage failure as "undecided" is the safe default from
 * issue #18's Edge Cases -- the banner simply reappears on the next visit
 * rather than the app crashing or silently assuming consent either way.
 *
 * @returns {'accepted'|'declined'|null}
 */
export function readConsent() {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

/**
 * Persists a consent decision.
 *
 * WHY: try/catch guards the same storage failure modes as readConsent() --
 * a write failure must not throw and break the Accept/Decline click handler;
 * the decision still applies to the current page view even if it can't be
 * persisted for the next one.
 *
 * @param {'accepted'|'declined'} decision
 */
export function writeConsent(decision) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, decision);
  } catch {
    // Storage unavailable -- decision applies to this page view only; the
    // banner will reappear on the next load. Acceptable per issue #18.
  }
}

// Module-level guard: a re-render (e.g. reopening "Cookie preferences" and
// re-accepting after already having accepted once this page view) must
// never inject the gtag.js script tag a second time.
let gtagLoaded = false;

/**
 * Injects the gtag.js script tag and fires the initial config call.
 *
 * WHAT: Moved out of pages/_document.js's unconditional server-rendered
 * injection (see ARCHITECTURE.md / issue #18) -- now only ever invoked
 * client-side, after consent has been granted (either freshly accepted, or
 * read back as already-'accepted' on a later page load).
 * WHY async + unchanged from the prior _document.js behavior: gtag.js
 * remains best-effort. If it fails to load (network block, ad-blocker) that
 * is expected and must not surface an error to the user (issue #18, UX /
 * Operator Behaviour: "No silent failure" applies to *our* logic, not to a
 * third-party script's own delivery, which analytics tooling always
 * treats as best-effort).
 */
export function loadGoogleAnalytics() {
  if (gtagLoaded || typeof window === 'undefined') return;
  gtagLoaded = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args) {
    window.dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
}
