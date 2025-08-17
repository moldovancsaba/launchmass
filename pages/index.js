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
    const safe = cards.map(({ _id, ...rest }) => rest);
    return { props: { cards: safe } };
  } catch {
    return { props: { cards: [] } };
  }
}
