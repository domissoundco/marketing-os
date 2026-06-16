// lib/store.js — Persistence layer on Upstash Redis (strongly consistent).
// Brand records live in Redis. Images still live in Vercel Blob.

import { Redis } from '@upstash/redis';
import { del } from '@vercel/blob';

const redis = new Redis({
  url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const INDEX_KEY = 'brand:index';
const brandKey = (slug) => `brand:${slug}`;

function parseMaybe(data) {
  if (data == null) return null;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return null; }
  }
  return data; // Upstash auto-deserialises objects.
}

function migrate(brand) {
  if (!brand) return brand;
  brand.identity = brand.identity || {};
  // Legacy: values used to be an array; core values are now free text.
  if (Array.isArray(brand.identity.values)) {
    brand.identity.values = brand.identity.values.filter(Boolean).join('\n');
  }
  if (brand.identity.values == null) brand.identity.values = '';
  if (brand.identity.culture == null) brand.identity.culture = '';
  brand.products = brand.products || [];
  brand.posts = (brand.posts || []).map((p) => {
    if (p.status === 'published') p.status = 'posted';
    p.productIds = p.productIds || [];
    p.stats = p.stats || [];
    return p;
  });
  brand.tasks = brand.tasks || [];
  brand.plans = brand.plans || [];
  brand.businessPlans = brand.businessPlans || [];
  brand.leads = brand.leads || [];
  if (brand.focus == null) brand.focus = false;
  if (brand.focusNote == null) brand.focusNote = '';
  return brand;
}

export async function listBrands() {
  const slugs = await redis.smembers(INDEX_KEY);
  if (!slugs || slugs.length === 0) return [];
  const values = await redis.mget(...slugs.map(brandKey));
  return values
    .map(parseMaybe)
    .filter(Boolean)
    .map(migrate)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function getBrand(slug) {
  const data = await redis.get(brandKey(slug));
  const parsed = parseMaybe(data);
  if (!parsed) return null;
  return migrate(parsed);
}

export async function saveBrand(brand) {
  if (!brand.slug) throw new Error('Brand must have a slug');
  const existing = await getBrand(brand.slug);
  const now = new Date().toISOString();

  const record = {
    slug: brand.slug,
    name: brand.name || existing?.name || brand.slug,
    identity: {
      vision:      brand.identity?.vision      ?? existing?.identity?.vision      ?? '',
      mission:     brand.identity?.mission     ?? existing?.identity?.mission     ?? '',
      positioning: brand.identity?.positioning ?? existing?.identity?.positioning ?? '',
      audience:    brand.identity?.audience    ?? existing?.identity?.audience    ?? '',
      voice:       brand.identity?.voice       ?? existing?.identity?.voice       ?? '',
      coreOffer:   brand.identity?.coreOffer   ?? existing?.identity?.coreOffer   ?? '',
      values:      coerceValues(brand.identity?.values ?? existing?.identity?.values ?? ''),
      culture:     brand.identity?.culture     ?? existing?.identity?.culture     ?? '',
    },
    products: brand.products ?? existing?.products ?? [],
    posts: brand.posts ?? existing?.posts ?? [],
    tasks: brand.tasks ?? existing?.tasks ?? [],
    plans: brand.plans ?? existing?.plans ?? [],
    businessPlans: brand.businessPlans ?? existing?.businessPlans ?? [],
    leads: brand.leads ?? existing?.leads ?? [],
    focus: brand.focus ?? existing?.focus ?? false,
    focusNote: brand.focusNote ?? existing?.focusNote ?? '',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await redis.set(brandKey(brand.slug), record);
  await redis.sadd(INDEX_KEY, brand.slug);
  return record;
}

export async function deleteBrand(slug) {
  const brand = await getBrand(slug);

  // Delete known images from Blob.
  const imageUrls = [];
  for (const post of brand?.posts || []) {
    for (const img of post.images || []) {
      if (img.url) imageUrls.push(img.url);
    }
  }
  if (imageUrls.length > 0) {
    await del(imageUrls).catch((err) => console.error('Image cleanup failed:', err.message));
  }

  // Remove the brand record and de-index it.
  await redis.del(brandKey(slug));
  await redis.srem(INDEX_KEY, slug);
}

// Restore brands from a backup payload. Writes each brand record exactly as
// backed up (no reshaping) and re-indexes it. Upsert — does not delete brands
// that exist now but aren't in the backup.
export async function restoreBrands(brands) {
  if (!Array.isArray(brands)) throw new Error('Backup must contain a "brands" array');
  let count = 0;
  for (const b of brands) {
    if (!b || !b.slug) continue;
    await redis.set(brandKey(b.slug), b);
    await redis.sadd(INDEX_KEY, b.slug);
    count += 1;
  }
  return count;
}

// ── Products ──────────────────────────────────────────────────────────

export async function addProduct(slug, product) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const now = new Date().toISOString();
  const newProduct = {
    id: cryptoId(),
    name: String(product.name || '').trim(),
    description: String(product.description || '').trim(),
    status: product.status || 'active',
    createdAt: now, updatedAt: now,
  };
  if (!newProduct.name) throw new Error('Name is required');
  brand.products = [...(brand.products || []), newProduct];
  await saveBrand(brand);
  return newProduct;
}

export async function updateProduct(slug, productId, patch) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const idx = (brand.products || []).findIndex((p) => p.id === productId);
  if (idx === -1) throw new Error('Product not found');
  brand.products[idx] = { ...brand.products[idx], ...patch, updatedAt: new Date().toISOString() };
  await saveBrand(brand);
  return brand.products[idx];
}

