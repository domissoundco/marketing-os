// app/api/brands/[slug]/posts/[id]/critique/route.js

import { NextResponse } from 'next/server';
import { getBrand, updatePost } from '../../../../../../../lib/store';
import { critiquePost } from '../../../../../../../lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(_req, { params }) {
  try {
    const brand = await getBrand(params.slug);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    const post = (brand.posts || []).find((p) => p.id === params.id);
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    if (!post.draft) return NextResponse.json({ error: 'No draft to critique' }, { status: 400 });

    const critique = await critiquePost({
      brand,
      draft: post.draft,
      images: post.images || [],
    });

    const updated = await updatePost(params.slug, params.id, { critique });
    return NextResponse.json({ post: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
