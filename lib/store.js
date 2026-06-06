// lib/store.js — Persistence layer.
// One JSON file per brand at brands/<slug>.json in the private Blob store.
// Posts and tasks live inside the brand record.

import { put, list } from '@vercel/blob';

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
      try {
        return await readBlobJson(b.url);
      } catch (err) {
        console.error(`Failed to read ${b.pathname}:`, err.message);
        return null;
      }
    })
  );
  return records
    .filter(Boolean)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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
      values:      brand.identity?.values      ?? existing?.identity?.values      ?? [],
    },
    posts: brand.posts ?? existing?.posts ?? [],
    tasks: brand.tasks ?? existing?.tasks ?? [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await put(brandKey(brand.slug), JSON.stringify(record, null, 2), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
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
  const now = new Date().toISOString();
  brand.posts[idx] = { ...brand.posts[idx], ...patch, updatedAt: now };
  await saveBrand(brand);
  return brand.posts[idx];
}

export async function deletePost(slug, postId) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  brand.posts = (brand.posts || []).filter((p) => p.id !== postId);
  await saveBrand(brand);
}

// ── Tasks ──────────────────────────────────────────────────────────────

export async function addTask(slug, text) {
  const brand = await getBrand(slug);
  if (!brand) throw new Error('Brand not found');
  const task = {
    id: cryptoId(),
    text: String(text || '').trim(),
    done: false,
    createdAt: new Date().toISOString(),
  };
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

// ── helpers ────────────────────────────────────────────────────────────

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function cryptoId() {
  // 12-char base36, plenty for a personal app.
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}
