// app/api/brands/[slug]/posts/route.js

import { NextResponse } from 'next/server';
import { getBrand, addPost } from '../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const brand = await getBrand(params.slug);
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  return NextResponse.json({ posts: brand.posts || [] });
}

export async function POST(req, { params }) {
  try {
    const body = await req.json().catch(() => ({}));
    const post = await addPost(params.slug, {
      brief: body.brief || '',
      draft: body.draft || '',
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
