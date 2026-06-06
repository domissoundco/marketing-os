// app/api/brands/[slug]/posts/[id]/route.js

import { NextResponse } from 'next/server';
import { updatePost, deletePost } from '../../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const allowed = ['brief', 'draft', 'critique', 'publishAt', 'status'];
    const patch = {};
    for (const k of allowed) if (k in body) patch[k] = body[k];
    const post = await updatePost(params.slug, params.id, patch);
    return NextResponse.json({ post });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await deletePost(params.slug, params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
