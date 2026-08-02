import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const GAP = 14; // distance between target edge and tooltip
const MARGIN = 10; // minimum distance from viewport edge
const DEFAULT_WIDTH = 320;

// Functional: Anchored step card — title, body, step counter, Back/Next/Skip. Measures
// its own rendered size after paint and repositions (prefer below the target, flip
// above if it would overflow the viewport) rather than relying on a positioning
// library. Owns the focus trap (Tab cycles only its own controls) and Escape-to-skip;
// does not own focus restoration on close — that is TourProvider's responsibility
// since only the provider knows what had focus before the tour started.
export default function TourTooltip({ step, targetRect, stepIndex, totalSteps, onNext, onPrev, onSkip }) {
  const ref = useRef(null);
  const nextBtnRef = useRef(null);
  const [style, setStyle] = useState({ position: 'fixed', top: -9999, left: -9999, width: DEFAULT_WIDTH });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !targetRect) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = el.getBoundingClientRect();
    const width = rect.width || DEFAULT_WIDTH;
    const height = rect.height || 120;

    let top = targetRect.bottom + GAP;
    if (top + height > vh - MARGIN) {
      // Flip above the target if placing below would overflow the viewport
      top = targetRect.top - height - GAP;
    }
    top = Math.min(Math.max(MARGIN, top), Math.max(MARGIN, vh - height - MARGIN));

    let left = targetRect.left;
    left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, vw - width - MARGIN));

    setStyle({ position: 'fixed', top, left, width: Math.min(DEFAULT_WIDTH, vw - MARGIN * 2) });
  }, [targetRect, step]);

  // Focus enters the tooltip once, on mount (i.e. on tour start) — not re-stolen on
  // every step change, which would be disorienting.
  useEffect(() => {
    nextBtnRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onSkip();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = ref.current?.querySelectorAll('button:not([disabled])');
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const isLast = stepIndex >= totalSteps - 1;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
      onKeyDown={onKeyDown}
      style={{
        ...style,
        zIndex: 9999,
        background: '#fff',
        color: 'var(--seyu-ink, #1B1F3C)',
        borderRadius: 'var(--seyu-radius-card, 16px)',
        boxShadow: '0 20px 50px rgba(27,31,60,0.45)',
        padding: '18px 20px',
        fontFamily: "'Montserrat', system-ui, sans-serif",
      }}
    >
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {step.title}. {step.body}
      </div>
      <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 16, marginBottom: 6 }}>{step.title}</div>
      <p style={{ margin: '0 0 14px 0', fontSize: 14, lineHeight: 1.5, color: 'var(--seyu-muted, #5A6478)' }}>{step.body}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--seyu-slate, #95AABE)' }}>
          {stepIndex + 1} of {totalSteps}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onSkip} style={btnGhost}>Skip</button>
          {stepIndex > 0 && (
            <button type="button" onClick={onPrev} style={btnGhost}>Back</button>
          )}
          <button type="button" ref={nextBtnRef} onClick={onNext} style={btnPrimary}>
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          div { transition: none !important; }
        }
      `}</style>
    </div>
  );
}

const btnGhost = {
  border: 0,
  background: 'transparent',
  color: 'var(--seyu-muted, #5A6478)',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  padding: '8px 10px',
};

const btnPrimary = {
  border: 0,
  borderRadius: 999,
  background: 'var(--seyu-magenta, #B62684)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  padding: '8px 16px',
};
