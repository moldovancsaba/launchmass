import { useEffect, useMemo, useState } from 'react';
import OversizedLink from '../../components/OversizedLink';

export default function Admin() {
  const [jsonText, setJsonText] = useState('[]');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/links', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setJsonText(JSON.stringify(data, null, 2)))
      .catch(() => setJsonText('[]'));
  }, []);

  const data = useMemo(() => {
    try { return JSON.parse(jsonText); } catch { return []; }
  }, [jsonText]);

  async function save() {
    try {
      const body = JSON.parse(jsonText);
      const r = await fetch('/api/links', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('Save failed');
      setStatus('Saved to database');
    } catch {
      setStatus('Invalid JSON or save failed');
    }
    setTimeout(() => setStatus(''), 2500);
  }

  return (
    <main className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <section style={{ gridColumn: '1 / -1' }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Edit links (MongoDB)</h3>
        <textarea
          value={jsonText}
          onChange={e => setJsonText(e.target.value)}
          style={{ width: '100%', height: 300, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={save}>Save to DB</button>
          {status ? <span style={{ opacity: 0.75 }}>{status}</span> : null}
        </div>
      </section>
      {Array.isArray(data) && data.map((l, i) => <OversizedLink key={i} {...l} />)}
    </main>
  );
}
