// app/brands/[slug]/plan/page.js — 90-day plan for the brand.

import { notFound } from 'next/navigation';
import { getBrand, activePlan } from '../../../../lib/store';
import Nav from '../../../_components/Nav';
import PlanView from './PlanView';

export const dynamic = 'force-dynamic';

export default async function PlanPage({ params }) {
  const brand = await getBrand(params.slug);
  if (!brand) notFound();
  const active = activePlan(brand);
  const past = (brand.plans || []).filter((p) => p.closedAt);

  return (
    <>
      <Nav brand={brand} section="plan" />
      <main style={styles.main}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={styles.h1}>90-day plan</h1>
          <p style={styles.sub}>One page. One quarter. One bet.</p>
        </header>
        <PlanView brandSlug={brand.slug} initialActive={active} initialPast={past} />
      </main>
    </>
  );
}

const styles = {
  main: { maxWidth: 760, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111' },
  h1: { fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: -0.3 },
  sub: { color: '#666', margin: 0 },
};
