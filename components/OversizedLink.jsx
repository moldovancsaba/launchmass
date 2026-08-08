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
          {safeTags.map((t, i) => (
            <ChoiceChip
              key={i}
              label={`#${t}`}
              // onClick (not href) -- this sits inside the card's own <a>, and
              // ChoiceChip's href mode renders a nested anchor, which is invalid
              // HTML. onClick mode renders a real <button>, which also drops the
              // manual Enter/Space keydown handling the previous <span
              // role="link"> version needed -- buttons get that natively.
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/?tag=${encodeURIComponent(t)}`;
              }}
            />
          ))}
        </div>
      ) : null}
    </a>
  );
}
