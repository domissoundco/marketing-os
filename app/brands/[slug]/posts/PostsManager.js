// app/brands/[slug]/posts/PostsManager.js

'use client';

import { useState, useRef } from 'react';

const PRINCIPLE_LABELS = {
  solvesProblem: 'Solves their problem',
  standsOut:     'Stands out',
  buildsTrust:   'Builds trust',
  audienceFit:   'Audience fit',
  authenticVoice:'Authentic voice',
  hook:          'Hook',
  nextStep:      'Path forward',
  bold:          'Bold enough',
  imageFit:      'Copy ↔ image fit',
};

const STATUSES = ['draft', 'ready', 'scheduled', 'posted'];

function mediaUrl(blobUrl) {
  return `/api/media?url=${encodeURIComponent(blobUrl)}`;
}

function latestOf(post) {
  if (!post.stats?.length) return null;
  return post.stats.reduce((latest, cur) =>
    (cur.recordedAt || '').localeCompare(latest.recordedAt || '') > 0 ? cur : latest, post.stats[0]);
}

function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostsManager({ brandSlug, initialPosts, products }) {
  const [posts, setPosts] = useState(
    [...initialPosts].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  );
  const [expandedId, setExpandedId] = useState(null);

  function upsertPost(post) {
    setPosts((cur) => {
      const idx = cur.findIndex((p) => p.id === post.id);
      if (idx === -1) return [post, ...cur];
      const next = [...cur]; next[idx] = post; return next;
    });
  }
  function removePost(id) {
    setPosts((cur) => cur.filter((p) => p.id !== id));
    setExpandedId((cur) => (cur === id ? null : cur));
  }

  return (
    <div>
      <Composer brandSlug={brandSlug} onSaved={upsertPost} />

      <div style={{ marginTop: 32 }}>
        <h2 style={listStyles.heading}>Saved posts {posts.length > 0 && <span style={listStyles.count}>({posts.length})</span>}</h2>
        {posts.length === 0 ? (
          <p style={{ color: '#999' }}>Nothing saved yet. Generate one above.</p>
        ) : (
          posts.map((p) =>
            expandedId === p.id ? (
              <PostCard
                key={p.id}
                brandSlug={brandSlug}
                post={p}
                products={products}
                onChange={upsertPost}
                onDelete={() => removePost(p.id)}
                onCollapse={() => setExpandedId(null)}
              />
            ) : (
              <SavedRow key={p.id} post={p} onClick={() => setExpandedId(p.id)} />
            )
          )
        )}
      </div>
    </div>
  );
}

// ── Composer ──────────────────────────────────────────────────────────

