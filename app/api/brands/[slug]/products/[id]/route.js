// app/api/brands/[slug]/products/[id]/route.js

import { NextResponse } from 'next/server';
import { updateProduct, deleteProduct } from '../../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const patch = {};
    for (const k of ['name', 'description', 'status']) {
      if (k in body) patch[k] = body[k];
    }
    const product = await updateProduct(params.slug, params.id, patch);
    return NextResponse.json({ product });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await deleteProduct(params.slug, params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
