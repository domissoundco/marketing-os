// app/brands/[slug]/page.js — Brand Overview (default landing).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBrand, activePlan, latestStats } from '../../../lib/store';
import Nav from '../../_components/Nav';
import Overview from './Overview';

export const dynamic = 'force-dynamic';

export default async function BrandOverviewPage({ params }) {
  const brand = await getBrand(params.slug);
  if (!brand) notFound();

  const plan = activePlan(brand);
  const stats = computeBrandStats(brand);

  return (
    <>
      <Nav brand={brand} section="overview" />
      <main style={styles.main}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={styles.h1}>{brand.name}</h1>
          <p style={styles.sub}>This week, what's working, what's next.</p>
        </header>
        <Overview brandSlug={brand.slug} brand={brand} plan={plan} stats={stats} />
      </main>
    </>
  );
}

function computeBrandStats(brand) {
  const posts = brand.posts || [];
  const statusCounts = { draft: 0, ready: 0, scheduled: 0, posted: 0 };
  for (const p of posts) statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;

  // Totals across posted posts using their latest stats entry.
  const totals = { impressions: 0, clicks: 0, leads: 0, revenue: 0, postsWithStats: 0 };
  const postedWithStats = [];
  for (const p of posts) {
    if (p.status !== 'posted') continue;
    const s = latestStats(p);
    if (!s) continue;
    totals.postsWithStats += 1;
    totals.impressions += s.impressions || 0;
    totals.clicks      += s.clicks || 0;
    totals.leads       += s.leads || 0;
    totals.revenue     += s.revenue || 0;
    postedWithStats.push({ post: p, stats: s });
  }

  // Best/worst by impressions, fall back to clicks.
  const sortedByImpr = [...postedWithStats].sort((a, b) =>
    (b.stats.impressions || 0) - (a.stats.impressions || 0)
  );
  const best = sortedByImpr.slice(0, 3);
  const worst = sortedByImpr.length > 3 ? sortedByImpr.slice(-3).reverse() : [];

  // Per-product aggregation.
  const products = brand.products || [];
  const perProduct = products.map((prod) => {
    const tagged = posts.filter((p) => (p.productIds || []).includes(prod.id));
    const taggedPosted = tagged.filter((p) => p.status === 'posted');
    const aggr = { impressions: 0, clicks: 0, leads: 0, revenue: 0 };
    for (const p of taggedPosted) {
      const s = latestStats(p);
      if (!s) continue;
      aggr.impressions += s.impressions || 0;
      aggr.clicks      += s.clicks || 0;
      aggr.leads       += s.leads || 0;
      aggr.revenue     += s.revenue || 0;
    }
    return { product: prod, postCount: tagged.length, postedCount: taggedPosted.length, ...aggr };
  });

  return { statusCounts, totals, best, worst, perProduct };
}

const styles = {
  main: { maxWidth: 880, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111' },
  h1: { fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: -0.3 },
  sub: { color: '#666', margin: 0 },
};
