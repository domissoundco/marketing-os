// app/brands/[slug]/Overview.js

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Overview({ brandSlug, brand, plan, stats }) {
  const router = useRouter();
  const [products, setProducts] = useState(brand.products || []);

  function upsertProduct(p) {
    setProducts((cur) => {
      const i = cur.findIndex((x) => x.id === p.id);
      if (i === -1) return [...cur, p];
      const next = [...cur]; next[i] = p; return next;
    });
  }
  function removeProduct(id) {
    setProducts((cur) => cur.filter((p) => p.id !== id));
  }

  return (
    <div>
      {plan ? (
        <section style={styles.planCard}>
          <div style={styles.planLabel}>This quarter's goal</div>
          <div style={styles.planGoal}>{plan.goal || <em style={{ color: '#999' }}>Not set yet</em>}</div>
          {plan.revenueFocus && <div style={styles.planRevenue}>Revenue focus: {plan.revenueFocus}</div>}
          <Link href={`/brands/${brandSlug}/plan`} style={styles.planLink}>Open plan →</Link>
        </section>
      ) : (
        <section style={styles.emptyCard}>
          <span>No active 90-day plan.</span>
          <Link href={`/brands/${brandSlug}/plan`} style={styles.linkBtn}>Start one →</Link>
        </section>
      )}

      <section style={styles.section}>
        <h2 style={styles.h2}>Pipeline</h2>
        <div style={styles.pipeline}>
          {['draft', 'ready', 'scheduled', 'posted'].map((s) => (
            <Link key={s} href={`/brands/${brandSlug}/posts`} style={styles.pipelineCell}>
              <div style={styles.pipelineCount}>{stats.statusCounts[s] || 0}</div>
              <div style={styles.pipelineLabel}>{s}</div>
            </Link>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Last entered stats — totals across posted</h2>
        <div style={styles.kpis}>
          <Kpi label="Impressions" value={stats.totals.impressions} />
          <Kpi label="Clicks"      value={stats.totals.clicks} />
          <Kpi label="Leads"       value={stats.totals.leads} />
          <Kpi label="Revenue"     value={stats.totals.revenue} prefix="£" />
        </div>
        {stats.totals.postsWithStats === 0 && (
          <p style={styles.muted}>No stats entered yet. Add stats to posted posts to see numbers here.</p>
        )}
      </section>

      {(stats.best.length > 0 || stats.worst.length > 0) && (
        <section style={styles.section}>
          <div style={styles.bestWorstGrid}>
            {stats.best.length > 0 && (
              <div>
                <h2 style={styles.h2green}>Working</h2>
                {stats.best.map(({ post, stats: s }) => <PerfRow key={post.id} brandSlug={brandSlug} post={post} stats={s} good />)}
              </div>
            )}
            {stats.worst.length > 0 && (
              <div>
                <h2 style={styles.h2red}>Not working</h2>
                {stats.worst.map(({ post, stats: s }) => <PerfRow key={post.id} brandSlug={brandSlug} post={post} stats={s} />)}
              </div>
            )}
          </div>
        </section>
      )}

      <section style={styles.section}>
        <h2 style={styles.h2}>Product focus</h2>
        <p style={styles.hint}>What you're trying to sell. It's pointless being the best thing if nobody knows about it.</p>
        <ProductsManager
          brandSlug={brandSlug}
          products={products}
          onAdd={upsertProduct}
          onChange={upsertProduct}
          onDelete={removeProduct}
          stats={stats.perProduct}
        />
      </section>

      <DangerZone brandSlug={brandSlug} brandName={brand.name} onDeleted={() => router.push('/')} />
    </div>
  );
}

// ── Danger zone ───────────────────────────────────────────────────────

function DangerZone({ brandSlug, brandName, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function deleteBrand() {
    const typed = prompt(
      `This will permanently delete "${brandName}" and everything inside it — identity, plans, posts, images, stats, tasks, products. There's no undo.\n\nType the brand name to confirm:`
    );
    if (typed === null) return; // cancelled
    if (typed !== brandName) {
      setErr('Name did not match. Nothing deleted.');
      return;
    }
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      onDeleted();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <section style={styles.danger}>
      <h2 style={styles.dangerH2}>Danger zone</h2>
      <div style={styles.dangerRow}>
        <div>
          <div style={styles.dangerTitle}>Delete this brand</div>
          <div style={styles.dangerHint}>
            Removes the brand and every post, image, plan, task, and stats entry attached to it.
          </div>
        </div>
        <button onClick={deleteBrand} disabled={busy} style={styles.dangerBtn(busy)}>
          {busy ? 'Deleting…' : 'Delete brand'}
        </button>
      </div>
      {err && <div style={{ color: '#c00', fontSize: 13, marginTop: 8 }}>{err}</div>}
    </section>
  );
}

// ── KPI tile ──────────────────────────────────────────────────────────

function Kpi({ label, value, prefix }) {
  const n = Number(value || 0);
  const display = n >= 10000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
  return (
    <div style={styles.kpi}>
      <div style={styles.kpiValue}>{prefix || ''}{display}</div>
      <div style={styles.kpiLabel}>{label}</div>
    </div>
  );
}

function PerfRow({ brandSlug, post, stats: s, good }) {
  return (
    <Link href={`/brands/${brandSlug}/posts`} style={styles.perfRow(good)}>
      <div style={styles.perfNum}>{(s.impressions || 0).toLocaleString()}</div>
      <div style={styles.perfBody}>
        <div style={styles.perfLabel}>impressions</div>
        <div style={styles.perfText}>{truncate(post.draft || post.brief || '(empty)', 100)}</div>
      </div>
    </Link>
  );
}

// ── Products ──────────────────────────────────────────────────────────

function ProductsManager({ brandSlug, products, onAdd, onChange, onDelete, stats }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    if (!newName.trim()) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Add failed');
      onAdd(data.product);
      setNewName(''); setNewDesc(''); setAdding(false);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      {products.length === 0 ? (
        <p style={{ color: '#999', marginBottom: 12 }}>No products yet.</p>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {products.map((p) => {
            const aggr = stats.find((s) => s.product.id === p.id);
            return (
              <ProductRow
                key={p.id} brandSlug={brandSlug} product={p} stats={aggr}
                onChange={onChange} onDelete={onDelete}
              />
            );
          })}
        </div>
      )}

      {adding ? (
        <div style={styles.addProductBox}>
          <input type="text" placeholder="Product name" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={busy} style={styles.input} autoFocus />
          <textarea placeholder="What is it? (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} disabled={busy} rows={2} style={styles.textarea} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={busy || !newName.trim()} style={styles.primary(busy || !newName.trim())}>
              {busy ? 'Adding…' : 'Add product'}
            </button>
            <button onClick={() => { setAdding(false); setNewName(''); setNewDesc(''); setErr(''); }} disabled={busy} style={styles.secondary(busy)}>
              Cancel
            </button>
          </div>
          {err && <div style={styles.errInline}>{err}</div>}
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={styles.addBtn}>+ Add product</button>
      )}
    </div>
  );
}

function ProductRow({ brandSlug, product, stats, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(product.name);
  const [desc, setDesc] = useState(product.description || '');
  const [status, setStatus] = useState(product.status);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: desc.trim(), status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onChange(data.product);
      setEditing(false);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!confirm(`Delete product "${product.name}"? Posts tagged with it will be untagged.`)) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      onDelete(product.id);
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  if (editing) {
    return (
      <div style={styles.productCard}>
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={busy} style={styles.input} />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} disabled={busy} rows={2} style={styles.textarea} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={busy} style={styles.select}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="retired">Retired</option>
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={busy || !name.trim()} style={styles.primary(busy || !name.trim())}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} disabled={busy} style={styles.secondary(busy)}>Cancel</button>
          <button onClick={remove} disabled={busy} style={styles.dangerInline(busy)}>Delete</button>
        </div>
        {err && <div style={styles.errInline}>{err}</div>}
      </div>
    );
  }

  return (
    <div style={styles.productCard}>
      <div style={styles.productHeader}>
        <span style={styles.productStatus(product.status)}>{product.status}</span>
        <span style={styles.productName}>{product.name}</span>
        <button onClick={() => setEditing(true)} style={styles.editBtn}>edit</button>
      </div>
      {product.description && <div style={styles.productDesc}>{product.description}</div>}
      <div style={styles.productStats}>
        <span><strong>{stats?.postCount || 0}</strong> posts</span>
        <span><strong>{(stats?.impressions || 0).toLocaleString()}</strong> impressions</span>
        <span><strong>{stats?.clicks || 0}</strong> clicks</span>
        <span><strong>{stats?.leads || 0}</strong> leads</span>
        {stats?.revenue > 0 && <span><strong>£{stats.revenue.toLocaleString()}</strong> revenue</span>}
      </div>
    </div>
  );
}

function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }

