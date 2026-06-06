// app/api/media/route.js — Proxy private blob images to the browser.
// <img src="/api/media?url=<encoded blob url>" />
// The middleware already gates this route behind APP_PASSWORD.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse('Missing url', { status: 400 });

  // Only proxy URLs from Vercel Blob storage.
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }
  if (!parsed.hostname.endsWith('.blob.vercel-storage.com')) {
    return new NextResponse('Disallowed host', { status: 400 });
  }

  const upstream = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });
  if (!upstream.ok) {
    return new NextResponse('Upstream fetch failed', { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
