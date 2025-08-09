import { useEffect, useMemo, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function Row({ item, onChange, onSave, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item._id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'grid',
    gridTemplateColumns: '24px 1fr 1fr 2fr 120px',
    gap: 8,
    alignItems: 'center',
    padding: 8,
    background: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    border: '1px solid #e6e8ef'
  };
  return (
    <div ref={setNodeRef} style={style}>
      <button {...attributes} {...listeners} style={{ cursor: 'grab' }}>↕</button>
      <input value={item.title} onChange={e => onChange({ ...item, title: e.target.value })} placeholder="Title" />
      <input value={item.href} onChange={e => onChange({ ...item, href: e.target.value })} placeholder="https://..." />
      <input value={item.description} onChange={e => onChange({ ...item, description: e.target.value })} placeholder="Description" />
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onSave(item)}>Save</button>
        <button onClick={() => onDelete(item._id)} style={{ color: '#b00020' }}>Delete</button>
      </div>
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState('');
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('ADMIN_TOKEN') || '' : '';
    setToken(saved);
    fetch('/api/cards', { cache: 'no-store' })
      .then(r => r.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const sensors = useSensors(useSensor(PointerSensor));

  async function saveItem(updated) {
    if (!token) {
      setStatus('No ADMIN_TOKEN set (paste it and Save token)');
      setTimeout(() => setStatus(''), 2500);
      return;
    }
    try {
      const res = await fetch('/api/cards/' + encodeURIComponent(updated._id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          title: updated.title,
          href: updated.href,
          description: updated.description
        })
      });
      const txt = await res.text();
      if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + txt);
      const fresh = JSON.parse(txt);
      setItems(prev => prev.map(i => (i._id === fresh._id ? fresh : i)));
      setStatus('Saved');
      setTimeout(() => setStatus(''), 1200);
    } catch (e) {
      setStatus(String(e.message || 'Save failed'));
      setTimeout(() => setStatus(''), 3500);
    }
  }

  async function deleteItem(id) {
    if (!token) { setStatus('No ADMIN_TOKEN set'); setTimeout(() => setStatus(''), 2000); return; }
    try {
      const res = await fetch('/api/cards/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + (await res.text()));
      setItems(prev => prev.filter(i => i._id !== id));
    } catch (e) {
      setStatus(String(e.message || 'Delete failed')); setTimeout(() => setStatus(''), 3000);
    }
  }

  async function addItem() {
    if (!token) { setStatus('No ADMIN_TOKEN set'); setTimeout(() => setStatus(''), 2000); return; }
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          title: 'New Card',
          href: 'https://example.com',
          description: 'Describe me'
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
    <main className="grid" style={{ gridTemplateColumns: '1fr', rowGap: 12 }}>
      <section style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={token} onChange={e => setToken(e.target.value)} placeholder="Admin token" style={{ width: 360 }} />
        <button onClick={saveToken}>Save token</button>
        <button onClick={addItem}>Add new card</button>
        <span style={{ opacity:.7, fontSize:12 }}>Auth: {token ? '✓' : '✗'}</span>
        {status ? <span style={{ opacity: .75 }}>{status}</span> : null}
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map(i => i._id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map(it => (
              <Row
                key={it._id}
                item={it}
                onChange={(updated) => setItems(prev => prev.map(x => x._id === updated._id ? updated : x))}
                onSave={saveItem}
                onDelete={deleteItem}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <section style={{ gridColumn: '1 / -1', opacity: .7, fontSize: 12 }}>
        Tip: Paste your ADMIN_TOKEN, Save token, then Add/Edit/Drag rows. Changes persist to MongoDB.
      </section>
    </main>
  );
}
