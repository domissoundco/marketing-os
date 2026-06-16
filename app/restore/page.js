// app/restore/page.js — Data safety: download a backup, or restore from one.
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DataSafetyPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [err, setErr] = useState('');

  async function onFile(e) {
    setErr(''); setResult(''); setParsed(null); setPreview(null);
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data.brands)) throw new Error('This file has no "brands" — not a MarketingOS backup.');
      setParsed(data);
      setPreview({
        exportedAt: data.exportedAt || 'unknown date',
        brandCount: data.brands.length,
        names: data.brands.map((b) => b.name).filter(Boolean),
      });
    } catch (e) {
      setErr(`Couldn't read that file: ${e.message}`);
    }
  }

  async function restore() {
    if (!parsed) return;
    if (confirmText.trim().toUpperCase() !== 'RESTORE') { setErr('Type RESTORE to confirm.'); return; }
    setBusy(true); setErr(''); setResult('');
    try {
      const res = await fetch('/api/admin/restore', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      setResult(`Restored ${data.restored} brand${data.restored === 1 ? '' : 's'}${data.activityRestored ? ' and your check-in log' : ''}. You can now reload the app.`);
      setConfirmText('');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <main style={s.main}>
      <Link href="/" style={s.back}>← Back</Link>
      <h1 style={s.h1}>Data safety</h1>
      <p style={s.sub}>Download a full backup, or restore everything from one.</p>

      <section style={s.card}>
        <h2 style={s.h2}>Download a backup</h2>
        <p style={s.text}>A single JSON file with every brand, plan, post, product, stat, lead and your check-in log. Save it to your Google Drive backup folder.</p>
        <a href="/api/admin/backup" download style={s.downloadBtn}>↓ Download backup</a>
      </section>

      <section style={{ ...s.card, borderColor: '#fcc' }}>
        <h2 style={s.h2}>Restore from a backup</h2>
        <p style={s.text}>
          Upload a backup file to write it back into the live app. This <strong>overwrites</strong> any brand
          that’s in the file with the file’s version. Brands you’ve created since the backup are left alone.
        </p>
        <input type="file" accept="application/json,.json" onChange={onFile} disabled={busy} style={{ marginBottom: 12 }} />

        {preview && (
          <div style={s.preview}>
            <div><strong>{preview.brandCount}</strong> brand{preview.brandCount === 1 ? '' : 's'} in this file</div>
            <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>{preview.names.join(', ')}</div>
            <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>Backup taken: {preview.exportedAt}</div>
          </div>
        )}

        {parsed && (
          <div style={{ marginTop: 12 }}>
            <label style={s.text}>Type <strong>RESTORE</strong> to confirm:</label>
            <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} disabled={busy} style={s.input} />
            <button onClick={restore} disabled={busy || confirmText.trim().toUpperCase() !== 'RESTORE'} style={s.restoreBtn(busy || confirmText.trim().toUpperCase() !== 'RESTORE')}>
              {busy ? 'Restoring…' : 'Restore now'}
            </button>
          </div>
        )}

        {result && <div style={s.ok}>{result}</div>}
        {err && <div style={s.err}>{err}</div>}
      </section>
    </main>
  );
}

const s = {
  main: { maxWidth: 620, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111' },
  back: { fontSize: 13, color: '#0070f3', textDecoration: 'none' },
  h1: { fontSize: 28, fontWeight: 700, margin: '12px 0 4px', letterSpacing: -0.3 },
  sub: { color: '#666', margin: '0 0 28px' },
  card: { padding: 20, border: '1px solid #eee', borderRadius: 12, marginBottom: 20 },
  h2: { fontSize: 15, fontWeight: 700, margin: '0 0 8px' },
  text: { fontSize: 13, color: '#444', lineHeight: 1.55, margin: '0 0 12px' },
  downloadBtn: { display: 'inline-block', padding: '10px 18px', background: '#000', color: '#fff', borderRadius: 8, fontSize: 14, textDecoration: 'none', fontWeight: 500 },
  preview: { padding: 12, background: '#f7f7f7', borderRadius: 8, fontSize: 14 },
  input: { display: 'block', width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', margin: '6px 0 12px' },
  restoreBtn: (d) => ({ padding: '10px 18px', background: d ? '#e0a0a0' : '#c00', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: d ? 'default' : 'pointer' }),
  ok: { marginTop: 14, padding: 12, background: '#f3fff3', border: '1px solid #b8e8b8', borderRadius: 8, color: '#0a7000', fontSize: 14 },
  err: { marginTop: 14, padding: 12, background: '#fee', border: '1px solid #fcc', borderRadius: 8, color: '#900', fontSize: 14 },
};
