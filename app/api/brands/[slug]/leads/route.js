// app/api/brands/[slug]/leads/route.js

import { NextResponse } from 'next/server';
import { getBrand, addLead } from '../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const brand = await getBrand(params.slug);
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  return NextResponse.json({ leads: brand.leads || [] });
}

export async function POST(req, { params }) {
  try {
    const body = await req.json();
    const lead = await addLead(params.slug, body);
    return NextResponse.json({ lead }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
