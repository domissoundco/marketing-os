// app/_components/BrandsList.js
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function BrandsList({ initialBrands }) {
  const [brands, setBrands] = useState(initialBrands || []);
  const [busy, setBusy] = useState('');

  async function toggleFocus(e, brand) {
    e.preventDefault(); e.stopPropagation();
    const turningOn = !brand.focus;
    let note = brand.focusNote || '';
    if (turningOn) {
      const entered = window.prompt('What are you pushing on this brand this quarter? (optional)', note);
      if (entered === null && !brand.focus) { /* cancelled but still set focus on */ }
      if (entered !== null) note = entered.trim();
    }
    setBusy(brand.slug);
    // optimistic
    setBrands((cur) => cur.map((b) => b.slug === brand.slug ? { ...b, focus: turningOn, focusNote: turningOn ? note : b.focusNote } : b));
    try {
      const res = await fetch(`/api/brands/${brand.slug}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focus: turningOn, focusNote: note }),
      });
      if (!res.ok) throw new Error('Failed');
    } catch {
      // revert on failure
      setBrands((cur) => cur.map((b) => b.slug === brand.slug ? { ...b, focus: brand.focus, focusNote: brand.focusNote } : b));
    } finally { setBusy(''); }
  }

  const sorted = [...brands].sort((a, b) => (b.focus ? 1 : 0) - (a.focus ? 1 : 0));

  if (brands.length === 0) {
    return <p style={{ color: '#888', marginBottom: 32 }}>No brands yet. Add your first one below.</p>;
  }

  return (
    <ul style={styles.list}>
      {sorted.map((b) => (
        <li key={b.slug} style={{ marginBottom: 10 }}>
          <Link href={`/brands/${b.slug}`} style={{ ...styles.card, ...(b.focus ? styles.cardFocus : {}) }}>
            <div style={styles.cardTop}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{b.name}</div>
              <button
                onClick={(e) => toggleFocus(e, b)}
                disabled={busy === b.slug}
                title={b.focus ? 'This quarter’s focus — click to remove' : 'Mark as this quarter’s focus'}
                style={styles.star(b.focus)}
              >
                {b.focus ? '★ Focus' : '☆ Focus'}
              </button>
            </div>
            {b.focus && b.focusNote ? <div style={styles.focusNote}>{b.focusNote}</div> : null}
            <div style={styles.cardSub}>
              {b.visionSnippet || 'No vision set yet'}
            </div>
            <div style={styles.cardMeta}>
              <span>{b.draftCount} draft{b.draftCount === 1 ? '' : 's'}</span>
              <span style={styles.metaDot}>·</span>
              <span>{b.schedCount} scheduled</span>
              <span style={styles.metaDot}>·</span>
              <span>{b.openTasks} open task{b.openTasks === 1 ? '' : 's'}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const styles = {
  list: { listStyle: 'none', padding: 0, margin: 0 },
  card: { display: 'block', padding: '16px 18px', border: '1px solid #eee', borderRadius: 10, textDecoration: 'none', color: 'inherit', background: '#fff' },
  cardFocus: { border: '1px solid #ffd28a', background: '#fffdf8' },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  star: (on) => ({
    fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 14, cursor: 'pointer',
    border: on ? '1px solid #e0a030' : '1px solid #ddd',
    background: on ? '#fff4e0' : '#fff', color: on ? '#a85a00' : '#999',
  }),
  focusNote: { fontSize: 13, color: '#a85a00', marginTop: 6 },
  cardSub: { color: '#888', fontSize: 13, marginTop: 6, lineHeight: 1.5 },
  cardMeta: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#999', marginTop: 8 },
  metaDot: { color: '#ddd' },
};
