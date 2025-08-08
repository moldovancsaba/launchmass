import { useState } from 'react';
import OversizedLink from '../../components/OversizedLink';
export default function Admin() {
  const [json, setJson] = useState(JSON.stringify([
    { href: '/', title: 'Home', description: 'Back to grid' },
    { href: 'https://seyuselfies.com', title: 'SEYU', description: 'Fans on screen' }
  ], null, 2));
  let data = [];
  try { data = JSON.parse(json); } catch {}
  return (
    <main className="grid">
      <section style={{ gridColumn: '1 / -1' }}>
        <textarea
          value={json}
          onChange={e => setJson(e.target.value)}
          style={{ width: '100%', height: 240, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
        />
      </section>
      {Array.isArray(data) && data.map((l, i) => <OversizedLink key={i} {...l} />)}
    </main>
  );
}
