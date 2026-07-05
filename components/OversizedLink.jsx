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
    <a
      className="card"
      href={href || '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        ...style,
        color: '#fff',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <h3 style={{ textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}>{title || 'Untitled'}</h3>
      <p style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>{description || ''}</p>
      {safeTags.length ? (
        <div className="tag-list" style={{ marginTop: 8 }}>
          {safeTags.map((t, i) => {
            // Tags navigate to the filtered view. Rendered as spans (not <a>) because this
            // sits inside the card <a>, and nested anchors are invalid HTML.
            const go = (e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/?tag=${encodeURIComponent(t)}`; };
            return (
              <span
                key={i}
                role="link"
                tabIndex={0}
                className="tag-chip"
                style={{ cursor: 'pointer' }}
                onClick={go}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') go(e); }}
              >#{t}</span>
            );
          })}
        </div>
      ) : null}
    </a>
  );
}
