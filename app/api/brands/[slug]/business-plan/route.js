// app/api/brands/[slug]/business-plan/route.js

import { NextResponse } from 'next/server';
import { startBusinessPlan } from '../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req, { params }) {
  try {
    const plan = await startBusinessPlan(params.slug);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