const styles = {
  section: { marginBottom: 32 },
  h2: { fontSize: 13, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  h2green: { fontSize: 13, fontWeight: 600, color: '#0a7000', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  h2red: { fontSize: 13, fontWeight: 600, color: '#b00000', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  hint: { color: '#888', fontSize: 13, marginTop: -4, marginBottom: 14 },
  muted: { color: '#999', fontSize: 13 },

  planCard: { padding: 16, border: '1px solid #e8f3ff', background: '#f5fbff', borderRadius: 10, marginBottom: 24 },
  planLabel: { fontSize: 11, fontWeight: 600, color: '#0070f3', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  planGoal: { fontSize: 15, fontWeight: 500, color: '#111', marginBottom: 4 },
  planRevenue: { fontSize: 13, color: '#444', marginBottom: 8 },
  planLink: { fontSize: 12, color: '#0070f3', textDecoration: 'none' },
  emptyCard: { padding: 16, border: '1px dashed #ddd', borderRadius: 10, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888' },
  linkBtn: { fontSize: 13, color: '#0070f3', textDecoration: 'none' },

  pipeline: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 },
  pipelineCell: { padding: '14px 12px', border: '1px solid #eee', borderRadius: 10, background: '#fff', textDecoration: 'none', color: 'inherit', textAlign: 'center' },
  pipelineCount: { fontSize: 22, fontWeight: 700, color: '#111' },
  pipelineLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },

  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 },
  kpi: { padding: '14px 16px', border: '1px solid #eee', borderRadius: 10, background: '#fff' },
  kpiValue: { fontSize: 22, fontWeight: 700, color: '#111' },
  kpiLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },

  bestWorstGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 },
  perfRow: (good) => ({
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 6,
    border: '1px solid #eee', borderRadius: 8,
    background: good ? '#f6fff6' : '#fff8f8',
    textDecoration: 'none', color: 'inherit',
  }),
  perfNum: { fontSize: 16, fontWeight: 700, color: '#111', minWidth: 70 },
  perfBody: { flex: 1, minWidth: 0 },
  perfLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  perfText: { fontSize: 13, color: '#222', lineHeight: 1.4, marginTop: 2 },

  productCard: { padding: 14, border: '1px solid #eee', borderRadius: 10, marginBottom: 8, background: '#fff' },
  productHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 },
  productStatus: (s) => ({
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
    padding: '2px 6px', borderRadius: 4,
    background: s === 'active' ? '#e8ffe8' : s === 'paused' ? '#fff5e0' : '#f0f0f0',
    color: s === 'active' ? '#0a7000' : s === 'paused' ? '#a85a00' : '#888',
  }),
  productName: { flex: 1, fontSize: 14, fontWeight: 600 },
  editBtn: { background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' },
  productDesc: { fontSize: 13, color: '#666', marginBottom: 8 },
  productStats: { display: 'flex', gap: 16, fontSize: 12, color: '#666', flexWrap: 'wrap' },
  addProductBox: { padding: 14, border: '1px solid #ddd', borderRadius: 10, background: '#fafafa', marginTop: 8 },
  addBtn: { padding: '10px 14px', border: '1px dashed #ddd', borderRadius: 8, background: 'transparent', color: '#666', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },

  input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8 },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8, resize: 'vertical' },
  select: { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', marginBottom: 8 },
  primary: (disabled) => ({ padding: '8px 16px', background: disabled ? '#999' : '#000', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: disabled ? 'default' : 'pointer' }),
  secondary: (disabled) => ({ padding: '8px 14px', background: '#fff', color: disabled ? '#aaa' : '#000', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: disabled ? 'default' : 'pointer' }),
  dangerInline: (disabled) => ({ padding: '8px 14px', background: '#fff', color: disabled ? '#aaa' : '#c00', border: '1px solid #fcc', borderRadius: 6, fontSize: 13, cursor: disabled ? 'default' : 'pointer' }),
  errInline: { color: '#c00', fontSize: 12, marginTop: 6 },

  danger: { marginTop: 48, padding: 20, border: '1px solid #fcc', borderRadius: 12, background: '#fff8f8' },
  dangerH2: { fontSize: 13, fontWeight: 600, color: '#b00000', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 0, marginBottom: 12 },
  dangerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  dangerTitle: { fontSize: 14, fontWeight: 600, color: '#111' },
  dangerHint: { fontSize: 12, color: '#666', marginTop: 4 },
  dangerBtn: (disabled) => ({
    padding: '10px 18px', background: disabled ? '#999' : '#c00', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: disabled ? 'default' : 'pointer',
  }),
};
