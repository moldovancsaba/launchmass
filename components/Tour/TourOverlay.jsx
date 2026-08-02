// Functional: Renders the dimmed full-viewport layer with a spotlight cut-out around
// the current step's target element, using four positioned bands (top/bottom/left/
// right of the target) rather than a clip-path mask — simpler to reason about at
// viewport edges (a band can legitimately have zero height/width there) and needs no
// new dependency.
const DIM = 'rgba(27,31,60,0.6)'; // SEYU ink tint, not generic black
const PAD = 6; // spotlight padding around the raw target rect

export default function TourOverlay({ targetRect }) {
  if (!targetRect) return null;

  const r = {
    top: Math.max(0, targetRect.top - PAD),
    left: Math.max(0, targetRect.left - PAD),
    right: targetRect.right + PAD,
    bottom: targetRect.bottom + PAD,
  };
  const bandHeight = Math.max(0, r.bottom - r.top);

  return (
    <div aria-hidden="true" data-tour-overlay="true">
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: r.top, background: DIM, zIndex: 9998 }} />
      <div style={{ position: 'fixed', left: 0, top: r.bottom, right: 0, bottom: 0, background: DIM, zIndex: 9998 }} />
      <div style={{ position: 'fixed', top: r.top, left: 0, width: r.left, height: bandHeight, background: DIM, zIndex: 9998 }} />
      <div style={{ position: 'fixed', top: r.top, left: r.right, right: 0, height: bandHeight, background: DIM, zIndex: 9998 }} />
      <div
        style={{
          position: 'fixed',
          top: r.top,
          left: r.left,
          width: Math.max(0, r.right - r.left),
          height: bandHeight,
          boxShadow: '0 0 0 3px var(--seyu-magenta, #B62684)',
          borderRadius: 10,
          pointerEvents: 'none',
          zIndex: 9998,
        }}
      />
    </div>
  );
}