function Composer({ brandSlug, onSaved }) {
  const [mode, setMode] = useState('blank'); // 'blank' | 'review'
  const [post, setPost] = useState(null);
  const [brief, setBrief] = useState('');
  const [channel, setChannel] = useState('');
  const [draft, setDraft] = useState('');
  const [stagedFiles, setStagedFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  function onFiles(e) {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => f.size <= 4 * 1024 * 1024);
    if (valid.length < files.length) setErr('Some files exceeded 4 MB and were skipped.');
    setStagedFiles((cur) => [...cur, ...valid]);
    e.target.value = '';
  }
  function removeStaged(idx) {
    setStagedFiles((cur) => cur.filter((_, i) => i !== idx));
  }

  async function generate() {
    if (!brief.trim()) return;
    setBusy(true); setErr('');
    try {
      const createRes = await fetch(`/api/brands/${brandSlug}/posts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: brief.trim() }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || 'Create failed');
      const postId = createData.post.id;

      for (const file of stagedFiles) {
        const fd = new FormData(); fd.append('file', file);
        const upRes = await fetch(`/api/brands/${brandSlug}/posts/${postId}/images`, { method: 'POST', body: fd });
        if (!upRes.ok) {
          const upData = await upRes.json().catch(() => ({}));
          throw new Error(upData.error || `Image upload failed for ${file.name}`);
        }
      }

      const genRes = await fetch(`/api/brands/${brandSlug}/posts/${postId}/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: brief.trim(), channel: channel.trim() }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || 'Generate failed');

      setPost(genData.post);
      setDraft(genData.post.draft || '');
      setMode('review');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function saveAndNew() {
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/posts/${post.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, status: 'ready' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved(data.post);
      reset();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function regenerate() {
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/posts/${post.id}/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: brief.trim(), channel: channel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Regenerate failed');
      setPost(data.post);
      setDraft(data.post.draft || '');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function discard() {
    if (!confirm('Discard this draft?')) return;
    setBusy(true); setErr('');
    try {
      await fetch(`/api/brands/${brandSlug}/posts/${post.id}`, { method: 'DELETE' });
      reset();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  function reset() {
    setMode('blank'); setPost(null); setBrief(''); setChannel(''); setDraft(''); setStagedFiles([]);
  }

  if (mode === 'review' && post) {
    const images = post.images || [];
    return (
      <section style={cardStyles.composer}>
        <div style={cardStyles.composerLabel}>Review draft</div>
        {images.length > 0 && (
          <div style={cardStyles.thumbStrip}>
            {images.map((img) => (
              <div key={img.id} style={cardStyles.thumb}>
                <img src={mediaUrl(img.url)} alt={img.alt || ''} style={cardStyles.thumbImg} />
              </div>
            ))}
          </div>
        )}
        <textarea
          value={draft} onChange={(e) => setDraft(e.target.value)}
          rows={Math.min(14, Math.max(5, (draft || '').split('\n').length + 1))}
          disabled={busy} style={cardStyles.textarea}
        />
        <div style={cardStyles.actions}>
          <button onClick={saveAndNew} disabled={busy} style={cardStyles.primary(busy)}>
            {busy ? 'Saving…' : 'Save & write next'}
          </button>
          <button onClick={regenerate} disabled={busy} style={cardStyles.secondary(busy)}>
            {busy ? '…' : 'Regenerate'}
          </button>
          <button onClick={discard} disabled={busy} style={cardStyles.danger(busy)}>Discard</button>
          {err && <span style={cardStyles.err}>{err}</span>}
        </div>
      </section>
    );
  }

  return (
    <section style={cardStyles.composer}>
      <div style={cardStyles.composerLabel}>Write a post</div>
      <textarea
        value={brief} onChange={(e) => setBrief(e.target.value)}
        placeholder="What's the post about? Lead with the reader's problem."
        rows={3} disabled={busy} style={cardStyles.textarea}
      />
      <input
        type="text" value={channel} onChange={(e) => setChannel(e.target.value)}
        placeholder="Channel (optional — LinkedIn, Instagram, email, …)"
        disabled={busy} style={cardStyles.input}
      />
      {stagedFiles.length > 0 && (
        <div style={cardStyles.thumbStrip}>
          {stagedFiles.map((f, i) => <StagedThumb key={i} file={f} onRemove={() => removeStaged(i)} disabled={busy} />)}
        </div>
      )}
      <div style={cardStyles.actions}>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} style={cardStyles.secondary(busy)}>+ Photo</button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} style={{ display: 'none' }} />
        <button onClick={generate} disabled={busy || !brief.trim()} style={cardStyles.primary(busy || !brief.trim())}>
          {busy ? 'Generating…' : 'Generate'}
        </button>
        {err && <span style={cardStyles.err}>{err}</span>}
      </div>
    </section>
  );
}

function StagedThumb({ file, onRemove, disabled }) {
  const [url, setUrl] = useState('');
  if (!url) {
    const reader = new FileReader();
    reader.onload = () => setUrl(reader.result);
    reader.readAsDataURL(file);
  }
  return (
    <div style={cardStyles.thumb}>
      {url && <img src={url} alt={file.name} style={cardStyles.thumbImg} />}
      <button onClick={onRemove} disabled={disabled} style={cardStyles.thumbRemove}>×</button>
    </div>
  );
}

// ── Saved row (collapsed) ─────────────────────────────────────────────

function SavedRow({ post, onClick }) {
  const cover = post.images?.[0];
  const latest = latestOf(post);
  return (
    <button onClick={onClick} style={listStyles.row}>
      <span style={listStyles.status(post.status)}>{post.status}</span>
      {cover && <img src={mediaUrl(cover.url)} alt="" style={listStyles.rowThumb} />}
      <span style={listStyles.rowText}>
        {truncate(post.draft || post.brief || '(empty)', 90)}
      </span>
      {latest?.impressions != null && (
        <span style={listStyles.rowMetric}>{latest.impressions.toLocaleString()} imp</span>
      )}
      <span style={listStyles.chevron}>›</span>
    </button>
  );
}

// ── Post card (expanded editor) ───────────────────────────────────────

function PostCard({ brandSlug, post, products, onChange, onDelete, onCollapse }) {
  const [draft, setDraft] = useState(post.draft || '');
  const [publishAt, setPublishAt] = useState(toLocalInput(post.publishAt));
  const [status, setStatus] = useState(post.status || 'draft');
  const [productIds, setProductIds] = useState(post.productIds || []);
  const [busyAction, setBusyAction] = useState('');
  const [err, setErr] = useState('');
  const [showStatsForm, setShowStatsForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const fileRef = useRef(null);
  const critique = post.critique;
  const latest = latestOf(post);

  async function save() {
    setBusyAction('save'); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/posts/${post.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft,
          publishAt: publishAt ? new Date(publishAt).toISOString() : null,
          status, productIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onChange(data.post);
    } catch (e) { setErr(e.message); }
    finally { setBusyAction(''); }
  }

  async function critiqueNow() {
    if (!draft.trim()) { setErr('Save the draft first.'); return; }
    setBusyAction('critique'); setErr('');
    try {
      await fetch(`/api/brands/${brandSlug}/posts/${post.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draft }),
      });
      const res = await fetch(`/api/brands/${brandSlug}/posts/${post.id}/critique`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Critique failed');
      onChange(data.post);
    } catch (e) { setErr(e.message); }
    finally { setBusyAction(''); }
  }

  async function remove() {
    if (!confirm('Delete this post (and its images)?')) return;
    setBusyAction('delete'); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/posts/${post.id}`, { method: 'DELETE' });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Delete failed'); }
      onDelete();
    } catch (e) { setErr(e.message); setBusyAction(''); }
  }

  async function uploadImage(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setErr('File too large — max 4 MB'); return; }
    setBusyAction('upload'); setErr('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch(`/api/brands/${brandSlug}/posts/${post.id}/images`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange(data.post);
    } catch (e) { setErr(e.message); }
    finally { setBusyAction(''); }
  }

  async function deleteImage(imageId) {
    setBusyAction('img-delete'); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/posts/${post.id}/images/${imageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      onChange(data.post);
    } catch (e) { setErr(e.message); }
    finally { setBusyAction(''); }
  }

  function toggleProduct(id) {
    setProductIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  const busy = !!busyAction;
  const images = post.images || [];

  return (
    <section style={cardStyles.card}>
      <div style={cardStyles.cardHead}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={busy} style={cardStyles.statusSelect(status)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={cardStyles.metaText}>{post.brief ? truncate(post.brief, 70) : '(no brief)'}</span>
        <button onClick={onCollapse} style={cardStyles.collapseBtn}>collapse ▴</button>
      </div>

      {products.length > 0 && (
        <div style={cardStyles.productsRow}>
          {products.map((prod) => (
            <button key={prod.id} onClick={() => toggleProduct(prod.id)} disabled={busy} style={cardStyles.productChip(productIds.includes(prod.id))}>
              {productIds.includes(prod.id) ? '✓ ' : ''}{prod.name}
            </button>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div style={cardStyles.thumbStrip}>
          {images.map((img) => (
            <div key={img.id} style={cardStyles.thumb}>
              <img src={mediaUrl(img.url)} alt={img.alt || ''} style={cardStyles.thumbImg} />
              <button onClick={() => deleteImage(img.id)} disabled={busy} style={cardStyles.thumbRemove}>×</button>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={draft} onChange={(e) => setDraft(e.target.value)}
        rows={Math.min(12, Math.max(4, (draft || '').split('\n').length + 1))}
        disabled={busy} style={cardStyles.textarea}
      />

      <div style={cardStyles.scheduleRow}>
        <label style={cardStyles.smallLabel}>Publish at:</label>
        <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} disabled={busy} style={cardStyles.dateInput} />
        {publishAt && <button onClick={() => setPublishAt('')} style={cardStyles.linkBtn} disabled={busy}>clear</button>}
      </div>

      <div style={cardStyles.actions}>
        <button onClick={save} disabled={busy} style={cardStyles.primary(busy)}>{busyAction === 'save' ? 'Saving…' : 'Save'}</button>
        <button onClick={critiqueNow} disabled={busy || !draft.trim()} style={cardStyles.secondary(busy || !draft.trim())}>
          {busyAction === 'critique' ? 'Critiquing…' : critique ? 'Re-critique' : 'Critique'}
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={busy} style={cardStyles.secondary(busy)}>
          {busyAction === 'upload' ? 'Uploading…' : '+ Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={uploadImage} style={{ display: 'none' }} />
        <button onClick={remove} disabled={busy} style={cardStyles.danger(busy)}>{busyAction === 'delete' ? 'Deleting…' : 'Delete'}</button>
        {err && <span style={cardStyles.err}>{err}</span>}
      </div>

      <div style={statStyles.statsBlock}>
        <div style={statStyles.statsHeader}>
          <span style={statStyles.statsTitle}>Stats</span>
          {latest && <span style={statStyles.statsAsOf}>as of {new Date(latest.recordedAt).toLocaleString()}</span>}
          <button onClick={() => setShowStatsForm(!showStatsForm)} style={statStyles.linkBtn}>
            {showStatsForm ? 'cancel' : latest ? '+ update' : '+ add stats'}
          </button>
          {post.stats?.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)} style={statStyles.linkBtn}>
              {showHistory ? 'hide history' : `history (${post.stats.length})`}
            </button>
          )}
        </div>
        {latest && (
          <div style={statStyles.latestRow}>
            <Stat label="Impressions" v={latest.impressions} />
            <Stat label="Likes" v={latest.likes} />
            <Stat label="Comments" v={latest.comments} />
            <Stat label="Shares" v={latest.shares} />
            <Stat label="Clicks" v={latest.clicks} />
            <Stat label="Leads" v={latest.leads} />
            <Stat label="Revenue" v={latest.revenue} prefix="£" />
          </div>
        )}
        {showStatsForm && (
          <StatsForm brandSlug={brandSlug} postId={post.id}
            onAdded={(updatedPost) => { onChange(updatedPost); setShowStatsForm(false); }}
            onCancel={() => setShowStatsForm(false)} />
        )}
        {showHistory && post.stats?.length > 0 && (
          <StatsHistory brandSlug={brandSlug} post={post} onChange={onChange} />
        )}
      </div>

      {critique && <CritiquePanel critique={critique} />}
    </section>
  );
}

function Stat({ label, v, prefix }) {
  return (
    <div style={statStyles.stat}>
      <div style={statStyles.statValue}>{v == null ? '—' : `${prefix || ''}${Number(v).toLocaleString()}`}</div>
      <div style={statStyles.statLabel}>{label}</div>
    </div>
  );
}

function StatsForm({ brandSlug, postId, onAdded, onCancel }) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const localNow = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const [recordedAt, setRecordedAt] = useState(localNow);
  const [vals, setVals] = useState({ impressions: '', likes: '', comments: '', shares: '', clicks: '', leads: '', revenue: '' });
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  function set(k, v) { setVals((c) => ({ ...c, [k]: v })); }

  async function save() {
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/posts/${postId}/stats`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordedAt: new Date(recordedAt).toISOString(), ...vals, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      const refresh = await fetch(`/api/brands/${brandSlug}/posts`);
      const refreshData = await refresh.json();
      const updated = (refreshData.posts || []).find((p) => p.id === postId);
      if (updated) onAdded(updated); else window.location.reload();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div style={statStyles.form}>
      <div style={statStyles.formRow}>
        <label style={statStyles.fLabel}>As of</label>
        <input type="datetime-local" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} disabled={busy} style={statStyles.fInput} />
      </div>
      <div style={statStyles.grid}>
        {[['impressions','Impressions'],['likes','Likes'],['comments','Comments'],['shares','Shares'],['clicks','Clicks'],['leads','Leads'],['revenue','Revenue (£)']].map(([k, label]) => (
          <div key={k} style={statStyles.fCell}>
            <label style={statStyles.fLabel}>{label}</label>
            <input type="number" min="0" step={k === 'revenue' ? '0.01' : '1'} value={vals[k]} onChange={(e) => set(k, e.target.value)} disabled={busy} style={statStyles.fInput} />
          </div>
        ))}
      </div>
      <div style={statStyles.formRow}>
        <label style={statStyles.fLabel}>Notes (optional)</label>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={busy} style={statStyles.fInput} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={save} disabled={busy} style={statStyles.saveBtn(busy)}>{busy ? 'Saving…' : 'Save stats'}</button>
        <button onClick={onCancel} disabled={busy} style={statStyles.cancelBtn(busy)}>Cancel</button>
      </div>
      {err && <div style={{ color: '#c00', fontSize: 12, marginTop: 6 }}>{err}</div>}
    </div>
  );
}

function StatsHistory({ brandSlug, post, onChange }) {
  const [busy, setBusy] = useState('');
  async function removeEntry(statsId) {
    if (!confirm('Delete this stats entry?')) return;
    setBusy(statsId);
    try {
      const res = await fetch(`/api/brands/${brandSlug}/posts/${post.id}/stats/${statsId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      onChange({ ...post, stats: post.stats.filter((s) => s.id !== statsId) });
    } catch (e) { alert(e.message); } finally { setBusy(''); }
  }
  const sorted = [...post.stats].sort((a, b) => (b.recordedAt || '').localeCompare(a.recordedAt || ''));
  return (
    <div style={statStyles.history}>
      {sorted.map((s) => (
        <div key={s.id} style={statStyles.historyRow}>
          <div style={statStyles.historyTime}>{new Date(s.recordedAt).toLocaleString()}</div>
          <div style={statStyles.historyVals}>
            {s.impressions != null && <span>{s.impressions.toLocaleString()} imp</span>}
            {s.clicks != null && <span>{s.clicks} clk</span>}
            {s.leads != null && <span>{s.leads} lead</span>}
            {s.revenue != null && <span>£{s.revenue}</span>}
          </div>
          {s.notes && <div style={statStyles.historyNotes}>{s.notes}</div>}
          <button onClick={() => removeEntry(s.id)} disabled={busy === s.id} style={statStyles.historyDel}>delete</button>
        </div>
      ))}
    </div>
  );
}

function CritiquePanel({ critique }) {
  return (
    <div style={critStyles.panel}>
      <div style={critStyles.header}>
        <span style={critStyles.overall}>{critique.overall}/5</span>
        <span style={critStyles.verdict}>{critique.verdict}</span>
      </div>
      <div style={critStyles.grid}>
        {Object.entries(critique.scores || {}).map(([key, score]) => (
          <div key={key} style={critStyles.scoreRow}>
            <span style={critStyles.scoreKey}>{PRINCIPLE_LABELS[key] || key}</span>
            <span style={critStyles.scoreVal(score)}>{score}</span>
          </div>
        ))}
      </div>
      {critique.strengths?.length > 0 && (
        <div style={critStyles.section}>
          <div style={critStyles.sectionLabel}>Working</div>
          <ul style={critStyles.list}>{critique.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {critique.fixes?.length > 0 && (
        <div style={critStyles.section}>
          <div style={critStyles.sectionLabel}>Make it outstanding</div>
          <ul style={critStyles.list}>{critique.fixes.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────

const listStyles = {
  heading: { fontSize: 13, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  count: { color: '#bbb', fontWeight: 400 },
  row: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', marginBottom: 6, border: '1px solid #eee', borderRadius: 10,
    background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
  },
  status: (status) => ({
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
    padding: '3px 8px', borderRadius: 4, flexShrink: 0,
    background: status === 'scheduled' ? '#e8f3ff' : status === 'posted' ? '#e8ffe8' : status === 'ready' ? '#fff5e0' : '#f0f0f0',
    color: status === 'scheduled' ? '#0070f3' : status === 'posted' ? '#0a7000' : status === 'ready' ? '#a85a00' : '#666',
  }),
  rowThumb: { width: 32, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 },
  rowText: { flex: 1, fontSize: 14, color: '#222', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowMetric: { fontSize: 12, color: '#888', flexShrink: 0 },
  chevron: { color: '#ccc', fontSize: 18, flexShrink: 0 },
};

const cardStyles = {
  composer: { border: '1px solid #ddd', borderRadius: 12, padding: 20, background: '#fcfcfc' },
  composerLabel: { fontSize: 12, color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  card: { border: '1px solid #0070f3', borderRadius: 12, padding: 20, marginBottom: 16, background: '#fff', boxShadow: '0 2px 8px rgba(0,112,243,0.08)' },
  cardHead: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  metaText: { color: '#888', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  collapseBtn: { background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer', flexShrink: 0 },
  statusSelect: (status) => ({
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
    padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
    background: status === 'scheduled' ? '#e8f3ff' : status === 'posted' ? '#e8ffe8' : status === 'ready' ? '#fff5e0' : '#f0f0f0',
    color: status === 'scheduled' ? '#0070f3' : status === 'posted' ? '#0a7000' : status === 'ready' ? '#a85a00' : '#666',
  }),
  productsRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  productChip: (selected) => ({
    fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 14,
    border: selected ? '1px solid #000' : '1px solid #ddd',
    background: selected ? '#000' : '#fff', color: selected ? '#fff' : '#666',
    cursor: 'pointer', fontFamily: 'inherit',
  }),
  textarea: {
    width: '100%', padding: '12px 14px', border: '1px solid #ddd', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', lineHeight: 1.55, resize: 'vertical', boxSizing: 'border-box', marginBottom: 10,
  },
  input: {
    width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12,
  },
  thumbStrip: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  thumb: { position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', background: '#f5f5f5', border: '1px solid #eee' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  thumbRemove: { position: 'absolute', top: 2, right: 2, width: 22, height: 22, lineHeight: '20px', textAlign: 'center', border: 'none', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 14, cursor: 'pointer', padding: 0 },
  scheduleRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  smallLabel: { fontSize: 12, color: '#666' },
  dateInput: { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' },
  linkBtn: { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' },
  actions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  primary: (d) => ({ padding: '10px 18px', background: d ? '#999' : '#000', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: d ? 'default' : 'pointer' }),
  secondary: (d) => ({ padding: '10px 18px', background: '#fff', color: d ? '#aaa' : '#000', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: d ? 'default' : 'pointer' }),
  danger: (d) => ({ padding: '10px 14px', background: '#fff', color: d ? '#aaa' : '#c00', border: '1px solid #fcc', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: d ? 'default' : 'pointer' }),
  err: { color: '#c00', fontSize: 12, marginLeft: 8 },
};

const statStyles = {
  statsBlock: { marginTop: 16, padding: 14, background: '#fafafa', borderRadius: 8, border: '1px solid #eee' },
  statsHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' },
  statsTitle: { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },
  statsAsOf: { fontSize: 11, color: '#888', flex: 1 },
  linkBtn: { background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' },
  latestRow: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 4 },
  stat: { minWidth: 70 },
  statValue: { fontSize: 14, fontWeight: 700, color: '#111' },
  statLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  form: { marginTop: 10, padding: 12, background: '#fff', borderRadius: 6, border: '1px solid #ddd' },
  formRow: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 },
  fLabel: { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },
  fInput: { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' },
  fCell: { display: 'flex', flexDirection: 'column', gap: 4 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 8 },
  saveBtn: (b) => ({ padding: '8px 14px', background: b ? '#999' : '#000', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: b ? 'default' : 'pointer' }),
  cancelBtn: (b) => ({ padding: '8px 14px', background: '#fff', color: '#000', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: b ? 'default' : 'pointer' }),
  history: { marginTop: 10, padding: 10, background: '#fff', borderRadius: 6, border: '1px solid #eee' },
  historyRow: { display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: 10, padding: '6px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center', fontSize: 12 },
  historyTime: { color: '#444' },
  historyVals: { display: 'flex', gap: 12, color: '#666' },
  historyNotes: { gridColumn: '2 / 3', color: '#888', fontStyle: 'italic', fontSize: 11 },
  historyDel: { background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' },
};

const critStyles = {
  panel: { marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #eee' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  overall: { fontSize: 22, fontWeight: 700, color: '#000' },
  verdict: { color: '#444', fontSize: 14, fontStyle: 'italic' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 16 },
  scoreRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#fff', borderRadius: 6, border: '1px solid #eee' },
  scoreKey: { fontSize: 12, color: '#666' },
  scoreVal: (s) => ({ fontSize: 13, fontWeight: 700, color: s >= 4 ? '#0a7000' : s >= 3 ? '#b78a00' : '#c00' }),
  section: { marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  list: { margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: '#222' },
};
