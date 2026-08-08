import { ChoiceChip } from '@sovereignsquad/gds-core';

export default function OversizedLink({ href, title, description, background, tags }) {
  const raw = (background || "").trim();
  const isGradient = raw.startsWith("linear-gradient");
  const style = isGradient
    ? { background: raw, backgroundImage: raw }
    : raw
      ? { background: raw, backgroundColor: raw }
      : { background: "linear-gradient(135deg, #B62684 0%, #2C5680 55%, #0085C6 100%)" };

  const safeTags = Array.isArray(tags) ? tags : [];

  return (
    <div
      className="card"
      style={{
        ...style,
        position: 'relative',
        color: '#fff',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Card-wide click target as an absolutely-positioned sibling, not an ancestor.
          WHAT: a <button> (ChoiceChip's onClick mode, below) is interactive content,
          and interactive content nested inside an <a href> is invalid HTML regardless
          of preventDefault() -- that only changes click behavior, not the semantics
          assistive tech and keyboard navigation see. This "link overlay" pattern keeps
          the card's primary link and the tag buttons as siblings instead of nesting
          one inside the other. */}
      <a
        href={href || '#'}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={title || 'Untitled'}
        style={{ position: 'absolute', inset: 0, zIndex: 0, borderRadius: 'inherit' }}
      />
      <h3 style={{ textShadow: '0 1px 2px rgba(0,0,0,0.35)', pointerEvents: 'none' }}>{title || 'Untitled'}</h3>
      <p style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)', pointerEvents: 'none' }}>{description || ''}</p>
      {safeTags.length ? (
        <div className="tag-list" style={{ marginTop: 8, position: 'relative', zIndex: 1 }}>
          {safeTags.map((t, i) => (
            <ChoiceChip
              key={i}
              label={`#${t}`}
              onClick={() => { window.location.href = `/?tag=${encodeURIComponent(t)}`; }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