export async function deleteProduct(slug, productId) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  brand.products = (brand.products || []).filter((p) => p.id !== productId);
  brand.posts = (brand.posts || []).map((p) => ({
    ...p, productIds: (p.productIds || []).filter((id) => id !== productId),
  }));
  await saveBrand(brand);
}

// ── Posts ─────────────────────────────────────────────────────────────

export async function addPost(slug, post) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const now = new Date().toISOString();
  const newPost = {
    id: post.id || cryptoId(),
    brief: post.brief || '', draft: post.draft || '', critique: post.critique || null,
    publishAt: post.publishAt || null, status: post.status || 'draft',
    images: post.images || [], productIds: post.productIds || [], stats: post.stats || [],
    createdAt: now, updatedAt: now,
  };
  brand.posts = [...(brand.posts || []), newPost];
  await saveBrand(brand);
  return newPost;
}

export async function updatePost(slug, postId, patch) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const idx = (brand.posts || []).findIndex((p) => p.id === postId);
  if (idx === -1) throw new Error('Post not found');
  brand.posts[idx] = { ...brand.posts[idx], ...patch, updatedAt: new Date().toISOString() };
  await saveBrand(brand);
  return brand.posts[idx];
}

export async function deletePost(slug, postId) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const post = (brand.posts || []).find((p) => p.id === postId);
  if (post && post.images?.length) {
    await Promise.all(post.images.map((img) =>
      del(img.url).catch((err) => console.error('Image blob delete failed:', img.url, err.message))
    ));
  }
  brand.posts = (brand.posts || []).filter((p) => p.id !== postId);
  await saveBrand(brand);
}

// ── Post stats ────────────────────────────────────────────────────────

export async function addStatsEntry(slug, postId, entry) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const idx = (brand.posts || []).findIndex((p) => p.id === postId);
  if (idx === -1) throw new Error('Post not found');

  const now = new Date().toISOString();
  const statsEntry = {
    id: cryptoId(),
    recordedAt: entry.recordedAt || now,
    impressions: toNumOrNull(entry.impressions),
    likes:       toNumOrNull(entry.likes),
    comments:    toNumOrNull(entry.comments),
    shares:      toNumOrNull(entry.shares),
    clicks:      toNumOrNull(entry.clicks),
    leads:       toNumOrNull(entry.leads),
    revenue:     toNumOrNull(entry.revenue),
    notes:       String(entry.notes || ''),
    createdAt:   now,
  };

  brand.posts[idx].stats = [...(brand.posts[idx].stats || []), statsEntry];
  brand.posts[idx].stats.sort((a, b) => (a.recordedAt || '').localeCompare(b.recordedAt || ''));
  brand.posts[idx].updatedAt = now;
  await saveBrand(brand);
  return statsEntry;
}

export async function deleteStatsEntry(slug, postId, statsId) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const idx = (brand.posts || []).findIndex((p) => p.id === postId);
  if (idx === -1) throw new Error('Post not found');
  brand.posts[idx].stats = (brand.posts[idx].stats || []).filter((s) => s.id !== statsId);
  brand.posts[idx].updatedAt = new Date().toISOString();
  await saveBrand(brand);
}

export function latestStats(post) {
  if (!post?.stats?.length) return null;
  return post.stats.reduce((latest, cur) =>
    (cur.recordedAt || '').localeCompare(latest.recordedAt || '') > 0 ? cur : latest
  , post.stats[0]);
}

// ── Tasks ─────────────────────────────────────────────────────────────

export async function addTask(slug, text) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const task = { id: cryptoId(), text: String(text || '').trim(), done: false, createdAt: new Date().toISOString() };
  brand.tasks = [...(brand.tasks || []), task];
  await saveBrand(brand);
  return task;
}

export async function updateTask(slug, taskId, patch) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const idx = (brand.tasks || []).findIndex((t) => t.id === taskId);
  if (idx === -1) throw new Error('Task not found');
  brand.tasks[idx] = { ...brand.tasks[idx], ...patch };
  await saveBrand(brand);
  return brand.tasks[idx];
}

