import { useEffect, useMemo, useState } from 'react';
import OversizedLink from '../../components/OversizedLink';

export default function Admin() {
  const [jsonText, setJsonText] = useState('[]');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/links.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setJsonText(JSON.stringify(data, null, 2)))
      .catch(() => setJsonText(JSON.stringify([
        { href: '/', title: 'Home', description: 'Back to grid' }
      ], null, 2)));
  }, []);

  const data = useMemo(() => {
    try { return JSON.parse(jsonText); } catch { return []; }
  }, [jsonText]);

  function copyToClipboard() {
    navigator.clipboard.writeText(jsonText)
      .then(() => setStatus('Copied JSON to clipboard'))
      .catch(() => setStatus('Copy failed'));
    setTimeout(() => setStatus(''), 2000);
  }

  function downloadJSON() {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'links.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    setStatus('Downloaded links.json – commit to public/links.json in GitHub to publish');
    setTimeout(() => setStatus(''), 3000);
  }

  return (
    <main className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <section style={{ gridColumn: '1 / -1' }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Edit links.json</h3>
        <textarea
          value={jsonText}
          onChange={e => setJsonText(e.target.value)}
          style={{ width: '100%', height: 300, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={copyToClipboard}>Copy JSON</button>
          <button onClick={downloadJSON}>Download JSON</button>
          {status ? <span style={{ opacity: 0.7 }}>{status}</span> : null}
        </div>
        <p style={{ marginTop: 8, opacity: 0.7 }}>
          To publish: upload the downloaded file to <code>public/links.json</code> in GitHub and commit to main.
        </p>
      </section>
      {Array.isArray(data) && data.map((l, i) => <OversizedLink key={i} {...l} />)}
    </main>
  );
}
