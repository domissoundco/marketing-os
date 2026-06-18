// app/api/brands/[slug]/plans/[planId]/route.js

import { NextResponse } from 'next/server';
import { updatePlan, closePlan, deletePlan } from '../../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLAN_FIELDS = [
  'vision', 'positioning', 'targetCustomer', 'coreOffer',
  'goal', 'revenueFocus', 'marketing', 'keyMetrics',
  'startDate', 'reviewDate', 'contingency', 'bigBet',
];

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const patch = {};
    for (const k of PLAN_FIELDS) if (k in body) patch[k] = body[k];
    const plan = await updatePlan(params.slug, params.planId, patch);
    return NextResponse.json({ plan });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST = close the plan (review action).
export async function POST(req, { params }) {
  try {
    const body = await req.json();
    const plan = await closePlan(params.slug, params.planId, {
      reviewDecision: body.reviewDecision || '',
      reviewNotes: body.reviewNotes || '',
    });
    return NextResponse.json({ plan });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await deletePlan(params.slug, params.planId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