export async function deleteTask(slug, taskId) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  brand.tasks = (brand.tasks || []).filter((t) => t.id !== taskId);
  await saveBrand(brand);
}

// ── Plans ─────────────────────────────────────────────────────────────

export function emptyPlan() {
  const now = new Date();
  const reviewDate = new Date(now);
  reviewDate.setDate(reviewDate.getDate() + 90);
  return {
    id: cryptoId(), startedAt: now.toISOString(),
    vision: '', positioning: '', targetCustomer: '', coreOffer: '',
    goal: '', revenueFocus: '',
    marketing: { channels: '', contentPillars: '', postingCadence: '', awareness: '', interest: '', conversion: '' },
    keyMetrics: '', reviewDate: reviewDate.toISOString().slice(0, 10),
    contingency: { if: '', then: '' }, bigBet: '',
    reviewDecision: '', reviewNotes: '', closedAt: null,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  };
}

export async function startPlan(slug) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const now = new Date().toISOString();
  brand.plans = (brand.plans || []).map((p) =>
    p.closedAt ? p : { ...p, closedAt: now, reviewDecision: p.reviewDecision || 'auto-closed' }
  );
  const plan = emptyPlan();
  plan.vision         = brand.identity?.vision      || '';
  plan.positioning    = brand.identity?.positioning || '';
  plan.targetCustomer = brand.identity?.audience    || '';
  plan.coreOffer      = brand.identity?.coreOffer   || '';
  brand.plans = [...brand.plans, plan];
  await saveBrand(brand);
  return plan;
}

export async function updatePlan(slug, planId, patch) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const idx = (brand.plans || []).findIndex((p) => p.id === planId);
  if (idx === -1) throw new Error('Plan not found');
  brand.plans[idx] = { ...brand.plans[idx], ...patch, updatedAt: new Date().toISOString() };
  await saveBrand(brand);
  return brand.plans[idx];
}

export async function closePlan(slug, planId, { reviewDecision, reviewNotes }) {
  return updatePlan(slug, planId, {
    closedAt: new Date().toISOString(),
    reviewDecision: reviewDecision || '',
    reviewNotes: reviewNotes || '',
  });
}

export async function reopenPlan(slug, planId) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const target = (brand.plans || []).find((p) => p.id === planId);
  if (!target) throw new Error('Plan not found');
  const now = new Date().toISOString();
  brand.plans = (brand.plans || []).map((p) => {
    if (p.id === planId) return { ...p, closedAt: null, reviewDecision: '', updatedAt: now };
    if (!p.closedAt) return { ...p, closedAt: now, reviewDecision: p.reviewDecision || 'auto-closed', updatedAt: now };
    return p;
  });
  await saveBrand(brand);
  return brand.plans.find((p) => p.id === planId);
}

export async function deletePlan(slug, planId) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  brand.plans = (brand.plans || []).filter((p) => p.id !== planId);
  await saveBrand(brand);
}

export function activePlan(brand) {
  if (!brand?.plans?.length) return null;
  for (let i = brand.plans.length - 1; i >= 0; i--) {
    if (!brand.plans[i].closedAt) return brand.plans[i];
  }
  return null;
}

// ── Business plan ─────────────────────────────────────────────────────
// Loan-ready structure (British Business Bank / Start Up Loans template).
// A working version has lockedAt === null. Renew locks it and starts a fresh copy.

