// app/brands/[slug]/BrandEditor.js — Client editor for brand identity.

'use client';

import { useState } from 'react';

const FIELDS = [
  { key: 'vision',      label: 'Vision',         hint: "The future state you're working toward.",       rows: 3 },
  { key: 'mission',     label: 'Mission',        hint: 'What you do every day to get there.',           rows: 3 },
  { key: 'positioning', label: 'Positioning',    hint: "Who it's for, what it does, why it's different.", rows: 4 },
  { key: 'audience',    label: 'Audience',       hint: "Who you're talking to.",                        rows: 3 },
  { key: 'voice',       label: 'Voice & tone',   hint: 'How you sound. Words you use, words you don\'t.', rows: 4 },
];

export default function BrandEditor({ initial }) {
  const [identity, setIdentity] = useState(initial.identity || {});
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(initial.updatedAt);
  const [err, setErr] = useState('');

  function update(key, value) {
    setIdentity((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/brands/${initial.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
      setSavedAt(data.brand.updatedAt);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {FIELDS.map((f) => (
        <div key={f.key} style={{ marginBottom: 28 }}>
          <label style={styles.label}>{f.label}</label>
          <div style={styles.hint}>{f.hint}</div>
          <textarea
            value={identity[f.key] || ''}
            onChange={(e) => update(f.key, e.target.value)}
            rows={f.rows}
            disabled={busy}
            style={styles.textarea}
          />
        </div>
      ))}

      <div style={styles.actions}>
        <button onClick={save} disabled={busy} style={styles.button(busy)}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {savedAt && !busy && !err && (
          <span style={{ color: '#666', fontSize: 13 }}>
            Last saved {new Date(savedAt).toLocaleString()}
          </span>
        )}
        {err && <span style={{ color: '#c00', fontSize: 13 }}>{err}</span>}
      </div>
    </div>
  );
}

const styles = {
  label: { display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 14 },
  hint: { color: '#888', fontSize: 12, marginBottom: 8 },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    lineHeight: 1.5,
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  actions: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' },
  button: (busy) => ({
    padding: '12px 22px',
    background: busy ? '#999' : '#000',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: busy ? 'default' : 'pointer',
  }),
};
