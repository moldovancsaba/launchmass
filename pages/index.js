import OversizedLink from '../components/OversizedLink';
import clientPromise from '../lib/db';

export default function Home({ links }) {
  return (
    <main className="grid">
      {links.map((l, i) => <OversizedLink key={i} {...l} />)}
    </main>
  );
}

export async function getServerSideProps() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || 'oversized-links');
    const links = await db.collection('links').find({}).sort({ order: 1, _id: 1 }).toArray();
    const safe = links.map(({ _id, ...rest }) => rest);
    return { props: { links: safe } };
  } catch {
    return { props: { links: [] } };
  }
}
