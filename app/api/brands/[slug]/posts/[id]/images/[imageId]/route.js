// app/api/brands/[slug]/posts/[id]/images/[imageId]/route.js
// DELETE: remove a single image from a post (also deletes from blob storage).

import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getBrand, updatePost } from '../../../../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req, { params }) {
  try {
    const brand = await getBrand(params.slug);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    const post = (brand.posts || []).find((p) => p.id === params.id);
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    const image = (post.images || []).find((img) => img.id === params.imageId);
    if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

    // Best-effort delete from blob.
    try {
      await del(image.url);
    } catch (err) {
      console.error('Blob delete failed (continuing anyway):', err.message);
    }

    const nextImages = (post.images || []).filter((img) => img.id !== params.imageId);
    const updated = await updatePost(params.slug, params.id, { images: nextImages });

    return NextResponse.json({ post: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
