// app/brands/[slug]/business-plan/page.js

import { notFound } from 'next/navigation';
import { getBrand, activeBusinessPlan } from '../../../../lib/store';
import Nav from '../../../_components/Nav';
import BusinessPlanView from './BusinessPlanView';

export const dynamic = 'force-dynamic';

export default async function BusinessPlanPage({ params }) {
  const brand = await getBrand(params.slug);
  if (!brand) notFound();

  const active = activeBusinessPlan(brand);
  const past = (brand.businessPlans || []).filter((p) => p.lockedAt)
    .sort((a, b) => (b.lockedAt || '').localeCompare(a.lockedAt || ''));

  return (
    <>
      <Nav brand={brand} section="business-plan" />
      <main style={styles.main}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={styles.h1}>Business Plan</h1>
          <p style={styles.sub}>The foundation. From here you set identity, then the 90-day goals. Loan-ready structure.</p>
        </header>
        <BusinessPlanView brandSlug={brand.slug} initialActive={active} initialPast={past} />
      </main>
    </>
  );
}

const styles = {
  main: { maxWidth: 760, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111' },
  h1: { fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: -0.3 },
  sub: { color: '#666', margin: 0 },
};
