// app/brands/[slug]/leads/page.js

import { notFound } from 'next/navigation';
import { getBrand } from '../../../../lib/store';
import Nav from '../../../_components/Nav';
import LeadsManager from './LeadsManager';

export const dynamic = 'force-dynamic';

export default async function LeadsPage({ params }) {
  const brand = await getBrand(params.slug);
  if (!brand) notFound();

  return (
    <>
      <Nav brand={brand} section="leads" />
      <main style={styles.main}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={styles.h1}>Leads</h1>
          <p style={styles.sub}>Who waved back. Track enquiries, move them along, never drop a follow-up.</p>
        </header>
        <LeadsManager brandSlug={brand.slug} initialLeads={brand.leads || []} />
      </main>
    </>
  );
}

const styles = {
  main: { maxWidth: 760, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111' },
  h1: { fontSize: 26, fontWeight: 700, margin: '0 0 6px', letterSpacing: -0.3 },
  sub: { color: '#666', margin: 0 },
};
