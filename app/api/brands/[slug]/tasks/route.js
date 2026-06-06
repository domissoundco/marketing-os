// app/api/brands/[slug]/tasks/route.js

import { NextResponse } from 'next/server';
import { getBrand, addTask } from '../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const brand = await getBrand(params.slug);
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  return NextResponse.json({ tasks: brand.tasks || [] });
}

export async function POST(req, { params }) {
  try {
    const body = await req.json();
    const text = (body.text || '').trim();
    if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    const task = await addTask(params.slug, text);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
