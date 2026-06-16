// app/_components/Nav.js — Top nav.

import Link from 'next/link';

export default function Nav({ brand, section }) {
  return (
    <nav style={styles.nav}>
      <Link href="/" style={styles.brand}>MarketingOS</Link>
      <div style={styles.links}>
        <Link href="/" style={styles.link(section === 'home')}>Brands</Link>
        <Link href="/schedule" style={styles.link(section === 'schedule')}>Schedule</Link>
        {brand && (
          <>
            <span style={styles.divider}>·</span>
            <Link href={`/brands/${brand.slug}`} style={styles.brandLabel(section === 'overview')}>
              {brand.name}
            </Link>
            <Link href={`/brands/${brand.slug}/business-plan`} style={styles.link(section === 'business-plan')}>Business Plan</Link>
            <Link href={`/brands/${brand.slug}/identity`} style={styles.link(section === 'identity')}>Identity</Link>
            <Link href={`/brands/${brand.slug}/plan`} style={styles.link(section === 'plan')}>90-Day</Link>
            <Link href={`/brands/${brand.slug}/posts`} style={styles.link(section === 'posts')}>Posts</Link>
            <Link href={`/brands/${brand.slug}/tasks`} style={styles.link(section === 'tasks')}>Tasks</Link>
          </>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '14px 24px', borderBottom: '1px solid #eee',
    fontFamily: 'system-ui, -apple-system, sans-serif', flexWrap: 'wrap',
  },
  brand: { fontWeight: 700, color: '#000', textDecoration: 'none', fontSize: 14, letterSpacing: -0.2 },
  links: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  link: (active) => ({
    fontSize: 13, color: active ? '#000' : '#666',
    textDecoration: 'none', fontWeight: active ? 600 : 400,
  }),
  divider: { color: '#ccc' },
  brandLabel: (active) => ({
    fontSize: 13, color: active ? '#000' : '#444', fontWeight: active ? 700 : 600,
    textDecoration: 'none',
  }),
};
