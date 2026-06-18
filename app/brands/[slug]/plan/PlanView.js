// app/brands/[slug]/plan/PlanView.js

'use client';

import { useState } from 'react';

export default function PlanView({ brandSlug, initialActive, initialPast }) {
  const [active, setActive] = useState(initialActive);
  const [past, setPast] = useState(initialPast || []);
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState('');

  async function startNewPlan() {
    setStarting(true); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/plans`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      if (active) setPast((cur) => [{ ...active, closedAt: new Date().toISOString(), reviewDecision: active.reviewDecision || 'auto-closed' }, ...cur]);
      setActive(data.plan);
    } catch (e) { setErr(e.message); }
    finally { setStarting(false); }
  }

  function onClosed(closed) {
    setActive(null);
    setPast((cur) => [closed, ...cur]);
  }

  async function reopen(planId) {
    const target = past.find((p) => p.id === planId);
    if (!target) return;
    if (active && !confirm('Reopen this plan? Your currently active plan will be closed.')) return;
    if (!active && !confirm('Reopen this plan?')) return;
    setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/plans/${planId}/reopen`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reopen failed');

      // Update local state directly so the UI reflects the new state immediately.
      const reopenedPlan = data.plan;
      const now = new Date().toISOString();
      setPast((cur) => {
        let next = cur.filter((p) => p.id !== planId);
        if (active) {
          next = [
            { ...active, closedAt: now, reviewDecision: active.reviewDecision || 'auto-closed' },
            ...next,
          ];
        }
        return next;
      });
      setActive(reopenedPlan);
    } catch (e) { setErr(e.message); }
  }

  async function deletePastPlan(planId) {
    if (!confirm('Delete this plan permanently?')) return;
    setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/plans/${planId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      setPast((cur) => cur.filter((p) => p.id !== planId));
    } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      {err && <div style={styles.err}>{err}</div>}

      {active ? (
        <PlanEditor brandSlug={brandSlug} plan={active} onChange={setActive} onClosed={onClosed} onStartNew={startNewPlan} />
      ) : (
        <div style={styles.empty}>
          <p style={{ color: '#666', marginBottom: 16 }}>No active plan. Start a new 90-day plan to begin.</p>
          <button onClick={startNewPlan} disabled={starting} style={styles.primary(starting)}>
            {starting ? 'Starting…' : 'Start 90-day plan'}
          </button>
        </div>
      )}

      {past.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <h2 style={styles.h2}>Past plans</h2>
          {past.map((p) => (
            <PastPlan
              key={p.id}
              plan={p}
              onReopen={() => reopen(p.id)}
              onDelete={() => deletePastPlan(p.id)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

// ── Editor for active plan ────────────────────────────────────────────

function PlanEditor({ brandSlug, plan, onChange, onClosed, onStartNew }) {
  const [draft, setDraft] = useState(plan);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [showReview, setShowReview] = useState(false);

  function set(field, value) { setDraft((cur) => ({ ...cur, [field]: value })); }
  function setMarketing(field, value) {
    setDraft((cur) => ({ ...cur, marketing: { ...(cur.marketing || {}), [field]: value } }));
  }
  function setContingency(field, value) {
    setDraft((cur) => ({ ...cur, contingency: { ...(cur.contingency || {}), [field]: value } }));
  }

  async function save() {
    setBusy('save'); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onChange(data.plan);
      setDraft(data.plan);
    } catch (e) { setErr(e.message); }
    finally { setBusy(''); }
  }

  return (
    <div>
      <Section number="1" title="Vision (North Star)" hint="Where the brand is heading over the next 3–5 years.">
        <Textarea value={draft.vision} onChange={(v) => set('vision', v)} rows={2} />
      </Section>
      <Section number="2" title="Positioning" hint="Why customers choose this brand over alternatives.">
        <Textarea value={draft.positioning} onChange={(v) => set('positioning', v)} rows={3} />
      </Section>
      <Section number="3" title="Target Customer" hint="Who the brand is trying to reach.">
        <Textarea value={draft.targetCustomer} onChange={(v) => set('targetCustomer', v)} rows={2} />
      </Section>
      <Section number="4" title="Core Offer" hint="The product or service being sold.">
        <Textarea value={draft.coreOffer} onChange={(v) => set('coreOffer', v)} rows={2} />
      </Section>
      <Section number="5" title="90-Day Goal" hint="One measurable objective with a specific target and deadline.">
        <Textarea value={draft.goal} onChange={(v) => set('goal', v)} rows={2} />
      </Section>
      <Section number="6" title="Revenue Focus" hint="The main offer to promote this quarter.">
        <Textarea value={draft.revenueFocus} onChange={(v) => set('revenueFocus', v)} rows={2} />
      </Section>
      <Section number="7" title="Marketing Plan" hint="Channels, content, cadence, and the path from awareness to conversion.">
        <SubField label="Channels (ranked)" value={draft.marketing?.channels || ''} onChange={(v) => setMarketing('channels', v)} rows={2} />
        <SubField label="Content pillars" value={draft.marketing?.contentPillars || ''} onChange={(v) => setMarketing('contentPillars', v)} rows={2} />
        <SubField label="Posting cadence" value={draft.marketing?.postingCadence || ''} onChange={(v) => setMarketing('postingCadence', v)} rows={1} />
        <SubField label="Awareness" hint="Social, networking, SEO, advertising." value={draft.marketing?.awareness || ''} onChange={(v) => setMarketing('awareness', v)} rows={2} />
        <SubField label="Interest" hint="Website content, case studies, newsletters, demos." value={draft.marketing?.interest || ''} onChange={(v) => setMarketing('interest', v)} rows={2} />
        <SubField label="Conversion" hint="Contact forms, consultations, quotations, sales process." value={draft.marketing?.conversion || ''} onChange={(v) => setMarketing('conversion', v)} rows={2} />
      </Section>
      <Section number="8" title="Key Metrics" hint="Track 3–5 numbers.">
        <Textarea value={draft.keyMetrics} onChange={(v) => set('keyMetrics', v)} rows={3} />
      </Section>
      <Section number="9" title="Sprint dates" hint="When this 90-day sprint actually runs. Drives the Day N of 90 counter on your home screen.">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <label style={styles.subLabel}>Start date</label>
            <div><input type="date" value={draft.startDate || ''} onChange={(e) => set('startDate', e.target.value)} style={styles.dateInput} /></div>
          </div>
          <div>
            <label style={styles.subLabel}>End / review date</label>
            <div><input type="date" value={draft.reviewDate || ''} onChange={(e) => set('reviewDate', e.target.value)} style={styles.dateInput} /></div>
          </div>
        </div>
      </Section>
      <Section number="10" title="Contingency (If / Then)" hint="Pre-defined pivot if targets are not achieved.">
        <SubField label="If" value={draft.contingency?.if || ''} onChange={(v) => setContingency('if', v)} rows={2} />
        <SubField label="Then" value={draft.contingency?.then || ''} onChange={(v) => setContingency('then', v)} rows={2} />
      </Section>
      <Section number="11" title="This Quarter's Big Bet" hint="One major experiment or initiative to test.">
        <Textarea value={draft.bigBet} onChange={(v) => set('bigBet', v)} rows={3} />
      </Section>

      <div style={styles.bottomBar}>
        <button onClick={save} disabled={!!busy} style={styles.primary(!!busy)}>
          {busy === 'save' ? 'Saving…' : 'Save plan'}
        </button>
        <button onClick={() => setShowReview(true)} disabled={!!busy} style={styles.secondary(!!busy)}>
          Review & close
        </button>
        {err && <span style={styles.errInline}>{err}</span>}
      </div>

      {showReview && (
        <ReviewDialog
          brandSlug={brandSlug}
          planId={plan.id}
          onClose={() => setShowReview(false)}
          onClosed={(closed) => { setShowReview(false); onClosed(closed); }}
          onStartNew={onStartNew}
        />
      )}
    </div>
  );
}

function ReviewDialog({ brandSlug, planId, onClose, onClosed, onStartNew }) {
  const [decision, setDecision] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [startAfter, setStartAfter] = useState(true);

  async function submit() {
    if (!decision) { setErr('Pick a decision.'); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/plans/${planId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewDecision: decision, reviewNotes: notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Close failed');
      onClosed(data.plan);
      if (startAfter) onStartNew();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Review & close plan</h3>
        <p style={{ margin: '0 0 16px', color: '#666', fontSize: 13 }}>
          Pick a decision for this quarter's big bet and add any notes.
        </p>
        <div style={styles.decisionRow}>
          {['continue', 'improve', 'stop'].map((d) => (
            <button key={d} onClick={() => setDecision(d)} disabled={busy} style={styles.decisionBtn(decision === d)}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <Textarea value={notes} onChange={setNotes} placeholder="What went well, what didn't, what you learned…" rows={4} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, color: '#555' }}>
          <input type="checkbox" checked={startAfter} onChange={(e) => setStartAfter(e.target.checked)} />
          Start a new 90-day plan after closing
        </label>
        {err && <div style={{ color: '#c00', fontSize: 13, marginTop: 8 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={busy} style={styles.secondary(busy)}>Cancel</button>
          <button onClick={submit} disabled={busy || !decision} style={styles.primary(busy || !decision)}>
            {busy ? 'Closing…' : 'Close plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PastPlan({ plan, onReopen, onDelete }) {
  const [open, setOpen] = useState(false);
  const date = plan.closedAt ? new Date(plan.closedAt).toLocaleDateString() : '';
  return (
    <div style={styles.pastCard}>
      <button onClick={() => setOpen(!open)} style={styles.pastHeader}>
        <span style={styles.pastTitle}>{plan.goal ? truncate(plan.goal, 60) : 'Plan'}</span>
        <span style={styles.pastDecision(plan.reviewDecision)}>{plan.reviewDecision || '—'}</span>
        <span style={styles.pastDate}>{date}</span>
        <span style={{ color: '#888', fontSize: 13 }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div style={styles.pastBody}>
          {plan.goal && <Field label="90-Day Goal" value={plan.goal} />}
          {plan.bigBet && <Field label="Big Bet" value={plan.bigBet} />}
          {plan.reviewNotes && <Field label="Review notes" value={plan.reviewNotes} />}
          <div style={styles.pastActions}>
            <button onClick={onReopen} style={styles.secondarySmall}>Reopen</button>
            <button onClick={onDelete} style={styles.dangerSmall}>Delete permanently</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ number, title, hint, children }) {
  return (
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>
        <span style={styles.sectionNum}>{number}</span>{title}
      </h3>
      {hint && <p style={styles.sectionHint}>{hint}</p>}
      {children}
    </section>
  );
}

function SubField({ label, hint, value, onChange, rows }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={styles.subLabel}>{label}</label>
      {hint && <div style={styles.subHint}>{hint}</div>}
      <Textarea value={value} onChange={onChange} rows={rows} />
    </div>
  );
}

function Textarea({ value, onChange, rows = 2, placeholder }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows} placeholder={placeholder}
      style={styles.textarea}
    />
  );
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={styles.fieldValue}>{value}</div>
    </div>
  );
}

function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }

const styles = {
  err: { background: '#fee', color: '#900', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 13 },
  errInline: { color: '#c00', fontSize: 12, marginLeft: 8 },
  empty: { padding: 32, border: '1px dashed #ddd', borderRadius: 12, textAlign: 'center' },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'baseline', gap: 8 },
  sectionNum: { fontSize: 13, fontWeight: 700, color: '#0070f3', background: '#e8f3ff', padding: '2px 8px', borderRadius: 4 },
  sectionHint: { color: '#888', fontSize: 12, margin: '0 0 10px' },
  subLabel: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 2 },
  subHint: { fontSize: 11, color: '#999', marginBottom: 6 },
  textarea: {
    width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', lineHeight: 1.55, resize: 'vertical', boxSizing: 'border-box',
  },
  dateInput: { padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' },

  bottomBar: {
    position: 'sticky', bottom: 0, marginTop: 24, padding: '16px 0',
    borderTop: '1px solid #eee', background: '#fff',
    display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
  },
  primary: (disabled) => ({
    padding: '10px 20px', background: disabled ? '#999' : '#000', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: disabled ? 'default' : 'pointer',
  }),
  secondary: (disabled) => ({
    padding: '10px 20px', background: '#fff', color: disabled ? '#aaa' : '#000',
    border: '1px solid #ddd', borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: disabled ? 'default' : 'pointer',
  }),

  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50,
  },
  dialog: { width: '100%', maxWidth: 480, background: '#fff', borderRadius: 12, padding: 24 },
  decisionRow: { display: 'flex', gap: 8, marginBottom: 16 },
  decisionBtn: (selected) => ({
    flex: 1, padding: '10px 12px', borderRadius: 8, fontSize: 14, fontWeight: 500,
    border: selected ? '2px solid #000' : '1px solid #ddd',
    background: selected ? '#f5f5f5' : '#fff', color: '#000', cursor: 'pointer',
  }),

  h2: { fontSize: 14, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  pastCard: { border: '1px solid #eee', borderRadius: 8, marginBottom: 8, background: '#fff' },
  pastHeader: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
  },
  pastTitle: { flex: 1, fontSize: 14, fontWeight: 500, color: '#111', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pastDecision: (d) => ({
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
    padding: '2px 8px', borderRadius: 4,
    background: d === 'continue' ? '#e8ffe8' : d === 'improve' ? '#fff5e0' : d === 'stop' ? '#ffe8e8' : '#f0f0f0',
    color: d === 'continue' ? '#0a7000' : d === 'improve' ? '#a85a00' : d === 'stop' ? '#b00000' : '#666',
  }),
  pastDate: { fontSize: 12, color: '#999' },
  pastBody: { padding: '4px 14px 14px' },
  pastActions: { display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' },
  secondarySmall: {
    padding: '6px 12px', background: '#fff', color: '#000', border: '1px solid #ddd',
    borderRadius: 6, fontSize: 12, cursor: 'pointer',
  },
  dangerSmall: {
    padding: '6px 12px', background: '#fff', color: '#c00', border: '1px solid #fcc',
    borderRadius: 6, fontSize: 12, cursor: 'pointer',
  },
  fieldLabel: { fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  fieldValue: { fontSize: 13, color: '#333', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
};
