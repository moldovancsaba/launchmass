import { useEffect, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DEFAULT_BG = "linear-gradient(90deg, rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%)";

function normalizeBg(input) {
  const lines = String(input || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const linear = lines.find(l => l.startsWith('background: linear-gradient'));
  const color = lines.find(l => /^background:\s*#?[0-9a-fA-F]{3,8}/.test(l));
  const pick = (linear || color || input || '').replace(/^background:\s*/,'').replace(/;$/,'');
  return pick || DEFAULT_BG;
}

function Card({ item, editing, onStartEdit, onCancel, onSave, onDelete, onChange, sortable }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item._id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const bg = item.background || DEFAULT_BG;

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

export default function Admin() {
  const [token, setToken] = useState('');
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('ADMIN_TOKEN') || '' : '';
    setToken(saved);
    fetch('/api/cards', { cache: 'no-store' }).then(r => r.json()).then(setItems).catch(() => setItems([]));
  }, []);

  const sensors = useSensors(useSensor(PointerSensor));

  async function saveItem(it) {
    try {
      const res = await fetch('/api/cards/' + encodeURIComponent(it._id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ title: it.title, href: it.href, description: it.description, background: it.background })
      });
      const txt = await res.text();
      if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + txt);
      const fresh = JSON.parse(txt);
      setItems(prev => prev.map(x => x._id === fresh._id ? fresh : x));
      setEditingId('');
      setStatus('Saved'); setTimeout(() => setStatus(''), 1200);
    } catch (e) {
      setStatus(String(e.message || 'Save failed')); setTimeout(() => setStatus(''), 3500);
    }
  }

  async function deleteItem(id) {
    try {
      const res = await fetch('/api/cards/' + encodeURIComponent(id), { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + (await res.text()));
      setItems(prev => prev.filter(i => i._id !== id));
    } catch (e) {
      setStatus(String(e.message || 'Delete failed')); setTimeout(() => setStatus(''), 3000);
    }
  }

  async function addItem() {
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          title: 'New Card',
          href: 'https://example.com',
          description: 'Describe me',
          background: DEFAULT_BG
        })
      });
      const created = await res.json();
      if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + JSON.stringify(created));
      setItems(prev => [...prev, created]);
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
      const res = await fetch('/api/cards/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
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
  }

  return (
    <main style={{ padding: 16 }}>
      <section style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input value={token} onChange={e => setToken(e.target.value)} placeholder="Admin token" style={{ width: 360 }} />
        <button onClick={saveToken}>Save token</button>
        <button onClick={addItem}>Add new card</button>
        <span style={{ opacity:.7, fontSize:12 }}>Auth: {token ? '✓' : '✗'}</span>
        {status ? <span style={{ opacity:.75 }}>{status}</span> : null}
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
