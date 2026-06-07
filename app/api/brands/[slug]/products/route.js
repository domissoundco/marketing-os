// app/api/brands/[slug]/products/route.js

import { NextResponse } from 'next/server';
import { getBrand, addProduct } from '../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const brand = await getBrand(params.slug);
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  return NextResponse.json({ products: brand.products || [] });
}

export async function POST(req, { params }) {
  try {
    const body = await req.json();
    const product = await addProduct(params.slug, {
      name: body.name,
      description: body.description,
      status: body.status,
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
