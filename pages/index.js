import OversizedLink from '../components/OversizedLink';
import clientPromise from '../lib/db';

export default function Home({ cards, activeTag }) {
  return (
    <>
      {activeTag ? (
        <div className="filter-bar" style={{ padding: '8px 16px' }}>
          <span>Filtering by</span>
          <a className="tag-chip" href={`/?tag=${encodeURIComponent(activeTag)}`} style={{ marginLeft: 8 }}>#{activeTag}</a>
          <a className="tag-chip" href="/" style={{ marginLeft: 8 }}>Clear</a>
        </div>
      ) : null}
      <main className="grid">
        {cards.map((c, i) => (
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

    // Functional: Support SSR filtering by a single tag via ?tag= param.
    // Strategic: Server-side filtering ensures consistent initial render and SEO-friendly URLs.
    const rawTag = typeof context.query.tag === 'string' ? context.query.tag : '';
    const filterTag = rawTag.trim().toLowerCase();

    const query = filterTag ? { tags: filterTag } : {};

    const cards = await db.collection('cards').find(query).sort({ order: 1, _id: 1 }).toArray();
    
    // Serialize data for Next.js - convert Dates to strings and remove MongoDB _id
    const safe = cards.map(({ _id, createdAt, updatedAt, ...rest }) => ({
      ...rest,
      // Ensure tags is always an array
      tags: Array.isArray(rest?.tags) ? rest.tags : [],
      // Convert Date objects to ISO strings for JSON serialization
      ...(createdAt && { createdAt: createdAt.toISOString() }),
      ...(updatedAt && { updatedAt: updatedAt.toISOString() })
    }));
    
    return { props: { cards: safe, activeTag: filterTag || null } };
  } catch {
    return { props: { cards: [], activeTag: null } };
  }
}
