// app/login/page.js — Password sign-in page.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!pw) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Wrong password');
      }
      const next = new URLSearchParams(window.location.search).get('next') || '/';
      router.push(next);
      router.refresh();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <main style={styles.main}>
      <form onSubmit={submit} style={styles.card}>
        <h1 style={styles.h1}>MarketingOS</h1>
        <p style={styles.sub}>Sign in to continue.</p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          disabled={busy}
          style={styles.input}
        />
        <button
          type="submit"
          disabled={busy || !pw}
          style={styles.button(busy || !pw)}
        >
          {busy ? 'Checking…' : 'Sign in'}
        </button>
        {err && <div style={styles.err}>{err}</div>}
      </form>
    </main>
  );
}

const styles = {
  main: {
    display: 'flex',
    minHeight: '90vh',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#111',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: 32,
    border: '1px solid #eee',
    borderRadius: 12,
    background: '#fff',
  },
  h1: { fontSize: 22, fontWeight: 700, margin: '0 0 6px' },
  sub: { color: '#666', fontSize: 14, margin: '0 0 24px' },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    marginBottom: 12,
  },
  button: (disabled) => ({
    width: '100%',
    padding: 12,
    background: disabled ? '#999' : '#000',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: disabled ? 'default' : 'pointer',
  }),
  err: { color: '#c00', fontSize: 13, marginTop: 12 },
};
