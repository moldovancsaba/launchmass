'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Group, Stack, Text } from '@mantine/core';
import styles from './TourOverlay.module.css';

// Functional: backdrop + spotlight cutout + positioned tooltip for one active
// guided tour, ported from messmass/fanmass's identical component
// Strategic: purely presentational -- all step state lives in `controller`
// (lib/tour/useTourController.js). z-index uses plain numbers (10000/10001)
// rather than CSS custom properties -- this repo has no --z-* token system
// (see styles/globals.css), just ad hoc numeric z-index per element; Header.jsx's
// dropdown tops out at 1001, so 10000+ clears it and everything else in the app.

function measureTarget(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  const radius = window.getComputedStyle(el).borderRadius || '8px';
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height, radius };
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Places the tooltip below the spotlighted rect when there's room, else above; clamps horizontally to the viewport. */
function tooltipPosition(rect) {
  if (!rect || typeof window === 'undefined') {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
  const margin = 12;
  const tooltipWidth = 320;
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const spaceBelow = viewportHeight - (rect.top + rect.height);
  const preferBelow = spaceBelow >= 160 || spaceBelow >= rect.top;

  const left = Math.min(Math.max(margin, rect.left), Math.max(margin, viewportWidth - tooltipWidth - margin));

  return preferBelow
    ? { top: rect.top + rect.height + margin, left }
    : { bottom: viewportHeight - rect.top + margin, left };
}

/**
 * @param {{ controller: import('../../lib/tour/useTourController').TourController }} props
 */
export default function TourOverlay({ controller }) {
  const { isOpen, isTopMost, currentStep, currentIndex, totalSteps, next, back, skip } = controller;
  const [rect, setRect] = useState(null);
  // True while polling for a target that hasn't mounted yet -- kept separate from
  // `rect` so a not-yet-mounted target renders nothing rather than a misleading
  // centered dialog that then jumps to the spotlight once found.
  const [measuring, setMeasuring] = useState(true);
  const tooltipRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useLayoutEffect(() => {
    if (!isOpen || !currentStep) {
      setRect(null);
      setMeasuring(true);
      return;
    }

    setMeasuring(true);
    let cancelled = false;
    let attempts = 0;
    let retryTimer = 0;
    let resizeObserver = null;
    const measure = () => setRect(measureTarget(currentStep.targetSelector));

    // The target should always be in the DOM once the menu has been forced open,
    // but poll briefly anyway before concluding it genuinely won't appear.
    const MAX_ATTEMPTS = 20;
    const RETRY_MS = 150;

    const tryMeasure = () => {
      if (cancelled) return;
      const target = document.querySelector(currentStep.targetSelector);
      if (!target) {
        attempts += 1;
        if (attempts >= MAX_ATTEMPTS) {
          console.error(`[GuidedTour] target not found for step "${currentStep.id}": ${currentStep.targetSelector}`);
          next();
          return;
        }
        retryTimer = window.setTimeout(tryMeasure, RETRY_MS);
        return;
      }

      setMeasuring(false);
      target.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      measure();

      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(target);
      window.addEventListener('resize', measure, { passive: true });
      window.addEventListener('scroll', measure, { passive: true, capture: true });
    };

    tryMeasure();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentStep?.id]);

  // Captures the pre-tour focus target once, on open -- not on every step change.
  // Keying this on currentStep?.id (as messmass/fanmass's identical effect does)
  // re-captures document.activeElement on each Next/Back click, which by then is
  // whatever button inside the tooltip the visitor just clicked, not the original
  // trigger. That element unmounts with the tour, so the "return focus" effect below
  // ends up calling .focus() on a detached node instead of returning focus to the
  // menu item that opened the tour.
  useLayoutEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement;
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !currentStep || measuring) return;
    tooltipRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentStep?.id, measuring]);

  useLayoutEffect(() => {
    if (isOpen || !previouslyFocusedRef.current) return;
    previouslyFocusedRef.current.focus?.();
    previouslyFocusedRef.current = null;
  }, [isOpen]);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      skip();
      return;
    }
    if (event.key === 'Tab') {
      const container = tooltipRef.current;
      if (!container) return;
      const focusable = container.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  if (!isOpen || !currentStep || !isTopMost || measuring) return null;

  const isLastStep = currentIndex + 1 >= totalSteps;
  const reducedMotion = prefersReducedMotion();

  return (
    <>
      {/* Always intercepts pointer events (a real modal backdrop) -- the tour
          registers with closeOnOutsideClick: false, and letting clicks pass through
          to the page would let a visitor navigate away while the tour logically
          stays "open" */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'auto' }}>
        {rect ? (
          <div
            className={reducedMotion ? styles.spotlight : `${styles.spotlight} ${styles.spotlightAnimated}`}
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              borderRadius: rect.radius,
            }}
          />
        ) : (
          <div className={styles.backdropFallback} />
        )}
      </div>
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tour-step-title"
        aria-describedby="guided-tour-step-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={{ position: 'fixed', zIndex: 10001, width: 320, maxWidth: 'calc(100vw - 24px)', ...tooltipPosition(rect) }}
      >
        <Box p="md" style={{ background: 'var(--mantine-color-body)', borderRadius: 12, boxShadow: 'var(--mantine-shadow-lg)' }}>
          <Stack gap="sm">
            <Text id="guided-tour-step-title" fw={700}>
              {currentStep.title}
            </Text>
            <Text id="guided-tour-step-description" size="sm" c="dimmed">
              {currentStep.description}
            </Text>
            <Text size="xs" c="dimmed">
              Step {currentIndex + 1} of {totalSteps}
            </Text>
            <Group justify="space-between">
              <Button variant="subtle" size="xs" onClick={skip}>
                Skip
              </Button>
              <Group gap="xs">
                {currentIndex > 0 ? (
                  <Button variant="default" size="xs" onClick={back}>
                    Back
                  </Button>
                ) : null}
                <Button size="xs" onClick={next}>
                  {isLastStep ? 'Done' : 'Next'}
                </Button>
              </Group>
            </Group>
          </Stack>
        </Box>
      </div>
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {`Step ${currentIndex + 1} of ${totalSteps}: ${typeof currentStep.title === 'string' ? currentStep.title : ''}`}
      </div>
    </>
  );
}
