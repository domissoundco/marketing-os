// app/brands/[slug]/page.js — Brand detail page.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBrand } from '../../../lib/store';
import BrandEditor from './BrandEditor';

export const dynamic = 'force-dynamic';

export default async function BrandPage({ params }) {
  const brand = await getBrand(params.slug);
  if (!brand) notFound();

  return (
    <main style={styles.main}>
      <Link href="/" style={styles.back}>← All brands</Link>
      <h1 style={styles.h1}>{brand.name}</h1>
      <p style={styles.sub}>Set the identity. Posts will be generated against this.</p>
      <BrandEditor initial={brand} />
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
  back: { color: '#666', textDecoration: 'none', fontSize: 14, display: 'inline-block', marginBottom: 24 },
  h1: { fontSize: 28, fontWeight: 700, margin: '0 0 8px 0', letterSpacing: -0.3 },
  sub: { color: '#666', marginTop: 0, marginBottom: 32 },
};
