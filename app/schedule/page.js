// app/schedule/page.js — Cross-brand schedule.

import Link from 'next/link';
import { listBrands } from '../../lib/store';
import Nav from '../_components/Nav';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  let brands = [];
  let error = null;
  try {
    brands = await listBrands();
  } catch (err) {
    error = err.message;
  }

  // Flatten all posts with publishAt
  const scheduled = [];
  for (const b of brands) {
    for (const p of b.posts || []) {
      if (p.publishAt) {
        scheduled.push({ brand: b, post: p });
      }
    }
  }

  scheduled.sort((a, b) => (a.post.publishAt || '').localeCompare(b.post.publishAt || ''));

  const grouped = groupByDay(scheduled);

  return (
    <>
      <Nav section="schedule" />
      <main style={styles.main}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={styles.h1}>Schedule</h1>
          <p style={styles.sub}>All scheduled posts across your brands.</p>
        </header>

        {error && <div style={styles.error}>Error loading: {error}</div>}

        {scheduled.length === 0 ? (
          <p style={{ color: '#999' }}>
            Nothing scheduled. Set a publish date on any post to see it here.
          </p>
        ) : (
          <div>
            {Object.entries(grouped).map(([dayLabel, items]) => (
              <section key={dayLabel} style={styles.daySection}>
                <h2 style={styles.dayHeader}>{dayLabel}</h2>
                {items.map(({ brand, post }) => (
                  <Link
                    key={post.id}
                    href={`/brands/${brand.slug}/posts`}
                    style={styles.item}
                  >
                    <div style={styles.itemTime}>{formatTime(post.publishAt)}</div>
                    <div style={styles.itemBody}>
                      <div style={styles.itemBrand}>{brand.name}</div>
                      <div style={styles.itemText}>
                        {truncate(post.draft || post.brief || '(empty)', 140)}
                      </div>
                    </div>
                  </Link>
                ))}
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function groupByDay(items) {
  const groups = {};
  for (const it of items) {
    const d = new Date(it.post.publishAt);
    const key = d.toDateString();
    const label = formatDay(d);
    if (!groups[label]) groups[label] = [];
    groups[label].push(it);
  }
  return groups;
}

function formatDay(d) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const diffDays = Math.round((that - today) / (1000 * 60 * 60 * 24));
  const date = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  if (diffDays === 0) return `Today · ${date}`;
  if (diffDays === 1) return `Tomorrow · ${date}`;
  if (diffDays === -1) return `Yesterday · ${date}`;
  if (diffDays < 0) return `${date} (${-diffDays} days ago)`;
  return `${date} (in ${diffDays} days)`;
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }

const styles = {
  main: { maxWidth: 800, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111' },
  h1: { fontSize: 28, fontWeight: 700, margin: '0 0 8px', letterSpacing: -0.3 },
  sub: { color: '#666', margin: 0 },
  error: { background: '#fee', color: '#900', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 14 },
  daySection: { marginBottom: 28 },
  dayHeader: { fontSize: 13, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #eee' },
  item: {
    display: 'flex', gap: 16, padding: '12px 14px', marginBottom: 6,
    border: '1px solid #eee', borderRadius: 10, background: '#fff',
    textDecoration: 'none', color: 'inherit',
  },
  itemTime: { fontSize: 13, fontWeight: 600, color: '#0070f3', minWidth: 60 },
  itemBody: { flex: 1, minWidth: 0 },
  itemBrand: { fontSize: 12, color: '#999', marginBottom: 2 },
  itemText: { fontSize: 14, color: '#222', lineHeight: 1.5 },
};
