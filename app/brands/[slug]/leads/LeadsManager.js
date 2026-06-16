// app/brands/[slug]/leads/LeadsManager.js
'use client';

import { useState } from 'react';

const STATUSES = ['new', 'contacted', 'talking', 'quoted', 'won', 'lost'];
const STATUS_LABEL = { new: 'New', contacted: 'Contacted', talking: 'In conversation', quoted: 'Quoted', won: 'Won', lost: 'Lost' };
const OPEN = ['new', 'contacted', 'talking', 'quoted'];

function todayStr() {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function LeadsManager({ brandSlug, initialLeads }) {
  const [leads, setLeads] = useState(initialLeads || []);
  const [adding, setAdding] = useState(false);

  function upsert(lead) {
    setLeads((cur) => {
      const i = cur.findIndex((l) => l.id === lead.id);
      if (i === -1) return [lead, ...cur];
      const next = [...cur]; next[i] = lead; return next;
    });
  }
  function remove(id) { setLeads((cur) => cur.filter((l) => l.id !== id)); }

  const today = todayStr();
  const open = leads.filter((l) => OPEN.includes(l.status));
  const won = leads.filter((l) => l.status === 'won');
  const pipelineValue = open.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  const wonValue = won.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  const dueCount = leads.filter((l) => OPEN.includes(l.status) && l.nextActionDate && l.nextActionDate <= today).length;

  // Sort: open first (overdue follow-ups at very top), then won, then lost.
  const sorted = [...leads].sort((a, b) => {
    const rank = (l) => l.status === 'won' ? 2 : l.status === 'lost' ? 3 : 0;
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    const da = (OPEN.includes(a.status) && a.nextActionDate) ? a.nextActionDate : '9999';
    const db = (OPEN.includes(b.status) && b.nextActionDate) ? b.nextActionDate : '9999';
    return da.localeCompare(db);
  });

  return (
    <div>
      <div style={s.summary}>
        <Tile label="Open leads" value={open.length} />
        <Tile label="Follow-ups due" value={dueCount} accent={dueCount > 0} />
        <Tile label="Pipeline value" value={pipelineValue ? `£${pipelineValue.toLocaleString()}` : '—'} />
        <Tile label="Won" value={won.length ? `${won.length} · £${wonValue.toLocaleString()}` : '0'} />
      </div>

      {adding ? (
        <LeadForm brandSlug={brandSlug} onSaved={(l) => { upsert(l); setAdding(false); }} onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} style={s.addBtn}>+ Add lead</button>
      )}

      <div style={{ marginTop: 20 }}>
        {leads.length === 0 ? (
          <p style={{ color: '#999' }}>No leads yet. Add the first person who waved back.</p>
        ) : (
          sorted.map((l) => (
            <LeadCard key={l.id} brandSlug={brandSlug} lead={l} today={today} onChange={upsert} onDelete={() => remove(l.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, accent }) {
  return (
    <div style={{ ...s.tile, ...(accent ? s.tileAccent : {}) }}>
      <div style={{ ...s.tileValue, ...(accent ? { color: '#a85a00' } : {}) }}>{value}</div>
      <div style={s.tileLabel}>{label}</div>
    </div>
  );
}

function LeadForm({ brandSlug, onSaved, onCancel }) {
  const [f, setF] = useState({ name: '', contact: '', source: '', value: '', note: '', nextAction: '', nextActionDate: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  function set(k, v) { setF((c) => ({ ...c, [k]: v })); }

  async function save() {
    if (!f.name.trim()) { setErr('Name is required'); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/leads`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved(data.lead);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={s.form}>
      <div style={s.formGrid}>
        <Field label="Name / company"><input value={f.name} onChange={(e) => set('name', e.target.value)} disabled={busy} style={s.input} autoFocus /></Field>
        <Field label="Contact (email / phone / handle)"><input value={f.contact} onChange={(e) => set('contact', e.target.value)} disabled={busy} style={s.input} /></Field>
        <Field label="Source (how they found you)"><input value={f.source} onChange={(e) => set('source', e.target.value)} disabled={busy} style={s.input} /></Field>
        <Field label="Potential value (£)"><input type="number" min="0" value={f.value} onChange={(e) => set('value', e.target.value)} disabled={busy} style={s.input} /></Field>
        <Field label="Next action"><input value={f.nextAction} onChange={(e) => set('nextAction', e.target.value)} disabled={busy} style={s.input} placeholder="e.g. send quote, call back" /></Field>
        <Field label="Next action date"><input type="date" value={f.nextActionDate} onChange={(e) => set('nextActionDate', e.target.value)} disabled={busy} style={s.input} /></Field>
      </div>
      <Field label="Notes"><textarea value={f.note} onChange={(e) => set('note', e.target.value)} disabled={busy} rows={2} style={s.textarea} /></Field>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={save} disabled={busy || !f.name.trim()} style={s.primary(busy || !f.name.trim())}>{busy ? 'Saving…' : 'Add lead'}</button>
        <button onClick={onCancel} disabled={busy} style={s.secondary(busy)}>Cancel</button>
      </div>
      {err && <div style={s.errInline}>{err}</div>}
    </div>
  );
}

function LeadCard({ brandSlug, lead, today, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lead);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  function set(k, v) { setDraft((c) => ({ ...c, [k]: v })); }

  const overdue = OPEN.includes(lead.status) && lead.nextActionDate && lead.nextActionDate <= today;

  async function patch(changes) {
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/leads/${lead.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      onChange(data.lead); setDraft(data.lead);
      return true;
    } catch (e) { setErr(e.message); return false; }
    finally { setBusy(false); }
  }

  async function saveEdit() {
    const ok = await patch({
      name: draft.name, contact: draft.contact, source: draft.source,
      value: draft.value, note: draft.note, nextAction: draft.nextAction, nextActionDate: draft.nextActionDate,
    });
    if (ok) setEditing(false);
  }

  async function remove() {
    if (!confirm(`Delete lead "${lead.name}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/brands/${brandSlug}/leads/${lead.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      onDelete();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  if (editing) {
    return (
      <div style={s.card}>
        <div style={s.formGrid}>
          <Field label="Name / company"><input value={draft.name} onChange={(e) => set('name', e.target.value)} disabled={busy} style={s.input} /></Field>
          <Field label="Contact"><input value={draft.contact} onChange={(e) => set('contact', e.target.value)} disabled={busy} style={s.input} /></Field>
          <Field label="Source"><input value={draft.source} onChange={(e) => set('source', e.target.value)} disabled={busy} style={s.input} /></Field>
          <Field label="Potential value (£)"><input type="number" min="0" value={draft.value ?? ''} onChange={(e) => set('value', e.target.value)} disabled={busy} style={s.input} /></Field>
          <Field label="Next action"><input value={draft.nextAction} onChange={(e) => set('nextAction', e.target.value)} disabled={busy} style={s.input} /></Field>
          <Field label="Next action date"><input type="date" value={draft.nextActionDate || ''} onChange={(e) => set('nextActionDate', e.target.value)} disabled={busy} style={s.input} /></Field>
        </div>
        <Field label="Notes"><textarea value={draft.note} onChange={(e) => set('note', e.target.value)} disabled={busy} rows={2} style={s.textarea} /></Field>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={saveEdit} disabled={busy} style={s.primary(busy)}>{busy ? 'Saving…' : 'Save'}</button>
          <button onClick={() => { setDraft(lead); setEditing(false); }} disabled={busy} style={s.secondary(busy)}>Cancel</button>
          <button onClick={remove} disabled={busy} style={s.danger(busy)}>Delete</button>
        </div>
        {err && <div style={s.errInline}>{err}</div>}
      </div>
    );
  }

  return (
    <div style={{ ...s.card, ...(overdue ? s.cardOverdue : {}) }}>
      <div style={s.cardHead}>
        <select value={lead.status} onChange={(e) => patch({ status: e.target.value })} disabled={busy} style={s.statusSel(lead.status)}>
          {STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
        </select>
        <span style={s.name}>{lead.name}</span>
        {lead.value ? <span style={s.value}>£{Number(lead.value).toLocaleString()}</span> : null}
        <button onClick={() => setEditing(true)} style={s.editBtn}>edit</button>
      </div>
      {(lead.contact || lead.source) && (
        <div style={s.metaLine}>
          {lead.contact && <span>{lead.contact}</span>}
          {lead.contact && lead.source && <span style={{ color: '#ddd' }}> · </span>}
          {lead.source && <span>via {lead.source}</span>}
        </div>
      )}
      {lead.note && <div style={s.note}>{lead.note}</div>}
      {OPEN.includes(lead.status) && (lead.nextAction || lead.nextActionDate) && (
        <div style={{ ...s.followUp, ...(overdue ? { color: '#b00000', fontWeight: 600 } : {}) }}>
          {overdue ? '⚠ ' : '→ '}
          {lead.nextAction || 'Follow up'}{lead.nextActionDate ? ` · ${lead.nextActionDate}` : ''}
        </div>
      )}
      {err && <div style={s.errInline}>{err}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={s.fLabel}>{label}</label>
      {children}
    </div>
  );
}

const s = {
  summary: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 },
  tile: { padding: '14px 16px', border: '1px solid #eee', borderRadius: 10, background: '#fff' },
  tileAccent: { border: '1px solid #ffd28a', background: '#fffaf2' },
  tileValue: { fontSize: 20, fontWeight: 700, color: '#111' },
  tileLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },

  addBtn: { padding: '10px 16px', border: '1px dashed #ccc', borderRadius: 8, background: 'transparent', color: '#444', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' },
  form: { padding: 16, border: '1px solid #ddd', borderRadius: 12, background: '#fafafa', marginBottom: 8 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  fLabel: { display: 'block', fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  input: { width: '100%', padding: '9px 11px', border: '1px solid #ddd', borderRadius: 7, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '9px 11px', border: '1px solid #ddd', borderRadius: 7, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' },

  card: { padding: 16, border: '1px solid #eee', borderRadius: 12, marginBottom: 10, background: '#fff' },
  cardOverdue: { border: '1px solid #fcc', background: '#fff8f8' },
  cardHead: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  statusSel: (st) => ({
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
    background: st === 'won' ? '#e8ffe8' : st === 'lost' ? '#f0f0f0' : st === 'quoted' ? '#e8f3ff' : st === 'talking' ? '#fff5e0' : '#f5f5f5',
    color: st === 'won' ? '#0a7000' : st === 'lost' ? '#999' : st === 'quoted' ? '#0070f3' : st === 'talking' ? '#a85a00' : '#555',
  }),
  name: { flex: 1, fontSize: 15, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  value: { fontSize: 13, fontWeight: 600, color: '#0a7000' },
  editBtn: { background: 'none', border: 'none', color: '#999', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' },
  metaLine: { fontSize: 13, color: '#666', marginBottom: 4 },
  note: { fontSize: 13, color: '#444', lineHeight: 1.5, marginBottom: 4 },
  followUp: { fontSize: 13, color: '#444', marginTop: 4 },

  primary: (d) => ({ padding: '9px 16px', background: d ? '#999' : '#000', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: d ? 'default' : 'pointer' }),
  secondary: (d) => ({ padding: '9px 14px', background: '#fff', color: d ? '#aaa' : '#000', border: '1px solid #ddd', borderRadius: 7, fontSize: 13, cursor: d ? 'default' : 'pointer' }),
  danger: (d) => ({ padding: '9px 14px', background: '#fff', color: d ? '#aaa' : '#c00', border: '1px solid #fcc', borderRadius: 7, fontSize: 13, cursor: d ? 'default' : 'pointer' }),
  errInline: { color: '#c00', fontSize: 12, marginTop: 8 },
};
