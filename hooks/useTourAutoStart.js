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
  // WHAT: Only true once a render has actually observed tour.isActive === true.
  // WHY: tour.start() (called below) schedules a state update on TourProvider — it
  // does not take effect until a later render. The "mark seen" effect runs in the
  // same passive-effect flush as this one, on the same (still-stale) tour.isActive
  // snapshot, so without this guard it would see startedRef.current already true and
  // tour.isActive still false and mark the tour seen immediately, before the first
  // step ever renders. Gating on an observed active render closes that gap.
  const becameActiveRef = useRef(false);

  useEffect(() => {
    if (!tour || !enabled || startedRef.current || tour.isActive) return;
    if (!hasSeenTour(tourId)) {
      startedRef.current = true;
      tour.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, enabled, tourId]);

  useEffect(() => {
    if (!tour) return;
    if (tour.isActive) {
      becameActiveRef.current = true;
      return;
    }
    if (startedRef.current && becameActiveRef.current) {
      markTourSeen(tourId);
      startedRef.current = false; // allow a future manual replay to re-arm this effect harmlessly
      becameActiveRef.current = false;
    }
  }, [tour, tour?.isActive, tourId]);
}
