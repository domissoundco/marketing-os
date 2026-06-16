// app/brands/[slug]/business-plan/BusinessPlanView.js

'use client';

import { useState } from 'react';

// Section grouping mirrors the British Business Bank / Start Up Loans template.
const SECTIONS = [
  {
    number: '1', title: 'Your business and objectives',
    fields: [
      { key: 'businessDescription', label: 'Describe your business and what you offer', rows: 5,
        hint: 'Products/services. What % you own. Already trading? Trading entity (sole trader / Ltd / partnership). Staff. Premises or home-based. Performance to date and key milestones (e.g. website built, purchase orders).' },
      { key: 'objectivesShort', label: 'Objectives — short term (current year)', rows: 3,
        hint: 'SMART: Specific, Measurable, Attainable, Realistic, Time-bound. e.g. "Launch transactional website by 01/11/25."' },
      { key: 'objectivesMedium', label: 'Objectives — medium term (1–2 years)', rows: 3,
        hint: 'e.g. "Increase revenue 5% each quarter." "Raise average sale value 10% by year end."' },
      { key: 'loanUse', label: 'How you will use your Start Up Loan', rows: 5,
        hint: 'Itemise like a shopping list: each item, its £ cost, and why it helps. e.g. "Equipment £3,000 — £2,000 large pressure washer, £1,000 small." Cover your full funding need over the first 12 months.' },
    ],
  },
  {
    number: '2', title: 'Your skills and experience',
    fields: [
      { key: 'experience', label: 'Relevant experience, employment or work', rows: 4,
        hint: 'Set up a similar business before? Worked in the sector? Personal traits suited to running it (salesman, organised, creative, analytical).' },
      { key: 'education', label: 'Relevant education or training', rows: 3,
        hint: 'Qualifications/training with when and how achieved. e.g. "Level 3 NVQ Diploma in Plumbing, Aug 2010." Note any training you still need.' },
    ],
  },
  {
    number: '3', title: 'Your target customers',
    fields: [
      { key: 'targetCustomers', label: 'Briefly describe your target customers', rows: 3,
        hint: 'Demographics and psychographics. Who specifically are you targeting?' },
      { key: 'customerNeed', label: 'What need or problem do you solve?', rows: 3,
        hint: 'The specific customer problem your product/service addresses.' },
      { key: 'pricing', label: 'Your approach to pricing', rows: 3,
        hint: 'How you price, and the thinking behind it.' },
    ],
  },
  {
    number: '4', title: 'Your market and competition',
    fields: [
      { key: 'marketResearch', label: 'Market research and insights', rows: 5,
        hint: 'What research you did (surveys, interviews, desk research, mystery shopping, test trading) and — more importantly — the insights drawn. Market size/opportunity and where you intend to trade. Evidence of demand (expressions of interest, waiting list, test sales).' },
      { key: 'competitors', label: 'Competitors', rows: 5,
        hint: 'For 2+ key competitors: name, location, website, average prices, strengths and weaknesses.' },
      { key: 'usp', label: 'What sets your business apart', rows: 3,
        hint: 'Your unique selling points versus those competitors.' },
      { key: 'swot', label: 'Your strengths, weaknesses, opportunities, threats', rows: 4,
        hint: 'A short SWOT for your own business.' },
    ],
  },
  {
    number: '5', title: 'Your sales and marketing plans',
    fields: [
      { key: 'promotion', label: 'How will you promote your business?', rows: 5,
        hint: 'At least three tactics, how each is carried out and measured (KPIs). Channels (website, social, SEM, ads, referrals, events, PR), content types, and any marketing budget. This is where your social posting plan lives.' },
    ],
  },
  {
    number: '6', title: 'Your operational plans',
    fields: [
      { key: 'suppliers', label: 'Two key suppliers / relationships', rows: 4,
        hint: 'For each: organisation, relationship status (none / under negotiation / project-based / contract or retainer), service provided, key terms.' },
      { key: 'staff', label: 'Staff — current and planned', rows: 3,
        hint: 'Do you employ staff now? Plans for the next 12 months? Full/part-time numbers and key roles, responsibilities and skills.' },
      { key: 'premises', label: 'Where does/will the business operate from?', rows: 2,
        hint: 'Home / office / retail / manufacturing / mobile / work-hub / other. If premises, ideally match lease term to loan term — or explain why not.' },
      { key: 'regulations', label: 'Laws or regulations considered', rows: 2,
        hint: 'Tax, legal and licensing relevant to your business/industry, and arrangements to comply.' },
      { key: 'insurance', label: 'Insurance in place or planned', rows: 2,
        hint: 'What cover you have or intend to put in place.' },
    ],
  },
  {
    number: '7', title: 'Back-up plan',
    fields: [
      { key: 'backupPlan', label: 'Managing repayments if things don’t go to plan', rows: 5,
        hint: 'What your loan repayments are, how you’d meet them in an unexpected event, and why that’s realistic. Consider long-term liabilities, your Personal Survival Budget, and returning to employment (job type/salary). Relying on a third party is not acceptable.' },
    ],
  },
];

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);

