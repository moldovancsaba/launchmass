// Functional: Guided-tour "seen" state persistence (localStorage, SSR-guarded)
// Strategic: Mirrors the storage.js pattern already shipped in messmass/fanmass's
// tour engines so the "seen" checkmark behaves identically across the fleet

function storageKey(tourId) {
  return `lm-tour-${tourId}`;
}

/**
 * @param {string} tourId
 * @returns {boolean} whether the tour has already been completed or skipped
 */
export function hasTourBeenSeen(tourId) {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(storageKey(tourId)) !== null;
  } catch (err) {
    console.warn('Failed to read tour state from localStorage:', err);
    return false;
  }
}

/**
 * @param {string} tourId
 * @param {'completed' | 'skipped'} status
 */
export function markTourSeen(tourId, status) {
  if (typeof window === 'undefined') return;

  try {
    const record = { status, at: new Date().toISOString() };
    window.localStorage.setItem(storageKey(tourId), JSON.stringify(record));
  } catch (err) {
    console.warn('Failed to save tour state to localStorage:', err);
  }
}

/**
 * @param {string} tourId
 */
export function clearTourSeen(tourId) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(storageKey(tourId));
  } catch (err) {
    console.warn('Failed to clear tour state from localStorage:', err);
  }
}
