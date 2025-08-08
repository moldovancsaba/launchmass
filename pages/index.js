import fs from 'fs';
import path from 'path';
import OversizedLink from '../components/OversizedLink';

export default function Home({ links }) {
  return (
    <main className="grid">
      {links.map((l, i) => <OversizedLink key={i} {...l} />)}
    </main>
  );
}

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'public', 'links.json');
  let links = [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    links = JSON.parse(raw);
  } catch (e) {
    links = [{ href: '/admin', title: 'Admin', description: 'Edit buttons and content' }];
  }
  return { props: { links }, revalidate: 60 };
}
