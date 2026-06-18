// app/page.js — Home: daily command center, then brands.

import { listBrands, activePlan } from '../lib/store';
import { getActivityLog } from '../lib/activity';
import Nav from './_components/Nav';
import NewBrandForm from './_components/NewBrandForm';
import TodayDashboard from './_components/TodayDashboard';
import BrandsList from './_components/BrandsList';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let brands = [];
  let log = {};
  let error = null;
  try {
    [brands, log] = await Promise.all([listBrands(), getActivityLog()]);
  } catch (err) {
    error = err.message;
  }

  const posts = [];
  const brandSummaries = [];
  const focusBrands = [];
  const brandCards = [];
  const followUps = [];

  for (const b of brands) {
    const plan = activePlan(b);
    for (const p of b.posts || []) {
      if (p.status === 'ready' || p.status === 'scheduled') {
        const text = (p.draft || p.brief || '(empty)').replace(/\s+/g, ' ').trim();
        posts.push({
          brandSlug: b.slug, brandName: b.name, id: p.id,
          snippet: text.length > 90 ? text.slice(0, 90) + '…' : text,
          status: p.status, publishAt: p.publishAt || null,
        });
      }
    }
    brandSummaries.push({
      slug: b.slug, name: b.name,
      plan: plan ? { startedAt: plan.startedAt, startDate: plan.startDate, reviewDate: plan.reviewDate, goal: plan.goal } : null,
    });
    if (b.focus) focusBrands.push({ slug: b.slug, name: b.name, focusNote: b.focusNote || '' });

    for (const l of b.leads || []) {
      if (['new', 'contacted', 'talking', 'quoted'].includes(l.status) && l.nextActionDate) {
        followUps.push({
          brandSlug: b.slug, brandName: b.name, leadId: l.id,
          leadName: l.name, nextAction: l.nextAction || '', nextActionDate: l.nextActionDate,
        });
      }
    }

    const vision = b.identity?.vision?.trim();
    brandCards.push({
      slug: b.slug, name: b.name,
      visionSnippet: vision ? (vision.length > 90 ? vision.slice(0, 90) + '…' : vision) : '',
      draftCount: (b.posts || []).filter((p) => p.status === 'draft').length,
      schedCount: (b.posts || []).filter((p) => p.status === 'scheduled').length,
      openTasks: (b.tasks || []).filter((t) => !t.done).length,
      focus: !!b.focus, focusNote: b.focusNote || '',
    });
  }

  return (
    <>
      <Nav section="home" />
      <main style={styles.main}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={styles.h1}>Today</h1>
          <p style={styles.sub}>Show up. Ship something. Keep the streak.</p>
        </header>

        {error && <div style={styles.error}>Error loading data: {error}</div>}

        {!error && (
          <TodayDashboard brands={brandSummaries} posts={posts} initialLog={log} focusBrands={focusBrands} followUps={followUps} />
        )}

        <section>
          <h2 style={styles.h2}>Brands</h2>
          <BrandsList initialBrands={brandCards} />
          <div style={{ marginTop: 24 }}>
            <h2 style={styles.h2}>Add a brand</h2>
            <NewBrandForm />
          </div>
        </section>

        <footer style={styles.footer}>
          <a href="/restore" style={styles.footerLink}>Data backup &amp; restore</a>
        </footer>
      </main>
    </>
  );
}

const styles = {
  main: { maxWidth: 720, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111' },
  h1: { fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: -0.5 },
  h2: { fontSize: 14, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  sub: { color: '#666', marginTop: 8, marginBottom: 0 },
  error: { background: '#fee', color: '#900', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 14 },
  footer: { marginTop: 48, paddingTop: 20, borderTop: '1px solid #f0f0f0', textAlign: 'center' },
  footerLink: { fontSize: 12, color: '#aaa', textDecoration: 'none' },
};
