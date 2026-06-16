// app/_components/TodayDashboard.js

'use client';

import { useState } from 'react';
import Link from 'next/link';

const DAILY_ITEMS = [
  { key: 'shipped', label: 'Shipped a post' },
  { key: 'waved',   label: 'Waved at people' },
  { key: 'plan',    label: 'Moved a 90-day goal forward' },
];

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateStr(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Current streak = consecutive days with >=1 item, ending today or yesterday.
function computeStreak(log) {
  const has = (d) => Array.isArray(log[d]) && log[d].length > 0;
  const today = new Date();
  let cursor = new Date(today);
  if (!has(dateStr(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!has(dateStr(cursor))) return 0; // neither today nor yesterday → streak broken
  }
  let streak = 0;
  while (has(dateStr(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function daysBetween(aIso, bIso) {
  const a = new Date(aIso); const b = new Date(bIso);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export default function TodayDashboard({ brands, posts, initialLog, focusBrands = [], followUps = [] }) {
  const [log, setLog] = useState(initialLog || {});
  const today = todayStr();
  const doneToday = log[today] || [];
  const streak = computeStreak(log);

  async function toggleItem(key) {
    const next = doneToday.includes(key) ? doneToday.filter((k) => k !== key) : [...doneToday, key];
    const optimistic = { ...log, [today]: next };
    if (next.length === 0) delete optimistic[today];
    setLog(optimistic);
    try {
      const res = await fetch('/api/activity', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, items: next }),
      });
      const data = await res.json();
      if (res.ok) setLog(data.log);
    } catch { /* keep optimistic state */ }
  }

  // Bucket scheduled/ready posts by local date.
  const now = new Date();
  const todayPosts = [];
  const overduePosts = [];
  let weekRunway = 0;
  for (const p of posts) {
    if (!p.publishAt) {
      if (p.status === 'ready') weekRunway += 1;
      continue;
    }
    const when = new Date(p.publishAt);
    const diff = daysBetween(dateStr(now), dateStr(when));
    if (p.status === 'posted') continue;
    if (diff === 0) todayPosts.push(p);
    else if (diff < 0) overduePosts.push(p);
    else if (diff <= 7) weekRunway += 1;
  }

  // Last 14 days of dots.
  const dots = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = dateStr(d);
    dots.push({ ds, done: Array.isArray(log[ds]) && log[ds].length > 0, isToday: ds === today });
  }

  return (
    <div style={s.wrap}>
      {/* Focus this quarter */}
      {focusBrands.length > 0 && (
        <section style={s.focusCard}>
          <div style={s.focusLabel}>Focus this quarter</div>
          {focusBrands.map((b) => (
            <Link key={b.slug} href={`/brands/${b.slug}`} style={s.focusBrand}>
              <span style={s.focusName}>{b.name}</span>
              {b.focusNote ? <span style={s.focusNote}>{b.focusNote}</span> : null}
            </Link>
          ))}
        </section>
      )}

      {/* Check-in + streak */}
      <section style={s.checkinCard}>
        <div style={s.checkinHead}>
          <div>
            <div style={s.streakNum}>{streak}<span style={s.streakUnit}>day{streak === 1 ? '' : 's'}</span></div>
            <div style={s.streakLabel}>
              {streak === 0 ? 'Start your streak today' :
               doneToday.length > 0 ? 'Showed up today ✓' : 'Keep it alive — check in today'}
            </div>
          </div>
          <div style={s.dots}>
            {dots.map((d) => (
              <div key={d.ds} title={d.ds}
                style={{ ...s.dot, background: d.done ? '#0a7000' : '#e8e8e8', outline: d.isToday ? '2px solid #0a7000' : 'none', outlineOffset: 1 }} />
            ))}
          </div>
        </div>
        <div style={s.items}>
          {DAILY_ITEMS.map((it) => {
            const on = doneToday.includes(it.key);
            return (
              <button key={it.key} onClick={() => toggleItem(it.key)} style={s.item(on)}>
                <span style={s.itemBox(on)}>{on ? '✓' : ''}</span>
                {it.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Follow-ups due */}
      {(() => {
        const due = followUps.filter((f) => f.nextActionDate && f.nextActionDate <= today);
        if (due.length === 0) return null;
        due.sort((a, b) => (a.nextActionDate || '').localeCompare(b.nextActionDate || ''));
        return (
          <section style={s.section}>
            <h2 style={s.h2}>Follow-ups due</h2>
            {due.map((f) => (
              <Link key={f.brandSlug + f.leadId} href={`/brands/${f.brandSlug}/leads`}
                style={{ ...s.postRow, borderColor: f.nextActionDate < today ? '#fcc' : '#eee', background: f.nextActionDate < today ? '#fff8f8' : '#fff' }}>
                <span style={s.postBrand}>{f.brandName}</span>
                <span style={s.postText}><strong>{f.leadName}</strong>{f.nextAction ? ` — ${f.nextAction}` : ''}</span>
                {f.nextActionDate < today && <span style={s.overdueTag}>overdue</span>}
                <span style={s.postTime}>{f.nextActionDate}</span>
              </Link>
            ))}
          </section>
        );
      })()}

      {/* Today's ship list */}
      <section style={s.section}>
        <h2 style={s.h2}>Today</h2>
        {todayPosts.length === 0 && overduePosts.length === 0 ? (
          <p style={s.muted}>Nothing scheduled for today. {weekRunway === 0 ? 'Your queue is empty — time to write a batch.' : ''}</p>
        ) : (
          <>
            {overduePosts.map((p) => <PostRow key={p.id} post={p} overdue />)}
            {todayPosts.map((p) => <PostRow key={p.id} post={p} />)}
          </>
        )}
      </section>

      {/* This week runway */}
      <section style={s.section}>
        <h2 style={s.h2}>This week's runway</h2>
        <div style={s.runwayRow}>
          <span style={s.runwayNum}>{weekRunway}</span>
          <span style={s.runwayText}>
            {weekRunway === 0 ? 'No posts queued. Sit down and batch a week.' :
             weekRunway < 3 ? 'Running low — worth topping up soon.' :
             'Queue looks healthy.'}
          </span>
        </div>
      </section>

      {/* 90-day pulse */}
      <section style={s.section}>
        <h2 style={s.h2}>90-day pulse</h2>
        {brands.filter((b) => b.plan).length === 0 ? (
          <p style={s.muted}>No active 90-day plans yet.</p>
        ) : (
          brands.filter((b) => b.plan).map((b) => {
            const elapsed = Math.max(0, daysBetween(b.plan.startedAt, new Date().toISOString()));
            const total = b.plan.reviewDate ? Math.max(1, daysBetween(b.plan.startedAt, b.plan.reviewDate)) : 90;
            const pct = Math.min(100, Math.round((elapsed / total) * 100));
            return (
              <Link key={b.slug} href={`/brands/${b.slug}/plan`} style={s.planRow}>
                <div style={s.planTop}>
                  <span style={s.planName}>{b.name}</span>
                  <span style={s.planDay}>Day {elapsed} of {total}</span>
                </div>
                <div style={s.bar}><div style={{ ...s.barFill, width: `${pct}%` }} /></div>
                {b.plan.goal && <div style={s.planGoal}>{b.plan.goal}</div>}
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}

function PostRow({ post, overdue }) {
  return (
    <Link href={`/brands/${post.brandSlug}/posts`} style={{ ...s.postRow, borderColor: overdue ? '#fcc' : '#eee', background: overdue ? '#fff8f8' : '#fff' }}>
      <span style={s.postBrand}>{post.brandName}</span>
      <span style={s.postText}>{post.snippet}</span>
      {overdue && <span style={s.overdueTag}>overdue</span>}
      <span style={s.postTime}>{post.publishAt ? new Date(post.publishAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
    </Link>
  );
}

const s = {
  wrap: { marginBottom: 40 },
  focusCard: { padding: '16px 20px', border: '1px solid #ffe0b0', background: 'linear-gradient(180deg,#fffaf2,#fff)', borderRadius: 14, marginBottom: 24 },
  focusLabel: { fontSize: 11, fontWeight: 700, color: '#a85a00', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  focusBrand: { display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0', textDecoration: 'none', color: 'inherit', borderTop: '1px solid #fbe6cc' },
  focusName: { fontSize: 17, fontWeight: 700, color: '#111' },
  focusNote: { fontSize: 13, color: '#7a5a2a' },
  checkinCard: { padding: 20, border: '1px solid #e8f3ff', background: 'linear-gradient(180deg,#f5fbff,#fff)', borderRadius: 14, marginBottom: 28 },
  checkinHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  streakNum: { fontSize: 40, fontWeight: 800, color: '#0a7000', lineHeight: 1, letterSpacing: -1 },
  streakUnit: { fontSize: 16, fontWeight: 600, color: '#0a7000', marginLeft: 6 },
  streakLabel: { fontSize: 13, color: '#555', marginTop: 4 },
  dots: { display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', maxWidth: 240 },
  dot: { width: 14, height: 14, borderRadius: 4 },
  items: { display: 'flex', flexDirection: 'column', gap: 8 },
  item: (on) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
    border: on ? '1px solid #0a7000' : '1px solid #ddd', background: on ? '#f3fff3' : '#fff',
    color: '#222', fontSize: 14, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%',
  }),
  itemBox: (on) => ({
    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
    border: on ? 'none' : '1.5px solid #ccc', background: on ? '#0a7000' : '#fff',
    color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
  }),

  section: { marginBottom: 28 },
  h2: { fontSize: 13, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  muted: { color: '#999', fontSize: 14 },

  postRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 6, border: '1px solid #eee', borderRadius: 10, textDecoration: 'none', color: 'inherit' },
  postBrand: { fontSize: 11, fontWeight: 700, color: '#0070f3', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 },
  postText: { flex: 1, fontSize: 14, color: '#222', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  overdueTag: { fontSize: 10, fontWeight: 600, color: '#b00000', background: '#ffe8e8', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' },
  postTime: { fontSize: 12, color: '#888', flexShrink: 0 },

  runwayRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: '1px solid #eee', borderRadius: 10 },
  runwayNum: { fontSize: 28, fontWeight: 800, color: '#111' },
  runwayText: { fontSize: 14, color: '#555' },

  planRow: { display: 'block', padding: '12px 14px', marginBottom: 8, border: '1px solid #eee', borderRadius: 10, textDecoration: 'none', color: 'inherit' },
  planTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  planName: { fontSize: 14, fontWeight: 600, color: '#111' },
  planDay: { fontSize: 12, color: '#888' },
  bar: { height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', background: '#0070f3' },
  planGoal: { fontSize: 12, color: '#666', marginTop: 8 },
};