export default function BusinessPlanView({ brandSlug, initialActive, initialPast }) {
  const [active, setActive] = useState(initialActive);
  const [past, setPast] = useState(initialPast || []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function startOrRenew() {
    const renewing = !!active;
    if (renewing && !confirm('Renew the business plan? The current version is locked into history (read-only) and a fresh copy is created, carrying your text forward to edit.')) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/business-plan`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      if (active) setPast((cur) => [{ ...active, lockedAt: new Date().toISOString() }, ...cur]);
      setActive(data.plan);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function reopen(planId) {
    const target = past.find((p) => p.id === planId);
    if (!target) return;
    if (active && !confirm('Reopen this version? Your current working plan will be locked into history.')) return;
    if (!active && !confirm('Reopen this version as the working plan?')) return;
    setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/business-plan/${planId}/reopen`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reopen failed');
      const now = new Date().toISOString();
      setPast((cur) => {
        let next = cur.filter((p) => p.id !== planId);
        if (active) next = [{ ...active, lockedAt: now }, ...next];
        return next;
      });
      setActive(data.plan);
    } catch (e) { setErr(e.message); }
  }

  async function deletePast(planId) {
    if (!confirm('Delete this locked version permanently?')) return;
    setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/business-plan/${planId}`, { method: 'DELETE' });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Delete failed'); }
      setPast((cur) => cur.filter((p) => p.id !== planId));
    } catch (e) { setErr(e.message); }
  }

  return (
    <div>
      {err && <div style={styles.err}>{err}</div>}

      {active ? (
        <Editor brandSlug={brandSlug} plan={active} onChange={setActive} onRenew={startOrRenew} busy={busy} />
      ) : (
        <div style={styles.empty}>
          <p style={{ color: '#666', marginBottom: 16 }}>No business plan yet. Start one — it follows the Start Up Loan structure, so it doubles as your loan prep.</p>
          <button onClick={startOrRenew} disabled={busy} style={styles.primary(busy)}>
            {busy ? 'Starting…' : 'Start business plan'}
          </button>
        </div>
      )}

      {past.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <h2 style={styles.h2}>Locked versions</h2>
          {past.map((p) => (
            <PastVersion key={p.id} plan={p} onReopen={() => reopen(p.id)} onDelete={() => deletePast(p.id)} />
          ))}
        </section>
      )}
    </div>
  );
}

function Editor({ brandSlug, plan, onChange, onRenew, busy }) {
  const [draft, setDraft] = useState(plan);
  const [saveState, setSaveState] = useState('');
  const [err, setErr] = useState('');

  function set(key, value) { setDraft((cur) => ({ ...cur, [key]: value })); }

  async function save() {
    setSaveState('saving'); setErr('');
    try {
      const patch = {};
      for (const f of ALL_FIELDS) patch[f.key] = draft[f.key] || '';
      const res = await fetch(`/api/brands/${brandSlug}/business-plan/${plan.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onChange(data.plan); setDraft(data.plan); setSaveState('saved');
      setTimeout(() => setSaveState(''), 2000);
    } catch (e) { setErr(e.message); setSaveState(''); }
  }

  return (
    <div>
      {SECTIONS.map((section) => (
        <section key={section.number} style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <span style={styles.sectionNum}>{section.number}</span>{section.title}
          </h3>
          {section.fields.map((f) => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <label style={styles.label}>{f.label}</label>
              <div style={styles.hint}>{f.hint}</div>
              <textarea
                value={draft[f.key] || ''}
                onChange={(e) => set(f.key, e.target.value)}
                rows={f.rows || 3}
                style={styles.textarea}
              />
            </div>
          ))}
        </section>
      ))}

      <div style={styles.bottomBar}>
        <button onClick={save} disabled={saveState === 'saving'} style={styles.primary(saveState === 'saving')}>
          {saveState === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onRenew} disabled={busy} style={styles.secondary(busy)}>Renew (lock &amp; copy)</button>
        {saveState === 'saved' && <span style={{ color: '#0a7000', fontSize: 13 }}>Saved ✓</span>}
        {err && <span style={styles.errInline}>{err}</span>}
      </div>
    </div>
  );
}

