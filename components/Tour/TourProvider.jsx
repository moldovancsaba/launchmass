import { useCallback, useEffect, useRef, useState } from 'react';
import { TourContext } from './TourContext';
import TourOverlay from './TourOverlay';
import TourTooltip from './TourTooltip';

// Functional: Generic, tour-agnostic engine. Consumes a plain array of
// { id, title, body } step definitions and drives a spotlight overlay + tooltip by
// locating each step's target via a [data-tour="<id>"] attribute — never a fragile
// CSS/structural selector, so unrelated markup changes elsewhere can't silently break
// a tour. Ships with no tour-specific content; content lives in lib/tours/*.js.
export default function TourProvider({ steps, children }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const currentStepIndexRef = useRef(0);
  const previouslyFocusedRef = useRef(null);
  const skippedCountRef = useRef(0); // guards against an all-targets-missing infinite loop
  const rafRef = useRef(null);

  useEffect(() => {
    currentStepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  const measure = useCallback((attempt = 0) => {
    const step = steps[currentStepIndexRef.current];
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.id}"]`);
    const rect = el?.getBoundingClientRect();
    const valid = !!rect && rect.width > 0 && rect.height > 0;

    if (valid) {
      skippedCountRef.current = 0;
      // Instant scroll (not smooth) so the very next measurement is accurate without
      // waiting on a scroll-end event — see the engine issue's Non-Goals for why a
      // smooth-scroll-then-measure approach was deliberately not built here.
      el.scrollIntoView({ block: 'center' });
      setTargetRect(el.getBoundingClientRect());
      return;
    }

    if (attempt < 1) {
      // One retry via rAF in case the element is mid-render this frame.
      rafRef.current = requestAnimationFrame(() => measure(attempt + 1));
      return;
    }

    // Target genuinely doesn't exist (e.g. no cards yet for a drag-handle step).
    // eslint-disable-next-line no-console
    console.warn(`[Tour] step "${step.id}" target not found — skipping`);
    skippedCountRef.current += 1;
    if (skippedCountRef.current >= steps.length) {
      // Every remaining step is missing its target — nothing left to show.
      setIsActive(false);
      return;
    }
    advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  useEffect(() => {
    if (!isActive) return undefined;
    measure();
    let ticking = false;
    const onReposition = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        measure();
        ticking = false;
      });
    };
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, currentStepIndex, measure]);

  function end() {
    setIsActive(false);
    setTargetRect(null);
    // Restore focus to whatever had it before start() was called.
    previouslyFocusedRef.current?.focus?.();
  }

  function advance() {
    setCurrentStepIndex((i) => {
      if (i >= steps.length - 1) {
        end();
        return i;
      }
      return i + 1;
    });
  }

  function start() {
    if (!steps || steps.length === 0) return; // no-op on an empty tour
    previouslyFocusedRef.current = document.activeElement;
    skippedCountRef.current = 0;
    setCurrentStepIndex(0);
    setIsActive(true);
  }

  function next() {
    advance();
  }

  function prev() {
    setCurrentStepIndex((i) => Math.max(0, i - 1));
  }

  function skip() {
    end();
  }

  function goTo(index) {
    setCurrentStepIndex(Math.min(Math.max(0, index), steps.length - 1));
  }

  const value = { isActive, currentStepIndex, totalSteps: steps.length, start, next, prev, skip, goTo };

  return (
    <TourContext.Provider value={value}>
      {children}
      {isActive && targetRect && (
        <>
          <TourOverlay targetRect={targetRect} />
          <TourTooltip
            step={steps[currentStepIndex]}
            targetRect={targetRect}
            stepIndex={currentStepIndex}
            totalSteps={steps.length}
            onNext={next}
            onPrev={prev}
            onSkip={skip}
          />
        </>
      )}
    </TourContext.Provider>
  );
}
