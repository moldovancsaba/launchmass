export default function OversizedLink({ href, title, description, background, tags }) {
  const raw = (background || "").trim();
  const isGradient = raw.startsWith("linear-gradient");
  const style = isGradient
    ? { background: raw, backgroundImage: raw }
    : raw
      ? { background: raw, backgroundColor: raw }
      : { background: "linear-gradient(90deg, rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%)" };

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
        <div className="tag-list" style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
          {safeTags.map((t, i) => (
            <a key={i} href={`/?tag=${encodeURIComponent(t)}`} className="tag-chip">#{t}</a>
          ))}
        </div>
      ) : null}
    </a>
  );
}