function PastVersion({ plan, onReopen, onDelete }) {
  const [open, setOpen] = useState(false);
  const date = plan.lockedAt ? new Date(plan.lockedAt).toLocaleDateString() : '';
  const started = plan.startedAt ? new Date(plan.startedAt).toLocaleDateString() : '';
  return (
    <div style={styles.pastCard}>
      <button onClick={() => setOpen(!open)} style={styles.pastHeader}>
        <span style={styles.pastTitle}>{(plan.businessDescription || 'Business plan').slice(0, 60)}{(plan.businessDescription || '').length > 60 ? '…' : ''}</span>
        <span style={styles.lockTag}>locked</span>
        <span style={styles.pastDate}>{started} → {date}</span>
        <span style={{ color: '#888', fontSize: 13 }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div style={styles.pastBody}>
          {SECTIONS.map((section) => (
            <div key={section.number} style={{ marginBottom: 12 }}>
              <div style={styles.pastSectionTitle}>{section.number}. {section.title}</div>
              {section.fields.map((f) => (
                plan[f.key] ? (
                  <div key={f.key} style={{ marginBottom: 8 }}>
                    <div style={styles.fieldLabel}>{f.label}</div>
                    <div style={styles.fieldValue}>{plan[f.key]}</div>
                  </div>
                ) : null
              ))}
            </div>
          ))}
          <div style={styles.pastActions}>
            <button onClick={onReopen} style={styles.secondarySmall}>Reopen as working plan</button>
            <button onClick={onDelete} style={styles.dangerSmall}>Delete permanently</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  err: { background: '#fee', color: '#900', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 13 },
  errInline: { color: '#c00', fontSize: 12, marginLeft: 8 },
  empty: { padding: 32, border: '1px dashed #ddd', borderRadius: 12, textAlign: 'center' },

  section: { marginBottom: 32, paddingBottom: 8, borderBottom: '1px solid #f2f2f2' },
  sectionTitle: { fontSize: 17, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10 },
  sectionNum: { fontSize: 13, fontWeight: 700, color: '#0070f3', background: '#e8f3ff', padding: '3px 9px', borderRadius: 5 },

  label: { display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 3 },
  hint: { fontSize: 12, color: '#999', marginBottom: 8, lineHeight: 1.5 },
  textarea: {
    width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', lineHeight: 1.55, resize: 'vertical', boxSizing: 'border-box',
  },

  bottomBar: {
    position: 'sticky', bottom: 0, marginTop: 8, padding: '16px 0',
    borderTop: '1px solid #eee', background: '#fff',
    display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
  },
  primary: (d) => ({ padding: '10px 20px', background: d ? '#999' : '#000', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: d ? 'default' : 'pointer' }),
  secondary: (d) => ({ padding: '10px 20px', background: '#fff', color: d ? '#aaa' : '#000', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: d ? 'default' : 'pointer' }),

  h2: { fontSize: 14, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  pastCard: { border: '1px solid #eee', borderRadius: 8, marginBottom: 8, background: '#fff' },
  pastHeader: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
  pastTitle: { flex: 1, fontSize: 14, fontWeight: 500, color: '#111', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  lockTag: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, padding: '2px 8px', borderRadius: 4, background: '#f0f0f0', color: '#888' },
  pastDate: { fontSize: 12, color: '#999' },
  pastBody: { padding: '4px 14px 14px' },
  pastSectionTitle: { fontSize: 12, fontWeight: 700, color: '#0070f3', marginBottom: 6, marginTop: 8 },
  pastActions: { display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' },
  secondarySmall: { padding: '6px 12px', background: '#fff', color: '#000', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  dangerSmall: { padding: '6px 12px', background: '#fff', color: '#c00', border: '1px solid #fcc', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  fieldLabel: { fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 2 },
  fieldValue: { fontSize: 13, color: '#333', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
};
