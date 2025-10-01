import { useEffect, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import dynamic from 'next/dynamic';
// Custom lightweight tag input to avoid Popper dependency issues in CI/build environments.
// We deliberately avoid MUI Autocomplete here to prevent @popperjs/core bundling errors.

const DEFAULT_BG = "linear-gradient(90deg, rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%)";

function normalizeBg(input) {
  const lines = String(input || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const linear = lines.find(l => l.startsWith('background: linear-gradient'));
  const color = lines.find(l => /^background:\s*#?[0-9a-fA-F]{3,8}/.test(l));
  const pick = (linear || color || input || '').replace(/^background:\s*/,'').replace(/;$/,'');
  return pick || DEFAULT_BG;
}

function normalizeTags(input){
  const arr = Array.isArray(input) ? input : [];
  const out = [];
  const seen = new Set();
  for (const raw of arr) {
    if (typeof raw !== 'string') continue;
    const t = raw.trim().replace(/^#/,'').toLowerCase();
    if (!t) continue;
    if (!seen.has(t)) { seen.add(t); out.push(t); }
  }
  return out;
}

function TagInput({ value = [], options = [], onChange }) {
  const [input, setInput] = useState('');

  const normalized = normalizeTags(value);
  const filtered = options
    .filter(t => typeof t === 'string')
    .map(t => t.toLowerCase())
    .filter(t => input ? t.startsWith(input.trim().toLowerCase()) : true)
    .filter(t => !normalized.includes(t))
    .slice(0, 8);

  function addTag(raw){
    const t = (raw || '').trim().replace(/^#/,'').toLowerCase();
    if (!t) return;
    if (!normalized.includes(t)) onChange([...normalized, t]);
  }

  function removeTag(tag){
    onChange(normalized.filter(t => t !== tag));
  }

  function onKeyDown(e){
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
      setInput('');
    }
    if (e.key === 'Backspace' && !input && normalized.length) {
      // Quick delete last
      onChange(normalized.slice(0, -1));
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        {normalized.map((t, i) => (
          <span key={i} className="tag-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            #{t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              aria-label={`Remove tag ${t}`}
              style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}
            >×</button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type a tag and press Enter"
        style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.5)', padding: '6px 8px' }}
      />
      {filtered.length ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {filtered.map((t, i) => (
            <button key={i} type="button" className="tag-chip" onClick={() => { addTag(t); setInput(''); }}>
              #{t}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Card({ item, editing, onStartEdit, onCancel, onSave, onDelete, onChange, sortable, tagOptions }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item._id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const bg = item.background || DEFAULT_BG;

  const tags = Array.isArray(item.tags) ? item.tags : [];

  return (
    <div ref={setNodeRef} style={style} className="admin-card" >
      <div className="admin-card-inner" style={{ background: bg }}>
        {!editing ? (
          <>
            <div className="admin-card-top">
              <button className="drag" title="Drag" {...attributes} {...listeners}>↕</button>
              <div className="actions">
                <button className="edit" onClick={onStartEdit}>Edit</button>
                <button className="del" onClick={onDelete}>Delete</button>
              </div>
            </div>
            <div className="admin-card-content">
              <h3>{item.title || 'Untitled'}</h3>
              <p>{item.description || ''}</p>
              {tags.length ? (
                <div className="tag-list" style={{ marginTop: 6 }}>
                  {tags.map((t, idx) => (
                    <span key={idx} className="tag-chip">#{t}</span>
                  ))}
                </div>
              ) : null}
            </div>
            <a className="visit" href={item.href || '#'} target="_blank" rel="noopener noreferrer">Open</a>
          </>
        ) : (
          <div className="admin-card-form">
            <label>Title<input value={item.title} onChange={e => onChange({ ...item, title: e.target.value })} /></label>
            <label>Link<input value={item.href} onChange={e => onChange({ ...item, href: e.target.value })} /></label>
            <label>Description<textarea value={item.description} onChange={e => onChange({ ...item, description: e.target.value })} rows={3} /></label>
            <label>Background (paste your 2 lines)<textarea
              placeholder={"background: #2A7B9B;\nbackground: linear-gradient(90deg, rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%);"}
              value={item._bgInput ?? ('background: ' + (item.background || DEFAULT_BG))}
              onChange={e => onChange({ ...item, _bgInput: e.target.value, background: normalizeBg(e.target.value) })}
              rows={4}
            /></label>
{/* Functional: Predictive tags input with chips and remove (x). */}
            {/* Strategic: Lightweight custom input avoids Popper-based Autocomplete to ensure reliable builds. */}
            <div style={{ margin: '8px 0' }}>
              <TagInput
                value={tags}
                options={tagOptions}
                onChange={(next) => onChange({ ...item, tags: normalizeTags(next) })}
              />
            </div>
            <div className="form-actions">
              <button onClick={onCancel}>Cancel</button>
              <button onClick={onSave}>Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Disable SSR for Admin page to avoid server runtime issues with drag-and-drop and browser-only APIs.
export default dynamic(() => Promise.resolve(AdminPageInner), { ssr: false });

function AdminPageInner({ forcedOrgUuid = '', forcedOrgName = '', forcedOrgSlug = '' }) {
  const [token, setToken] = useState('');
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [status, setStatus] = useState('');
  const [tagOptions, setTagOptions] = useState([]);
  // Functional: Load and select organizations for scoping admin actions.
  // Strategic: Mirrors narimato header-based org context; keeps UI simple with a dropdown selector.
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgUuid, setSelectedOrgUuid] = useState('');
  // Minimal Organizations management inline: allow creating orgs directly from Admin.
  const [orgForm, setOrgForm] = useState({ name: '', slug: '', description: '' });

  // Helper: Fetch organizations with admin token
  async function fetchOrgs(authToken) {
    if (!authToken) { setOrgs([]); return; }
    try {
      const res = await fetch('/api/organizations', { headers: { 'Authorization': 'Bearer ' + authToken } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const list = Array.isArray(data.organizations) ? data.organizations : [];
      setOrgs(list);
      // If no selection yet, prefer forcedOrgUuid, otherwise default slug or first org
      if (!selectedOrgUuid) {
        if (forcedOrgUuid) {
          setSelectedOrgUuid(forcedOrgUuid);
          if (typeof window !== 'undefined') localStorage.setItem('admin.selectedOrgUuid', forcedOrgUuid);
        } else {
          const def = list.find(o => o.slug === 'default') || list[0];
          if (def) {
            setSelectedOrgUuid(def.uuid);
            if (typeof window !== 'undefined') localStorage.setItem('admin.selectedOrgUuid', def.uuid);
          }
        }
      }
    } catch {
      setOrgs([]);
    }
  }

  // Helper: Fetch cards scoped to selected organization (if any)
  async function fetchItems(authToken, orgUuid) {
    try {
      const headers = {};
      if (orgUuid) headers['X-Organization-UUID'] = orgUuid;
      const res = await fetch('/api/cards', { headers, cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setItems(data); else setItems([]);
    } catch {
      setItems([]);
    }
  }

  // Helper: Fetch tag suggestions scoped to selected org
  async function fetchTags(orgUuid) {
    try {
      const headers = {};
      if (orgUuid) headers['X-Organization-UUID'] = orgUuid;
      const res = await fetch('/api/tags', { headers, cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const arr = await res.json();
      setTagOptions(Array.isArray(arr) ? arr : []);
    } catch {
      setTagOptions([]);
    }
  }

  // Initial hydration: admin token and selected org
  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('ADMIN_TOKEN') || '' : '';
    const savedOrgLocal = typeof window !== 'undefined' ? localStorage.getItem('admin.selectedOrgUuid') || '' : '';
    const savedOrg = forcedOrgUuid || savedOrgLocal;
    setToken(savedToken);
    setSelectedOrgUuid(savedOrg);
    // Prime data
    fetchOrgs(savedToken);
    fetchItems(savedToken, savedOrg);
    fetchTags(savedOrg);
  }, []);

  // Re-fetch items and tags when selected org changes
  useEffect(() => {
    fetchItems(token, selectedOrgUuid);
    fetchTags(selectedOrgUuid);
  }, [selectedOrgUuid]);

  const sensors = useSensors(useSensor(PointerSensor));

  async function saveItem(it) {
    try {
      const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
      if (selectedOrgUuid) headers['X-Organization-UUID'] = selectedOrgUuid;
      const res = await fetch('/api/cards/' + encodeURIComponent(it._id), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ title: it.title, href: it.href, description: it.description, background: it.background, tags: normalizeTags(it.tags) })
      });
      const txt = await res.text();
      if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + txt);
      const fresh = JSON.parse(txt);
      setItems(prev => prev.map(x => x._id === fresh._id ? fresh : x));
      setEditingId('');
      setStatus('Saved'); setTimeout(() => setStatus(''), 1200);
      // Refresh tag options after potential new tag creation
      fetch('/api/tags').then(r => r.json()).then(arr => setTagOptions(Array.isArray(arr) ? arr : [])).catch(() => {});
    } catch (e) {
      setStatus(String(e.message || 'Save failed')); setTimeout(() => setStatus(''), 3500);
    }
  }

  async function deleteItem(id) {
    try {
      const headers = { 'Authorization': 'Bearer ' + token };
      if (selectedOrgUuid) headers['X-Organization-UUID'] = selectedOrgUuid;
      const res = await fetch('/api/cards/' + encodeURIComponent(id), { method: 'DELETE', headers });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + (await res.text()));
      setItems(prev => prev.filter(i => i._id !== id));
    } catch (e) {
      setStatus(String(e.message || 'Delete failed')); setTimeout(() => setStatus(''), 3000);
    }
  }

  async function addItem() {
    try {
      const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
      if (selectedOrgUuid) headers['X-Organization-UUID'] = selectedOrgUuid;
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: 'New Card',
          href: 'https://example.com',
          description: 'Describe me',
          background: DEFAULT_BG,
          tags: []
        })
      });
      const created = await res.json();
      if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + JSON.stringify(created));
      setItems(prev => [...prev, created]);
      // refresh tag suggestions not necessary here as no new tags yet
    } catch (e) {
      setStatus(String(e.message || 'Add failed')); setTimeout(() => setStatus(''), 3000);
    }
  }

  async function onDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i._id === active.id);
    const newIndex = items.findIndex(i => i._id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    try {
      const ids = reordered.map(i => i._id);
      const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
      if (selectedOrgUuid) headers['X-Organization-UUID'] = selectedOrgUuid;
      const res = await fetch('/api/cards/reorder', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + (await res.text()));
    } catch (e) {
      setStatus(String(e.message || 'Reorder failed')); setTimeout(() => setStatus(''), 3000);
    }
  }

  function saveToken() {
    localStorage.setItem('ADMIN_TOKEN', token);
    setStatus('Token saved'); setTimeout(() => setStatus(''), 1000);
    // Refresh organizations after saving token
    fetchOrgs(token);
  }

  // Create a new organization from Admin UI
  async function createOrganization(e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(orgForm.name || '').trim(),
          slug: String(orgForm.slug || '').trim().toLowerCase(),
          description: String(orgForm.description || '')
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      // Refresh org list and clear form
      await fetchOrgs(token);
      setOrgForm({ name: '', slug: '', description: '' });
      // Auto-select the newly created org if not forced by route
      if (!forcedOrgUuid && data?.organization?.uuid) {
        setSelectedOrgUuid(data.organization.uuid);
        localStorage.setItem('admin.selectedOrgUuid', data.organization.uuid);
      }
      setStatus('Organization created'); setTimeout(() => setStatus(''), 1200);
    } catch (e) {
      setStatus('Create organization failed'); setTimeout(() => setStatus(''), 1500);
    }
  }

  function onChangeOrg(e) {
    if (forcedOrgUuid) return; // locked by route
    const v = e.target.value;
    setSelectedOrgUuid(v);
    if (typeof window !== 'undefined') localStorage.setItem('admin.selectedOrgUuid', v);
    setStatus('Organization selected'); setTimeout(() => setStatus(''), 1000);
  }

  return (
    <main style={{ padding: 16 }}>
      <section style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <input value={token} onChange={e => setToken(e.target.value)} placeholder="Admin token" style={{ width: 360 }} />
        <button onClick={saveToken}>Save token</button>
        {/* Functional: Organization selector to scope admin operations */}
        {/* Strategic: Clear alternative to breadcrumbs; keeps UI minimal */}
        <select value={selectedOrgUuid} onChange={onChangeOrg} disabled={!!forcedOrgUuid} style={{ minWidth: 220 }}>
          <option value="">Select organization</option>
          {orgs.map(o => (
            <option key={o.uuid} value={o.uuid}>{o.name} /{o.slug}</option>
          ))}
        </select>
        <button onClick={() => fetchOrgs(token)}>Refresh orgs</button>
        <a href="/organizations" className="tag-chip" style={{ marginLeft: 'auto' }}>Organizations</a>
        <button onClick={addItem} disabled={!token || !selectedOrgUuid}>Add new card</button>
        <span style={{ opacity:.7, fontSize:12 }}>Auth: {token ? '✓' : '✗'}</span>
        <span style={{ opacity:.7, fontSize:12 }}>Org: {selectedOrgUuid ? '✓' : '✗'}</span>
        {status ? <span style={{ opacity:.75 }}>{status}</span> : null}
      </section>

      {/* Inline Create Organization (minimal) */}
      <section style={{ marginBottom: 16 }}>
        <details>
          <summary style={{ cursor:'pointer' }}>Create Organization</summary>
          <form onSubmit={createOrganization} style={{ display:'grid', gap: 8, marginTop: 8, maxWidth: 520 }}>
            <label>Name<input value={orgForm.name} onChange={e => setOrgForm(prev => ({ ...prev, name: e.target.value }))} required /></label>
            <label>Slug<input value={orgForm.slug} onChange={e => setOrgForm(prev => ({ ...prev, slug: e.target.value.toLowerCase() }))} required /></label>
            <label>Description<textarea value={orgForm.description} onChange={e => setOrgForm(prev => ({ ...prev, description: e.target.value }))} rows={3} /></label>
            <div style={{ display:'flex', gap: 8 }}>
              <button type="submit" disabled={!token}>Create</button>
              <a href="/organizations" className="tag-chip">Open full org manager</a>
            </div>
          </form>
        </details>
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map(i => i._id)} strategy={verticalListSortingStrategy}>
          <div className="admin-grid">
            {items.map(it => {
              const editing = editingId === it._id;
              return (
                <Card
                  key={it._id}
                  item={it}
                  editing={editing}
                  tagOptions={tagOptions}
                  onStartEdit={() => setEditingId(it._id)}
                  onCancel={() => setEditingId('')}
                  onSave={() => saveItem(it)}
                  onDelete={() => deleteItem(it._id)}
                  onChange={(updated) => setItems(prev => prev.map(x => x._id === updated._id ? updated : x))}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </main>
  );
}