export function emptyBusinessPlan() {
  const now = new Date().toISOString();
  return {
    id: cryptoId(),
    startedAt: now,
    // 1. Your business and objectives
    businessDescription: '', // products/services, trading entity, ownership %, premises, milestones
    objectivesShort: '',     // SMART objectives — current year
    objectivesMedium: '',    // SMART objectives — next 1-2 years
    loanUse: '',             // how the loan is used (itemised: item, £, rationale)
    // 2. Your skills and experience
    experience: '',          // relevant experience/employment
    education: '',           // relevant education/training/qualifications
    // 3. Your target customers
    targetCustomers: '',     // demographic description
    customerNeed: '',        // need/problem your product/service solves
    pricing: '',             // approach to pricing
    // 4. Your market and competition
    marketResearch: '',      // research done + insights (market size, demand)
    competitors: '',         // competitor 1 & 2: name, location, prices, strengths, weaknesses
    usp: '',                 // what sets your business apart
    swot: '',                // your strengths / weaknesses / opportunities / threats
    // 5. Your sales and marketing plans
    promotion: '',           // how you promote — channels, KPIs, content, budget
    // 6. Your operational plans
    suppliers: '',           // two key suppliers/relationships + status & terms
    staff: '',               // current/planned staff, roles, responsibilities
    premises: '',            // where the business operates from
    regulations: '',         // laws/regulations considered
    insurance: '',           // insurance in place / planned
    // 7. Back-up plan
    backupPlan: '',          // managing loan repayments if things go wrong (PSB, liabilities)
    lockedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

const BUSINESS_PLAN_FIELDS = [
  'businessDescription', 'objectivesShort', 'objectivesMedium', 'loanUse',
  'experience', 'education',
  'targetCustomers', 'customerNeed', 'pricing',
  'marketResearch', 'competitors', 'usp', 'swot',
  'promotion',
  'suppliers', 'staff', 'premises', 'regulations', 'insurance',
  'backupPlan',
];

export function activeBusinessPlan(brand) {
  if (!brand?.businessPlans?.length) return null;
  for (let i = brand.businessPlans.length - 1; i >= 0; i--) {
    if (!brand.businessPlans[i].lockedAt) return brand.businessPlans[i];
  }
  return null;
}

// Start a working business plan. If one is already active, lock it first and
// carry its content forward into the new working copy (this is "Renew").
export async function startBusinessPlan(slug) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const now = new Date().toISOString();

  const current = activeBusinessPlan(brand);
  brand.businessPlans = (brand.businessPlans || []).map((p) =>
    p.lockedAt ? p : { ...p, lockedAt: now, updatedAt: now }
  );

  const fresh = emptyBusinessPlan();
  if (current) {
    for (const f of BUSINESS_PLAN_FIELDS) fresh[f] = current[f] || '';
  }
  brand.businessPlans = [...brand.businessPlans, fresh];
  await saveBrand(brand);
  return fresh;
}

export async function updateBusinessPlan(slug, planId, patch) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const idx = (brand.businessPlans || []).findIndex((p) => p.id === planId);
  if (idx === -1) throw new Error('Business plan not found');
  brand.businessPlans[idx] = { ...brand.businessPlans[idx], ...patch, updatedAt: new Date().toISOString() };
  await saveBrand(brand);
  return brand.businessPlans[idx];
}

// Reopen a locked business plan; any currently working one is locked first.
export async function reopenBusinessPlan(slug, planId) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const target = (brand.businessPlans || []).find((p) => p.id === planId);
  if (!target) throw new Error('Business plan not found');
  const now = new Date().toISOString();
  brand.businessPlans = (brand.businessPlans || []).map((p) => {
    if (p.id === planId) return { ...p, lockedAt: null, updatedAt: now };
    if (!p.lockedAt) return { ...p, lockedAt: now, updatedAt: now };
    return p;
  });
  await saveBrand(brand);
  return brand.businessPlans.find((p) => p.id === planId);
}

export async function deleteBusinessPlan(slug, planId) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  brand.businessPlans = (brand.businessPlans || []).filter((p) => p.id !== planId);
  await saveBrand(brand);
}

// ── Leads (who waved back) ────────────────────────────────────────────

export const LEAD_STATUSES = ['new', 'contacted', 'talking', 'quoted', 'won', 'lost'];

export async function addLead(slug, lead) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const now = new Date().toISOString();
  const newLead = {
    id: cryptoId(),
    name: String(lead.name || '').trim(),
    contact: String(lead.contact || '').trim(),
    source: String(lead.source || '').trim(),
    status: LEAD_STATUSES.includes(lead.status) ? lead.status : 'new',
    value: toNumOrNull(lead.value),
    note: String(lead.note || '').trim(),
    nextAction: String(lead.nextAction || '').trim(),
    nextActionDate: lead.nextActionDate || '',
    createdAt: now, updatedAt: now,
  };
  if (!newLead.name) throw new Error('Name is required');
  brand.leads = [...(brand.leads || []), newLead];
  await saveBrand(brand);
  return newLead;
}

export async function updateLead(slug, leadId, patch) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const idx = (brand.leads || []).findIndex((l) => l.id === leadId);
  if (idx === -1) throw new Error('Lead not found');
  const clean = { ...patch };
  if ('value' in clean) clean.value = toNumOrNull(clean.value);
  brand.leads[idx] = { ...brand.leads[idx], ...clean, updatedAt: new Date().toISOString() };
  await saveBrand(brand);
  return brand.leads[idx];
}

export async function deleteLead(slug, leadId) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  brand.leads = (brand.leads || []).filter((l) => l.id !== leadId);
  await saveBrand(brand);
}

// ── helpers ───────────────────────────────────────────────────────────

export function slugify(name) {
  return String(name).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function cryptoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Core values may arrive as a legacy array or as free text; always store a string.
function coerceValues(v) {
  if (Array.isArray(v)) return v.filter(Boolean).join('\n');
  return String(v ?? '');
}

function toNumOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
