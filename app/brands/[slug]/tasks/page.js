// app/brands/[slug]/tasks/page.js

import { notFound } from 'next/navigation';
import { getBrand } from '../../../../lib/store';
import Nav from '../../../_components/Nav';
import TasksManager from './TasksManager';

export const dynamic = 'force-dynamic';

export default async function TasksPage({ params }) {
  const brand = await getBrand(params.slug);
  if (!brand) notFound();

  return (
    <>
      <Nav brand={brand} section="tasks" />
      <main style={styles.main}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={styles.h1}>Tasks</h1>
          <p style={styles.sub}>Things to do for {brand.name}.</p>
        </header>
        <TasksManager brandSlug={brand.slug} initialTasks={brand.tasks || []} />
      </main>
    </>
  );
}

const styles = {
  main: { maxWidth: 600, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111' },
  h1: { fontSize: 26, fontWeight: 700, margin: '0 0 6px', letterSpacing: -0.3 },
  sub: { color: '#666', margin: 0 },
};
