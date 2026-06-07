// app/api/admin/migrate/route.js
// One-time migration: copy existing brand JSON files from Vercel Blob into Redis.
// Visit /api/admin/migrate once in the browser (you must be logged in).
// Idempotent — safe to run more than once.

import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const redis = new Redis({
  url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function GET() {
  const results = [];
  try {
    const { blobs } = await list({ prefix: 'brands/' });
    for (const blob of blobs) {
      try {
        const res = await fetch(blob.url, {
          headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
          cache: 'no-store',
        });
        if (!res.ok) {
          results.push({ pathname: blob.pathname, ok: false, status: res.status });
          continue;
        }
        const data = await res.json();
        if (!data?.slug) {
          results.push({ pathname: blob.pathname, ok: false, reason: 'no slug' });
          continue;
        }
        await redis.set(`brand:${data.slug}`, data);
        await redis.sadd('brand:index', data.slug);
        results.push({ slug: data.slug, ok: true });
      } catch (err) {
        results.push({ pathname: blob.pathname, ok: false, error: err.message });
      }
    }
    return NextResponse.json({
      migrated: results.filter((r) => r.ok).length,
      total: results.length,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, results }, { status: 500 });
  }
}
