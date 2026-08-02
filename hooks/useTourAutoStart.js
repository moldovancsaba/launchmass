import { useEffect, useRef } from 'react';
import { useTourContext } from '../components/Tour';
import { hasSeenTour, markTourSeen } from '../lib/tourStorage';

/**
 * Functional: Auto-starts a tour exactly once per browser (per tourId), gated on the
 * host page's own readiness signal, and marks it seen once it ends (skip or natural
 * finish). Tour-agnostic — knows nothing about step content, only whether a named
 * tour has already run.
 *
 * @param {string} tourId - unique id for this tour's localStorage flag
 * @param {boolean} enabled - true once the host page's data is ready to be spotlighted
 */
export function useTourAutoStart(tourId, enabled) {
  const tour = useTourContext();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!tour || !enabled || startedRef.current || tour.isActive) return;
    if (!hasSeenTour(tourId)) {
      startedRef.current = true;
      tour.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, enabled, tourId]);

  useEffect(() => {
    if (startedRef.current && tour && !tour.isActive) {
      markTourSeen(tourId);
      startedRef.current = false; // allow a future manual replay to re-arm this effect harmlessly
    }
  }, [tour, tour?.isActive, tourId]);
}
