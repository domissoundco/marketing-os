// app/api/brands/[slug]/plans/route.js

import { NextResponse } from 'next/server';
import { getBrand, startPlan } from '../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const brand = await getBrand(params.slug);
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  return NextResponse.json({ plans: brand.plans || [] });
}

export async function POST(_req, { params }) {
  try {
    const plan = await startPlan(params.slug);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
