// lib/store.js — Persistence layer for MarketingOS.
// One JSON file per brand at brands/<slug>.json in the private Blob store.

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

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
