import { useEffect, useState } from 'react';

// Organizations management UI (requires ADMIN_TOKEN)
// Functional: List, create, edit (name/slug/description), and soft-delete organizations.
// Strategic: Provides a dedicated UI so org creation/management does not depend on /admin accessibility.

function TokenBar({ token, setToken, onSave, status }) {
  return (
    <section style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
      <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Admin token" style={{ width: 360 }} />
      <button onClick={onSave}>Save token</button>
      <span style={{ opacity:.7, fontSize:12 }}>Auth: {token ? '✓' : '✗'}</span>
      {status ? <span style={{ opacity:.75 }}>{status}</span> : null}
    </section>
  );
}

export default function OrganizationsPage(){
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [orgs, setOrgs] = useState([]);

  // Create form
  const [form, setForm] = useState({ name: '', slug: '', description: '' });

  // Edit state
  const [editing, setEditing] = useState(null); // uuid
  const [editForm, setEditForm] = useState({ name: '', slug: '', description: '' });

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('ADMIN_TOKEN') || '') : '';
    setToken(saved);
    refreshOrgs(saved);
  }, []);

  async function refreshOrgs(currentToken = token) {
    try {
      const res = await fetch('/api/organizations', { headers: { 'Authorization': 'Bearer ' + currentToken } });
      const data = await res.json();
      setOrgs(Array.isArray(data.organizations) ? data.organizations : []);
    } catch { setOrgs([]); }
  }

  function saveToken(){
    if (typeof window !== 'undefined') localStorage.setItem('ADMIN_TOKEN', token);
    setStatus('Token saved'); setTimeout(() => setStatus(''), 1000);
    refreshOrgs(token);
  }

  async function createOrg(e){
    e.preventDefault();
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type':'application/json' },
        body: JSON.stringify({ name: form.name, slug: form.slug, description: form.description })
      });
      if (!res.ok) throw new Error(await res.text());
      setForm({ name:'', slug:'', description:'' });
      await refreshOrgs();
      setStatus('Organization created'); setTimeout(() => setStatus(''), 1200);
    } catch (e) {
      setStatus('Create failed'); setTimeout(() => setStatus(''), 2000);
    }
  }

  function startEdit(org){
    setEditing(org.uuid);
    setEditForm({ name: org.name, slug: org.slug, description: org.description || '' });
  }
  function cancelEdit(){ setEditing(null); setEditForm({ name:'', slug:'', description:'' }); }

  async function updateOrg(e){
    e.preventDefault();
    try {
      const res = await fetch('/api/organizations/' + encodeURIComponent(editing), {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type':'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error(await res.text());
      setEditing(null);
      setEditForm({ name:'', slug:'', description:'' });
      await refreshOrgs();
      setStatus('Organization updated'); setTimeout(() => setStatus(''), 1200);
    } catch {
      setStatus('Update failed'); setTimeout(() => setStatus(''), 2000);
    }
  }

  async function deleteOrg(uuid){
    if (!confirm('Are you sure you want to delete this organization?')) return;
    try {
      const res = await fetch('/api/organizations/' + encodeURIComponent(uuid), {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type':'application/json' }
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshOrgs();
      setStatus('Organization deleted'); setTimeout(() => setStatus(''), 1200);
    } catch {
      setStatus('Delete failed'); setTimeout(() => setStatus(''), 2000);
    }
  }

  return (
    <main style={{ padding: 16, color: '#111' }}>
      <TokenBar token={token} setToken={setToken} onSave={saveToken} status={status} />

      <section style={{ marginBottom: 24 }}>
        <h2>Create Organization</h2>
        <form onSubmit={createOrg} style={{ display:'grid', gap: 8, maxWidth: 520 }}>
          <label>Name<input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required /></label>
          <label>Slug<input value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value.toLowerCase() }))} required /></label>
          <label>Description<textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={3} /></label>
          <button type="submit" disabled={!token}>Create</button>
        </form>
      </section>

      <section>
        <h2>Organizations</h2>
        {!orgs.length ? (
          <p style={{ opacity: 0.75 }}>No organizations yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {orgs.map(o => (
              <div key={o.uuid} style={{ border:'1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: 12 }}>
                {editing === o.uuid ? (
                  <form onSubmit={updateOrg} style={{ display:'grid', gap: 6 }}>
                    <label>Name<input value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} required /></label>
                    <label>Slug<input value={editForm.slug} onChange={e => setEditForm(prev => ({ ...prev, slug: e.target.value.toLowerCase() }))} required /></label>
                    <label>Description<textarea value={editForm.description} onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))} rows={3} /></label>
                    <div style={{ display:'flex', gap: 8 }}>
                      <button type="submit" disabled={!token}>Save</button>
                      <button type="button" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap: 8, flexWrap:'wrap' }}>
                      <strong>{o.name}</strong>
                      <span style={{ opacity:0.7 }}>/ {o.slug}</span>
                      <span style={{ opacity:0.7, fontSize:12 }}>UUID: {o.uuid}</span>
                      <a href={`/organization/${encodeURIComponent(o.uuid)}`} className="tag-chip" style={{ marginLeft: 'auto' }}>View</a>
                      <a href={`/organization/${encodeURIComponent(o.uuid)}/admin`} className="tag-chip">Manage</a>
                    </div>
                    {o.description ? <p style={{ marginTop: 6 }}>{o.description}</p> : null}
                    <div style={{ display:'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => startEdit(o)} disabled={!token}>Edit</button>
                      <button onClick={() => deleteOrg(o.uuid)} disabled={!token}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
