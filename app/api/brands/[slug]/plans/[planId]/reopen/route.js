// app/api/brands/[slug]/plans/[planId]/reopen/route.js

import { NextResponse } from 'next/server';
import { reopenPlan } from '../../../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req, { params }) {
  try {
    const plan = await reopenPlan(params.slug, params.planId);
    return NextResponse.json({ plan });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
