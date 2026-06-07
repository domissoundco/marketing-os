// app/brands/[slug]/identity/page.js

import { notFound } from 'next/navigation';
import { getBrand } from '../../../../lib/store';
import Nav from '../../../_components/Nav';
import BrandEditor from './BrandEditor';

export const dynamic = 'force-dynamic';

export default async function IdentityPage({ params }) {
  const brand = await getBrand(params.slug);
  if (!brand) notFound();

  return (
    <>
      <Nav brand={brand} section="identity" />
      <main style={styles.main}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={styles.h1}>Identity</h1>
          <p style={styles.sub}>Set the foundation. Posts are generated against this.</p>
        </header>
        <BrandEditor initial={brand} />
      </main>
    </>
  );
}

const styles = {
  main: { maxWidth: 720, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111' },
  h1: { fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: -0.3 },
  sub: { color: '#666', margin: 0 },
};
