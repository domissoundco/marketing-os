// lib/store.js — Persistence layer.
// One JSON file per brand at brands/<slug>.json in the private Blob store.
// Posts (with images), tasks, and 90-day plans live inside the brand record.

import { put, list, del } from '@vercel/blob';

const BRAND_PREFIX = 'brands/';

function brandKey(slug) {
  return `${BRAND_PREFIX}${slug}.json`;
}

function authHeaders() {
  return { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` };
}

async function readBlobJson(url) {
  const res = await fetch(url, { headers: authHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`Blob read failed: ${res.status}`);
  return res.json();
}

export async function listBrands() {
  const { blobs } = await list({ prefix: BRAND_PREFIX });
  const records = await Promise.all(
    blobs.map(async (b) => {
      try { return await readBlobJson(b.url); }
      catch (err) { console.error(`Failed to read ${b.pathname}:`, err.message); return null; }
    })
  );
  return records.filter(Boolean).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function getBrand(slug) {
  const { blobs } = await list({ prefix: brandKey(slug) });
  const blob = blobs.find((b) => b.pathname === brandKey(slug));
  if (!blob) return null;
  return readBlobJson(blob.url);
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
      values:      brand.identity?.values      ?? existing?.identity?.values      ?? [],
    },
    posts: brand.posts ?? existing?.posts ?? [],
    tasks: brand.tasks ?? existing?.tasks ?? [],
    plans: brand.plans ?? existing?.plans ?? [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await put(brandKey(brand.slug), JSON.stringify(record, null, 2), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });

  return record;
}

// ── Posts ──────────────────────────────────────────────────────────────

export async function addPost(slug, post) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const now = new Date().toISOString();
  const newPost = {
    id: post.id || cryptoId(),
    brief: post.brief || '',
    draft: post.draft || '',
    critique: post.critique || null,
    publishAt: post.publishAt || null,
    status: post.status || 'draft',
    images: post.images || [],
    createdAt: now,
    updatedAt: now,
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

// ── Tasks ──────────────────────────────────────────────────────────────

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

// ── Plans ──────────────────────────────────────────────────────────────

export function emptyPlan() {
  const now = new Date();
  const reviewDate = new Date(now);
  reviewDate.setDate(reviewDate.getDate() + 90);
  return {
    id: cryptoId(),
    startedAt: now.toISOString(),
    vision: '',
    positioning: '',
    targetCustomer: '',
    coreOffer: '',
    goal: '',
    revenueFocus: '',
    marketing: {
      channels: '',
      contentPillars: '',
      postingCadence: '',
      awareness: '',
      interest: '',
      conversion: '',
    },
    keyMetrics: '',
    reviewDate: reviewDate.toISOString().slice(0, 10), // YYYY-MM-DD
    contingency: { if: '', then: '' },
    bigBet: '',
    reviewDecision: '',
    reviewNotes: '',
    closedAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function startPlan(slug) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');

  // Auto-close any active plan first.
  const now = new Date().toISOString();
  brand.plans = (brand.plans || []).map((p) =>
    p.closedAt ? p : { ...p, closedAt: now, reviewDecision: p.reviewDecision || 'auto-closed' }
  );

  // New plan, prefilled from brand identity.
  const plan = emptyPlan();
  plan.vision         = brand.identity?.vision       || '';
  plan.positioning    = brand.identity?.positioning  || '';
  plan.targetCustomer = brand.identity?.audience     || '';
  plan.coreOffer      = brand.identity?.coreOffer    || '';

  brand.plans = [...brand.plans, plan];
  await saveBrand(brand);
  return plan;
}

export async function updatePlan(slug, planId, patch) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const idx = (brand.plans || []).findIndex((p) => p.id === planId);
  if (idx === -1) throw new Error('Plan not found');
  const now = new Date().toISOString();
  brand.plans[idx] = { ...brand.plans[idx], ...patch, updatedAt: now };
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

export async function deletePlan(slug, planId) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  brand.plans = (brand.plans || []).filter((p) => p.id !== planId);
  await saveBrand(brand);
}

export function activePlan(brand) {
  if (!brand?.plans?.length) return null;
  // Most recent plan with no closedAt.
  for (let i = brand.plans.length - 1; i >= 0; i--) {
    if (!brand.plans[i].closedAt) return brand.plans[i];
  }
  return null;
}

// ── helpers ────────────────────────────────────────────────────────────

export function slugify(name) {
  return String(name).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function cryptoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
