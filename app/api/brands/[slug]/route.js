// app/api/brands/[slug]/route.js — GET and PUT a single brand.

import { NextResponse } from 'next/server';
import { getBrand, saveBrand, slugify } from '../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const slug = slugify(params.slug);
  const brand = await getBrand(slug);
  if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ brand });
}

export async function PUT(request, { params }) {
  try {
    const slug = slugify(params.slug);
    const existing = await getBrand(slug);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await request.json();
    const updated = await saveBrand({
      slug,
      name: body.name ?? existing.name,
      identity: body.identity ?? existing.identity,
    });
    return NextResponse.json({ brand: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
