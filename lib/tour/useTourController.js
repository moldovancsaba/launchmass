'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOverlayManager } from '@sovereignsquad/gds-core/client';
import { markTourSeen } from './storage';

/**
 * @typedef {Object} TourStepConfig
 * @property {string} id
 * @property {string} targetSelector - CSS selector, usually `[data-tour-id="..."]`
 * @property {import('react').ReactNode} title
 * @property {import('react').ReactNode} description
 * @property {() => boolean} [isAvailable] - runtime check; omit for steps that are always available
 */

/**
 * @typedef {Object} TourController
 * @property {boolean} isOpen
 * @property {boolean} isTopMost
 * @property {TourStepConfig|null} currentStep
 * @property {number} currentIndex
 * @property {number} totalSteps
 * @property {() => void} start
 * @property {() => void} next
 * @property {() => void} back
 * @property {() => void} skip
 */

// Functional: Step-sequencing state for one guided tour
// Strategic: Registers with OverlayManagerProvider (mounted in pages/_app.js) so it
// coordinates with any other overlay instead of running an independent stack. Ported
// from messmass/fanmass's identical hook -- manually-triggered only, no autoStart.
/**
 * @param {string} tourId
 * @param {TourStepConfig[]} steps
 * @returns {TourController}
 */
export function useTourController(tourId, steps) {
  const availableSteps = useMemo(
    () => steps.filter((step) => step.isAvailable?.() ?? true),
    [steps]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const overlayManager = useOverlayManager();

  const finish = useCallback(
    (status) => {
      setIsOpen(false);
      overlayManager.closeOverlay(tourId, status === 'completed' ? 'action' : 'programmatic');
      overlayManager.unregisterOverlay(tourId);
      markTourSeen(tourId, status);
    },
    [overlayManager, tourId]
  );

  const start = useCallback(() => {
    if (availableSteps.length === 0) return;
    setCurrentIndex(0);
    setIsOpen(true);
    overlayManager.registerOverlay({
      id: tourId,
      kind: 'popover',
      policy: { closeOnEscape: true, closeOnOutsideClick: false, returnFocus: true },
    });
    overlayManager.openOverlay({ id: tourId, kind: 'popover' });
  }, [availableSteps.length, overlayManager, tourId]);

  // Reads currentIndex from the closure rather than a setCurrentIndex functional
  // updater -- React can invoke an updater during another component's render, and
  // finish() below has side effects (closes/unregisters a *different* component's
  // overlay state), which isn't safe to do from inside one.
  const next = useCallback(() => {
    if (currentIndex + 1 >= availableSteps.length) {
      finish('completed');
      return;
    }
    setCurrentIndex(currentIndex + 1);
  }, [currentIndex, availableSteps.length, finish]);

  const back = useCallback(() => {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, []);

  const skip = useCallback(() => {
    finish('skipped');
  }, [finish]);

  // Always safe to unregister on unmount even if never opened -- the manager
  // treats an unknown id as a no-op.
  useEffect(() => {
    return () => {
      overlayManager.unregisterOverlay(tourId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  return {
    isOpen,
    isTopMost: isOpen && overlayManager.isTopMost(tourId),
    currentStep: isOpen ? availableSteps[currentIndex] ?? null : null,
    currentIndex,
    totalSteps: availableSteps.length,
    start,
    next,
    back,
    skip,
  };
}
