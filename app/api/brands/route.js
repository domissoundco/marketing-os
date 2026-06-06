// app/api/brands/route.js — GET list of brands, POST a new brand.

import { NextResponse } from 'next/server';
import { listBrands, saveBrand, getBrand, slugify } from '../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const brands = await listBrands();
    return NextResponse.json({ brands });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const slug = slugify(body.slug || body.name);
    if (!slug) {
      return NextResponse.json({ error: 'Could not derive slug from name' }, { status: 400 });
    }
    const existing = await getBrand(slug);
    if (existing) {
      return NextResponse.json({ error: `Brand "${slug}" already exists` }, { status: 409 });
    }
    const brand = await saveBrand({ slug, name: body.name.trim() });
    return NextResponse.json({ brand }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
