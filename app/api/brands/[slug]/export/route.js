// app/api/brands/[slug]/export/route.js
// Exports Identity + Business Plan + 90-Day Plan as a single Markdown file.
// Reachable at /api/brands/<slug>/export — served as a download.

import { getBrand, activePlan, activeBusinessPlan } from '../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function field(label, value) {
  const v = (value ?? '').toString().trim();
  return `**${label}**\n\n${v || '_(not set)_'}\n\n`;
}

function heading(label, value) {
  const v = (value ?? '').toString().trim();
  return `### ${label}\n\n${v || '_(not set)_'}\n\n`;
}

function buildMarkdown(brand) {
  const id = brand.identity || {};
  const plan = activePlan(brand);
  const bp = activeBusinessPlan(brand);
  const lockedBP = (brand.businessPlans || []).filter((p) => p.lockedAt).length;
  const pastPlans = (brand.plans || []).filter((p) => p.closedAt).length;
  const today = new Date().toISOString().slice(0, 10);

  let md = `# ${brand.name} — Strategy Export\n\n`;
  md += `_Exported ${today} from MarketingOS. Order: Business Plan → Identity → 90-Day Plan._\n\n`;
  md += `---\n\n`;

  // ── Business Plan ──
  md += `## Business Plan\n\n`;
  if (bp) {
    md += `_Working version started ${(bp.startedAt || '').slice(0, 10)}._`;
    if (lockedBP) md += ` _(${lockedBP} earlier locked version${lockedBP === 1 ? '' : 's'} in the app, not included here.)_`;
    md += `\n\n`;
    md += `### 1. Your business and objectives\n\n`;
    md += field('Describe your business and what you offer', bp.businessDescription);
    md += field('Objectives — short term (current year)', bp.objectivesShort);
    md += field('Objectives — medium term (1–2 years)', bp.objectivesMedium);
    md += field('How you will use your Start Up Loan', bp.loanUse);
    md += `### 2. Your skills and experience\n\n`;
    md += field('Relevant experience, employment or work', bp.experience);
    md += field('Relevant education or training', bp.education);
    md += `### 3. Your target customers\n\n`;
    md += field('Target customers', bp.targetCustomers);
    md += field('Need or problem you solve', bp.customerNeed);
    md += field('Approach to pricing', bp.pricing);
    md += `### 4. Your market and competition\n\n`;
    md += field('Market research and insights', bp.marketResearch);
    md += field('Competitors', bp.competitors);
    md += field('What sets your business apart', bp.usp);
    md += field('Strengths, weaknesses, opportunities, threats', bp.swot);
    md += `### 5. Your sales and marketing plans\n\n`;
    md += field('How you will promote your business', bp.promotion);
    md += `### 6. Your operational plans\n\n`;
    md += field('Two key suppliers / relationships', bp.suppliers);
    md += field('Staff — current and planned', bp.staff);
    md += field('Where the business operates from', bp.premises);
    md += field('Laws or regulations considered', bp.regulations);
    md += field('Insurance in place or planned', bp.insurance);
    md += `### 7. Back-up plan\n\n`;
    md += field('Managing repayments if things don’t go to plan', bp.backupPlan);
  } else {
    md += `_No active business plan._\n\n`;
  }
  md += `---\n\n`;

  // ── Identity ──
  md += `## Identity\n\n`;
  md += heading('Vision', id.vision);
  md += heading('Mission', id.mission);
  md += heading('Positioning', id.positioning);
  md += heading('Core Offer', id.coreOffer);
  md += heading('Audience', id.audience);
  md += heading('Voice & Tone', id.voice);
  md += heading('Core Values', id.values);
  md += heading('Culture Statement', id.culture);
  md += `---\n\n`;

  // ── 90-Day Plan ──
  md += `## 90-Day Plan\n\n`;
  if (plan) {
    md += `_Started ${(plan.startedAt || '').slice(0, 10)} · review ${plan.reviewDate || 'not set'}._`;
    if (pastPlans) md += ` _(${pastPlans} past plan${pastPlans === 1 ? '' : 's'} in the app, not included here.)_`;
    md += `\n\n`;
    md += heading('Vision (North Star)', plan.vision);
    md += heading('Positioning', plan.positioning);
    md += heading('Target Customer', plan.targetCustomer);
    md += heading('Core Offer', plan.coreOffer);
    md += heading('90-Day Goal', plan.goal);
    md += heading('Revenue Focus', plan.revenueFocus);
    const m = plan.marketing || {};
    md += `### Marketing Plan\n\n`;
    md += `- **Channels (ranked):** ${(m.channels || '').trim() || '_(not set)_'}\n`;
    md += `- **Content pillars:** ${(m.contentPillars || '').trim() || '_(not set)_'}\n`;
    md += `- **Posting cadence:** ${(m.postingCadence || '').trim() || '_(not set)_'}\n`;
    md += `- **Awareness:** ${(m.awareness || '').trim() || '_(not set)_'}\n`;
    md += `- **Interest:** ${(m.interest || '').trim() || '_(not set)_'}\n`;
    md += `- **Conversion:** ${(m.conversion || '').trim() || '_(not set)_'}\n\n`;
    md += heading('Key Metrics', plan.keyMetrics);
    const c = plan.contingency || {};
    md += `### Contingency (If / Then)\n\n`;
    md += `- **If:** ${(c.if || '').trim() || '_(not set)_'}\n`;
    md += `- **Then:** ${(c.then || '').trim() || '_(not set)_'}\n\n`;
    md += heading('This Quarter’s Big Bet', plan.bigBet);
  } else {
    md += `_No active 90-day plan._\n\n`;
  }

  return md;
}

export async function GET(_req, { params }) {
  const brand = await getBrand(params.slug);
  if (!brand) {
    return new Response('Brand not found', { status: 404 });
  }
  const md = buildMarkdown(brand);
  const filename = `${params.slug}-strategy-${new Date().toISOString().slice(0, 10)}.md`;
  return new Response(md, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
