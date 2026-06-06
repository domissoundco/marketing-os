// app/_components/NewBrandForm.js — Client component for creating a brand.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewBrandForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      router.push(`/brands/${data.brand.slug}`);
      router.refresh();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input
        type="text"
        placeholder="Brand name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={busy}
        style={{
          flex: 1,
          minWidth: 220,
          padding: '12px 14px',
          border: '1px solid #ddd',
          borderRadius: 8,
          fontSize: 14,
          fontFamily: 'inherit',
        }}
      />
      <button
        type="submit"
        disabled={busy || !name.trim()}
        style={{
          padding: '12px 20px',
          background: busy || !name.trim() ? '#999' : '#000',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          cursor: busy || !name.trim() ? 'default' : 'pointer',
        }}
      >
        {busy ? 'Adding…' : 'Add brand'}
      </button>
      {err && (
        <div style={{ flexBasis: '100%', color: '#c00', fontSize: 13, marginTop: 4 }}>
          {err}
        </div>
      )}
    </form>
  );
}
