// app/brands/[slug]/posts/page.js

import { notFound } from 'next/navigation';
import { getBrand } from '../../../../lib/store';
import Nav from '../../../_components/Nav';
import PostsManager from './PostsManager';

export const dynamic = 'force-dynamic';

export default async function PostsPage({ params }) {
  const brand = await getBrand(params.slug);
  if (!brand) notFound();

  return (
    <>
      <Nav brand={brand} section="posts" />
      <main style={styles.main}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={styles.h1}>Posts</h1>
          <p style={styles.sub}>Batch your week — draft, ready, schedule, posted.</p>
        </header>
        <PostsManager
          brandSlug={brand.slug}
          initialPosts={brand.posts || []}
          products={brand.products || []}
        />
      </main>
    </>
  );
}

const styles = {
  main: { maxWidth: 760, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111' },
  h1: { fontSize: 26, fontWeight: 700, margin: '0 0 6px', letterSpacing: -0.3 },
  sub: { color: '#666', margin: 0 },
};
