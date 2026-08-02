import { createContext, useContext } from 'react';

// Functional: Shared context for the onboarding tour engine (start/next/prev/skip/goTo
// plus current step state). Consumers (e.g. Header's "How this works" replay entry)
// read this via useTourContext() and get `null` when no <TourProvider> is an ancestor,
// so a page without a tour simply omits any tour-dependent UI rather than erroring.
export const TourContext = createContext(null);

export function useTourContext() {
  return useContext(TourContext);
}
