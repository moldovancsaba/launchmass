import OversizedLink from '../components/OversizedLink';
const links = [
  { href: '/admin', title: 'Admin', description: 'Edit buttons and content' },
  { href: 'https://example.com/a', title: 'Action A', description: 'Primary call' },
  { href: 'https://example.com/b', title: 'Action B', description: 'Secondary call' }
];
export default function Home() {
  return (
    <main className="grid">
      {links.map((l, i) => <OversizedLink key={i} {...l} />)}
    </main>
  );
}
