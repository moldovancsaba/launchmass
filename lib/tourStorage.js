// Functional: Browser-local "has this tour been seen" flag, per tourId. MVP scope is
// localStorage only (no per-user database persistence) — see the parent onboarding-
// tour EPIC's explicit Non-Goals for why cross-device sync is a deliberately deferred
// upgrade, not an oversight. Reads/writes are isolated to this module so that future
// upgrade only has to change one place.
const KEY_PREFIX = 'seyu-tour-';

function keyFor(tourId) {
  return `${KEY_PREFIX}${tourId}-completed`;
}

/**
 * @param {string} tourId
 * @returns {boolean} true only if explicitly marked seen; false (not an error) if
 *   localStorage is unavailable — the safe failure direction is "show it again",
 *   not "silently never show help to someone whose browser can't persist the flag."
 */
export function hasSeenTour(tourId) {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(keyFor(tourId)) === 'true';
  } catch {
    return false;
  }
}

/**
 * @param {string} tourId
 * @returns {void} best-effort; a write failure is non-fatal (worst case the tour
 *   reappears next visit).
 */
export function markTourSeen(tourId) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(keyFor(tourId), 'true');
    }
  } catch {
    // ignore
  }
}
