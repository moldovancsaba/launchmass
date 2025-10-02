import OversizedLink from '../components/OversizedLink';
import clientPromise from '../lib/db';

export default function Home({ cards, activeTag }) {
  const hasCards = Array.isArray(cards) && cards.length > 0;
  return (
    <>
      {!hasCards && (
        <section style={{ padding: '16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background:'rgba(0,0,0,0.05)', borderRadius: 12, color:'#111' }}>
          <strong>Welcome to launchmass</strong>
          <span style={{ opacity: 0.75 }}>No content found yet.</span>
          <a href="/settings#organizations" className="tag-chip" style={{ marginLeft: 'auto' }}>Organizations</a>
          <a href="/admin" className="tag-chip">Admin</a>
        </section>
      )}
      {activeTag ? (
        <div className="filter-bar" style={{ padding: '8px 16px' }}>
          <span>Filtering by</span>
          <a className="tag-chip" href={`/?tag=${encodeURIComponent(activeTag)}`} style={{ marginLeft: 8 }}>#{activeTag}</a>
          <a className="tag-chip" href="/" style={{ marginLeft: 8 }}>Clear</a>
        </div>
      ) : null}
      <main className="grid">
        {hasCards && cards.map((c, i) => (
          <OversizedLink
            key={i}
            href={c.href}
            title={c.title}
            description={c.description}
            background={c.background}
            tags={Array.isArray(c.tags) ? c.tags : []}
          />
        ))}
      </main>
    </>
  );
}

export async function getServerSideProps(context) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');

    // Original behavior: render the default dashboard grid with optional tag filtering.
    const rawTag = typeof context.query.tag === 'string' ? context.query.tag : '';
    const filterTag = rawTag.trim().toLowerCase();
    const query = filterTag ? { tags: filterTag } : {};

    const cards = await db.collection('cards').find(query).sort({ order: 1, _id: 1 }).toArray();

    const safe = cards.map(({ _id, createdAt, updatedAt, ...rest }) => ({
      ...rest,
      tags: Array.isArray(rest?.tags) ? rest.tags : [],
      ...(createdAt && { createdAt: createdAt.toISOString() }),
      ...(updatedAt && { updatedAt: updatedAt.toISOString() })
    }));
    return { props: { cards: safe, activeTag: filterTag || null } };
  } catch {
    // DB unavailable → render empty state with quick-access links
    return { props: { cards: [], activeTag: null } };
  }
}
