// app/brands/[slug]/posts/PostsManager.js

'use client';

import { useState } from 'react';

const PRINCIPLE_LABELS = {
  singleMessage: 'Single message',
  audienceFit:   'Audience fit',
  hook:          'Hook',
  specificity:   'Specificity',
  voiceMatch:    'Voice match',
  cta:           'Clear next step',
  lengthFit:     'Length',
};

export default function PostsManager({ brandSlug, initialPosts }) {
  const [posts, setPosts] = useState(
    [...initialPosts].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  );

  function upsertPost(post) {
    setPosts((cur) => {
      const idx = cur.findIndex((p) => p.id === post.id);
      if (idx === -1) return [post, ...cur];
      const next = [...cur];
      next[idx] = post;
      return next;
    });
  }

  function removePost(id) {
    setPosts((cur) => cur.filter((p) => p.id !== id));
  }

  return (
    <div>
      <NewPost brandSlug={brandSlug} onCreated={upsertPost} />
      {posts.length === 0 ? (
        <p style={{ color: '#999', marginTop: 24 }}>No posts yet.</p>
      ) : (
        <div style={{ marginTop: 28 }}>
          {posts.map((p) => (
            <PostCard
              key={p.id}
              brandSlug={brandSlug}
              post={p}
              onChange={upsertPost}
              onDelete={() => removePost(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── New post form ─────────────────────────────────────────────────────

function NewPost({ brandSlug, onCreated }) {
  const [brief, setBrief] = useState('');
  const [channel, setChannel] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function generate() {
    if (!brief.trim()) return;
    setBusy(true); setErr('');
    try {
      // 1) Create empty post
      const createRes = await fetch(`/api/brands/${brandSlug}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: brief.trim() }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || 'Create failed');
      const postId = createData.post.id;

      // 2) Generate draft for that post
      const genRes = await fetch(`/api/brands/${brandSlug}/posts/${postId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: brief.trim(), channel: channel.trim() }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || 'Generate failed');

      onCreated(genData.post);
      setBrief(''); setChannel('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={cardStyles.card}>
      <div style={cardStyles.label}>New post</div>
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="What's the post about? (e.g. announce our new product, drive sign-ups for the webinar...)"
        rows={3}
        disabled={busy}
        style={cardStyles.textarea}
      />
      <input
        type="text"
        value={channel}
        onChange={(e) => setChannel(e.target.value)}
        placeholder="Channel (optional — LinkedIn, Twitter, Instagram caption, email, …)"
        disabled={busy}
        style={cardStyles.input}
      />
      <div style={cardStyles.actions}>
        <button
          onClick={generate}
          disabled={busy || !brief.trim()}
          style={cardStyles.primary(busy || !brief.trim())}
        >
          {busy ? 'Generating…' : 'Generate post'}
        </button>
        {err && <span style={cardStyles.err}>{err}</span>}
      </div>
    </section>
  );
}

// ── Post card ─────────────────────────────────────────────────────────

function PostCard({ brandSlug, post, onChange, onDelete }) {
  const [draft, setDraft] = useState(post.draft || '');
  const [publishAt, setPublishAt] = useState(toLocalInput(post.publishAt));
  const [busyAction, setBusyAction] = useState('');
  const [err, setErr] = useState('');
  const critique = post.critique;

  async function save() {
    setBusyAction('save'); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft,
          publishAt: publishAt ? new Date(publishAt).toISOString() : null,
          status: publishAt ? 'scheduled' : 'draft',
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
      // make sure latest draft is saved first
      await fetch(`/api/brands/${brandSlug}/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      });
      const res = await fetch(`/api/brands/${brandSlug}/posts/${post.id}/critique`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Critique failed');
      onChange(data.post);
    } catch (e) { setErr(e.message); }
    finally { setBusyAction(''); }
  }

  async function remove() {
    if (!confirm('Delete this post?')) return;
    setBusyAction('delete'); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/posts/${post.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      onDelete();
    } catch (e) { setErr(e.message); setBusyAction(''); }
  }

  const busy = !!busyAction;

  return (
    <section style={cardStyles.card}>
      <div style={cardStyles.metaRow}>
        <span style={cardStyles.statusPill(post.status)}>{post.status}</span>
        <span style={cardStyles.metaText}>
          {post.brief ? truncate(post.brief, 80) : '(no brief)'}
        </span>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Draft appears here after generate, or write your own."
        rows={Math.min(12, Math.max(4, draft.split('\n').length + 1))}
        disabled={busy}
        style={cardStyles.textarea}
      />

      <div style={cardStyles.scheduleRow}>
        <label style={cardStyles.smallLabel}>Schedule for:</label>
        <input
          type="datetime-local"
          value={publishAt}
          onChange={(e) => setPublishAt(e.target.value)}
          disabled={busy}
          style={cardStyles.dateInput}
        />
        {publishAt && (
          <button onClick={() => setPublishAt('')} style={cardStyles.linkBtn} disabled={busy}>clear</button>
        )}
      </div>

      <div style={cardStyles.actions}>
        <button onClick={save} disabled={busy} style={cardStyles.primary(busy)}>
          {busyAction === 'save' ? 'Saving…' : 'Save'}
        </button>
        <button onClick={critiqueNow} disabled={busy || !draft.trim()} style={cardStyles.secondary(busy || !draft.trim())}>
          {busyAction === 'critique' ? 'Critiquing…' : critique ? 'Re-critique' : 'Critique'}
        </button>
        <button onClick={remove} disabled={busy} style={cardStyles.danger(busy)}>
          {busyAction === 'delete' ? 'Deleting…' : 'Delete'}
        </button>
        {err && <span style={cardStyles.err}>{err}</span>}
      </div>

      {critique && <CritiquePanel critique={critique} />}
    </section>
  );
}

// ── Critique panel ────────────────────────────────────────────────────

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
          <ul style={critStyles.list}>
            {critique.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {critique.fixes?.length > 0 && (
        <div style={critStyles.section}>
          <div style={critStyles.sectionLabel}>Fix</div>
          <ul style={critStyles.list}>
            {critique.fixes.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────

function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── styles ────────────────────────────────────────────────────────────

const cardStyles = {
  card: { border: '1px solid #eee', borderRadius: 12, padding: 20, marginBottom: 16, background: '#fff' },
  label: { fontSize: 12, color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  metaRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  metaText: { color: '#888', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusPill: (status) => ({
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
    padding: '3px 8px', borderRadius: 4,
    background: status === 'scheduled' ? '#e8f3ff' : status === 'published' ? '#e8ffe8' : '#f0f0f0',
    color: status === 'scheduled' ? '#0070f3' : status === 'published' ? '#0a7000' : '#666',
  }),
  textarea: {
    width: '100%', padding: '12px 14px', border: '1px solid #ddd', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', lineHeight: 1.55, resize: 'vertical',
    boxSizing: 'border-box', marginBottom: 10,
  },
  input: {
    width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12,
  },
  scheduleRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  smallLabel: { fontSize: 12, color: '#666' },
  dateInput: { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' },
  linkBtn: { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' },
  actions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  primary: (disabled) => ({
    padding: '10px 18px', background: disabled ? '#999' : '#000', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: disabled ? 'default' : 'pointer',
  }),
  secondary: (disabled) => ({
    padding: '10px 18px', background: '#fff', color: disabled ? '#aaa' : '#000',
    border: '1px solid #ddd', borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: disabled ? 'default' : 'pointer',
  }),
  danger: (disabled) => ({
    padding: '10px 14px', background: '#fff', color: disabled ? '#aaa' : '#c00',
    border: '1px solid #fcc', borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: disabled ? 'default' : 'pointer',
  }),
  err: { color: '#c00', fontSize: 12, marginLeft: 8 },
};

const critStyles = {
  panel: { marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #eee' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  overall: { fontSize: 22, fontWeight: 700, color: '#000' },
  verdict: { color: '#444', fontSize: 14, fontStyle: 'italic' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 16 },
  scoreRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#fff', borderRadius: 6, border: '1px solid #eee' },
  scoreKey: { fontSize: 12, color: '#666' },
  scoreVal: (s) => ({
    fontSize: 13, fontWeight: 700,
    color: s >= 4 ? '#0a7000' : s >= 3 ? '#b78a00' : '#c00',
  }),
  section: { marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  list: { margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: '#222' },
};
