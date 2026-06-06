// app/page.js — Home: list of brands.

import Link from 'next/link';
import { listBrands } from '../lib/store';
import NewBrandForm from './_components/NewBrandForm';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let brands = [];
  let error = null;
  try {
    brands = await listBrands();
  } catch (err) {
    error = err.message;
  }

  return (
    <main style={styles.main}>
      <header style={{ marginBottom: 40 }}>
        <h1 style={styles.h1}>MarketingOS</h1>
        <p style={styles.sub}>Your brands and what they stand for.</p>
      </header>

      {error && <div style={styles.error}>Error loading brands: {error}</div>}

      {brands.length === 0 ? (
        <p style={{ color: '#888', marginBottom: 32 }}>
          No brands yet. Add your first one below.
        </p>
      ) : (
        <ul style={styles.list}>
          {brands.map((b) => {
            const vision = b.identity?.vision?.trim();
            return (
              <li key={b.slug} style={{ marginBottom: 10 }}>
                <Link href={`/brands/${b.slug}`} style={styles.card}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{b.name}</div>
                  <div style={styles.cardSub}>
                    {vision ? (vision.length > 90 ? vision.slice(0, 90) + '…' : vision) : 'No vision set yet'}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <section style={{ marginTop: 32 }}>
        <h2 style={styles.h2}>Add a brand</h2>
        <NewBrandForm />
      </section>
    </main>
  );
}

const styles = {
  main: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '56px 24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#111',
  },
  h1: { fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: -0.5 },
  h2: { fontSize: 14, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  sub: { color: '#666', marginTop: 8, marginBottom: 0 },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  card: {
    display: 'block',
    padding: '16px 18px',
    border: '1px solid #eee',
    borderRadius: 10,
    textDecoration: 'none',
    color: 'inherit',
    background: '#fff',
  },
  cardSub: { color: '#888', fontSize: 13, marginTop: 6, lineHeight: 1.5 },
  error: { background: '#fee', color: '#900', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 14 },
};
