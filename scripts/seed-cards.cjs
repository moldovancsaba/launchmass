'use strict';
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.ADMIN_TOKEN;
if (!TOKEN) { console.error('ADMIN_TOKEN env var missing'); process.exit(1); }

async function main() {
  const data = JSON.parse(fs.readFileSync('seed-cards.json', 'utf8'));
  const auth = { 'Authorization': 'Bearer ' + TOKEN };

  // delete all existing cards
  const current = await fetch(`${BASE}/api/cards`).then(r => r.json()).catch(() => []);
  for (const c of current) {
    const res = await fetch(`${BASE}/api/cards/${encodeURIComponent(c._id)}`, { method: 'DELETE', headers: auth });
    if (!res.ok) throw new Error(`Delete ${c._id} failed ${res.status} — ${await res.text()}`);
  }

  // insert new set
  let inserted = 0;
  for (const x of data) {
    const title = String(x.title || '');
    const href = String(x.href || '');
    const description = String(x.description || '');
    if (!title && !href && !description) continue;
    const body = { title, href, description, order: Number.isFinite(x.order) ? x.order : inserted };

    const res = await fetch(`${BASE}/api/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Insert failed ${res.status} — ${await res.text()}`);
    inserted++;
  }
  console.log(`Done. Inserted ${inserted} cards.`);
}
main().catch(e => { console.error(e); process.exit(1); });
