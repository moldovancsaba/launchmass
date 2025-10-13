import { useEffect, useState } from 'react';

// Settings page for Organizations management.
// Functional: Single place to manage organizations (list/create/edit/delete).
// Strategic: OAuth-based authentication - no admin tokens needed.

export default function Settings() {
  // Organizations state
  const [orgs, setOrgs] = useState([]);
  const [form, setForm] = useState({ name: '', slug: '', description: '', useSlugAsPublicUrl: false });
  const [editing, setEditing] = useState(null); // uuid
  const [editForm, setEditForm] = useState({ name: '', slug: '', description: '', useSlugAsPublicUrl: false });
  const [status, setStatus] = useState('');

  useEffect(() => {
    refreshOrgs();
  }, []);

  async function refreshOrgs() {
    try {
      // WHAT: OAuth session authentication (no Bearer token needed)
      // WHY: withSsoAuth middleware validates session automatically
      const res = await fetch('/api/organizations');
      const data = await res.json();
      setOrgs(Array.isArray(data.organizations) ? data.organizations : []);
    } catch { 
      setOrgs([]); 
    }
  }

  async function createOrg(e){
    e.preventDefault();
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ 
          name: form.name, 
          slug: (form.slug || '').toLowerCase(), 
          description: form.description,
          useSlugAsPublicUrl: !!form.useSlugAsPublicUrl 
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setForm({ name:'', slug:'', description:'', useSlugAsPublicUrl: false });
      await refreshOrgs();
      setStatus('Organization created'); 
      setTimeout(() => setStatus(''), 1200);
    } catch {
      setStatus('Create failed'); 
      setTimeout(() => setStatus(''), 2000);
    }
  }

  function startEdit(org){
    setEditing(org.uuid);
    setEditForm({ 
      name: org.name, 
      slug: org.slug, 
      description: org.description || '',
      useSlugAsPublicUrl: !!org.useSlugAsPublicUrl
    });
  }
  
  function cancelEdit(){ 
    setEditing(null); 
    setEditForm({ name:'', slug:'', description:'', useSlugAsPublicUrl: false }); 
  }

  async function updateOrg(e){
    e.preventDefault();
    try {
      const res = await fetch('/api/organizations/' + encodeURIComponent(editing), {
        method: 'PUT',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ 
          name: editForm.name, 
          slug: (editForm.slug || '').toLowerCase(), 
          description: editForm.description,
          useSlugAsPublicUrl: !!editForm.useSlugAsPublicUrl
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setEditing(null);
      setEditForm({ name:'', slug:'', description:'', useSlugAsPublicUrl: false });
      await refreshOrgs();
      setStatus('Organization updated'); 
      setTimeout(() => setStatus(''), 1200);
    } catch {
      setStatus('Update failed'); 
      setTimeout(() => setStatus(''), 2000);
    }
  }

  async function deleteOrg(uuid){
    if (!confirm('Are you sure you want to delete this organization?')) return;
    try {
      const res = await fetch('/api/organizations/' + encodeURIComponent(uuid), {
        method: 'DELETE',
        headers: { 'Content-Type':'application/json' }
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshOrgs();
      setStatus('Organization deleted'); 
      setTimeout(() => setStatus(''), 1200);
    } catch {
      setStatus('Delete failed'); 
      setTimeout(() => setStatus(''), 2000);
    }
  }

  return (
    <main style={{ padding: 16, color: '#111' }}>
      <h1>Settings</h1>

      {/* Quick Links */}
      <section style={{ marginBottom: 16, padding: 12, background: 'rgba(0,0,0,0.05)', borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Quick Links</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="/" className="tag-chip">Home</a>
          <a href="#organizations" className="tag-chip">Organizations</a>
          <a href="/admin" className="tag-chip">Admin</a>
        </div>
      </section>

      {/* Organizations Manager */}
      <section id="organizations" style={{ padding: 12, background: 'rgba(0,0,0,0.05)', borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Organizations</h2>
        
        {status && (
          <div style={{ 
            padding: 12, 
            marginBottom: 16, 
            background: status.includes('failed') ? 'rgba(255,0,0,0.1)' : 'rgba(0,255,0,0.1)', 
            borderRadius: 8,
            color: status.includes('failed') ? '#c00' : '#060'
          }}>
            {status}
          </div>
        )}

        {/* Create Organization */}
        <form onSubmit={createOrg} style={{ display:'grid', gap: 8, maxWidth: 520, marginBottom: 16 }}>
          <label>
            Name
            <input 
              value={form.name} 
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} 
              required 
              placeholder="Organization name"
            />
          </label>
          <label>
            Slug
            <input 
              value={form.slug} 
              onChange={e => setForm(prev => ({ ...prev, slug: e.target.value.toLowerCase() }))} 
              required 
              placeholder="url-friendly-slug"
            />
          </label>
          <label>
            Description
            <textarea 
              value={form.description} 
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} 
              rows={3} 
              placeholder="Optional description"
            />
          </label>
          <label style={{ display:'flex', alignItems:'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={!!form.useSlugAsPublicUrl}
              onChange={(e) => setForm(prev => ({ ...prev, useSlugAsPublicUrl: e.target.checked }))}
            />
            <span>Use slug as public URL</span>
          </label>
          <button type="submit">Create Organization</button>
        </form>

        {/* Organizations List */}
        {!orgs.length ? (
          <p style={{ opacity: 0.75 }}>No organizations yet. Create one above to get started.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {orgs.map(o => (
              <div key={o.uuid} style={{ border:'1px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: 12, background:'#fff' }}>
                {editing === o.uuid ? (
                  <form onSubmit={updateOrg} style={{ display:'grid', gap: 6 }}>
                    <label>
                      Name
                      <input 
                        value={editForm.name} 
                        onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} 
                        required 
                      />
                    </label>
                    <label>
                      Slug
                      <input 
                        value={editForm.slug} 
                        onChange={e => setEditForm(prev => ({ ...prev, slug: e.target.value.toLowerCase ()}))} 
                        required 
                      />
                    </label>
                    <label>
                      Description
                      <textarea 
                        value={editForm.description} 
                        onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))} 
                        rows={3} 
                      />
                    </label>
                    <label style={{ display:'flex', alignItems:'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!editForm.useSlugAsPublicUrl}
                        onChange={(e) => setEditForm(prev => ({ ...prev, useSlugAsPublicUrl: e.target.checked }))}
                      />
                      <span>Use slug as public URL</span>
                    </label>
                    <div style={{ display:'flex', gap: 8 }}>
                      <button type="submit">Save</button>
                      <button type="button" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap: 8, flexWrap:'wrap' }}>
                      <strong>{o.name}</strong>
                      <span style={{ opacity:0.7 }}>/ {o.slug}</span>
                      <span style={{ opacity:0.7, fontSize:12 }}>UUID: {o.uuid}</span>
                      {o.userRole && (
                        <span 
                          className="tag-chip" 
                          style={{ 
                            background: o.userRole === 'admin' ? 'rgba(0,100,255,0.1)' : 'rgba(0,0,0,0.05)',
                            color: o.userRole === 'admin' ? '#0064ff' : '#666'
                          }}
                        >
                          {o.userRole}
                        </span>
                      )}
                      {o.useSlugAsPublicUrl ? (
                        <span className="tag-chip" title="Slug is enabled as public URL">slug public</span>
                      ) : null}
                      <a href={`/organization/${encodeURIComponent(o.uuid)}`} className="tag-chip" style={{ marginLeft: 'auto' }}>View</a>
                      {o.useSlugAsPublicUrl ? (
                        <a href={`/organization/${encodeURIComponent(o.slug)}`} className="tag-chip">View (slug)</a>
                      ) : null}
                      <a href={`/organization/${encodeURIComponent(o.uuid)}/admin`} className="tag-chip">Manage</a>
                    </div>
                    {o.description ? <p style={{ marginTop: 6, marginBottom: 0 }}>{o.description}</p> : null}
                    <div style={{ display:'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => startEdit(o)}>Edit</button>
                      <button onClick={() => deleteOrg(o.uuid)} style={{ background: '#c00', color: '#fff' }}>Delete</button>
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
