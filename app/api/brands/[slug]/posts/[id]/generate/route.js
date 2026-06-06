// app/api/brands/[slug]/posts/[id]/generate/route.js

import { NextResponse } from 'next/server';
import { getBrand, updatePost } from '../../../../../../../lib/store';
import { generatePost } from '../../../../../../../lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req, { params }) {
  try {
    const body = await req.json().catch(() => ({}));
    const brief = (body.brief || '').trim();
    const channel = (body.channel || '').trim();
    if (!brief) return NextResponse.json({ error: 'Brief is required' }, { status: 400 });

    const brand = await getBrand(params.slug);
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    const draft = await generatePost({ brand, brief, channel });

    const post = await updatePost(params.slug, params.id, {
      brief,
      draft,
      critique: null, // invalidate previous critique
    });

    return NextResponse.json({ post });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
