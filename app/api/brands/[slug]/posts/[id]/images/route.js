// app/api/brands/[slug]/posts/[id]/images/route.js
// POST: upload an image and attach it to the post.

import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getBrand, updatePost, cryptoId } from '../../../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024; // Vercel server-side upload cap ≈ 4.5MB.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req, { params }) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large — max 4 MB' }, { status: 413 });
    }

    const brand = await getBrand(params.slug);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    const post = (brand.posts || []).find((p) => p.id === params.id);
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    // Path: media/<brand>/<post>/<timestamp>-<safe-name>
    const safeName = (file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
    const pathname = `media/${params.slug}/${params.id}/${Date.now()}-${safeName}`;

    const blob = await put(pathname, file, {
      access: 'private',
      contentType: file.type,
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60 * 60 * 24 * 30, // images don't change, cache a month.
    });

    const image = {
      id: cryptoId(),
      url: blob.url,
      pathname: blob.pathname,
      contentType: file.type,
      size: file.size,
      alt: file.name || '',
      addedAt: new Date().toISOString(),
    };

    const nextImages = [...(post.images || []), image];
    const updated = await updatePost(params.slug, params.id, { images: nextImages });

    return NextResponse.json({ image, post: updated }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
