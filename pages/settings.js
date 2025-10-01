import { useEffect, useState } from 'react';

// Settings page: minimal, high-contrast, token management and quick links
// Functional: Allows saving ADMIN_TOKEN locally for admin UI calls; links to core sections.
// Strategic: Provides a neutral entry-point when other UIs are inaccessible.

export default function Settings() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('ADMIN_TOKEN') || '') : '';
    setToken(saved);
  }, []);

  function saveToken() {
    if (typeof window !== 'undefined') localStorage.setItem('ADMIN_TOKEN', token);
    setStatus('Token saved');
    setTimeout(() => setStatus(''), 1000);
  }

  return (
    <main style={{ padding: 16, color: '#111' }}>
      <h1>Settings</h1>
      <section style={{ marginBottom: 16, padding: 12, background: 'rgba(0,0,0,0.05)', borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Admin Token</h2>
        <p style={{ opacity: 0.8 }}>Paste your ADMIN_TOKEN used for write operations.</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Admin token"
            style={{ width: 420 }}
          />
          <button onClick={saveToken}>Save token</button>
          <span style={{ opacity: 0.8 }}>Status: {token ? 'Present' : 'Missing'}</span>
          {status ? <span style={{ opacity: 0.8 }}>{status}</span> : null}
        </div>
      </section>

      <section style={{ padding: 12, background: 'rgba(0,0,0,0.05)', borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Quick Links</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="/" className="tag-chip">Home</a>
          <a href="/organizations" className="tag-chip">Organizations</a>
          <a href="/admin" className="tag-chip">Admin</a>
        </div>
      </section>
    </main>
  );
}
