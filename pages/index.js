import OversizedLink from '../components/OversizedLink';
import clientPromise from '../lib/db';

export default function Home({ cards }) {
  return (
    <main className="grid">
      {cards.map((c, i) => (
        <OversizedLink
          key={i}
          href={c.href}
          title={c.title}
          description={c.description}
          background={c.background}
        />
      ))}
    </main>
  );
}

export async function getServerSideProps() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'launchmass');
    const cards = await db.collection('cards').find({}).sort({ order: 1, _id: 1 }).toArray();
    
    // Serialize data for Next.js - convert Dates to strings and remove MongoDB _id
    const safe = cards.map(({ _id, createdAt, updatedAt, ...rest }) => ({
      ...rest,
      // Convert Date objects to ISO strings for JSON serialization
      ...(createdAt && { createdAt: createdAt.toISOString() }),
      ...(updatedAt && { updatedAt: updatedAt.toISOString() })
    }));
    
    return { props: { cards: safe } };
  } catch {
    return { props: { cards: [] } };
  }
}
