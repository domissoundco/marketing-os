// app/api/brands/[slug]/business-plan/[planId]/route.js

import { NextResponse } from 'next/server';
import { updateBusinessPlan, deleteBusinessPlan } from '../../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const allowed = ['businessDescription', 'objectivesShort', 'objectivesMedium', 'loanUse', 'experience', 'education', 'targetCustomers', 'customerNeed', 'pricing', 'marketResearch', 'competitors', 'usp', 'swot', 'promotion', 'suppliers', 'staff', 'premises', 'regulations', 'insurance', 'backupPlan'];
    const patch = {};
    for (const k of allowed) if (k in body) patch[k] = body[k];
    const plan = await updateBusinessPlan(params.slug, params.planId, patch);
    return NextResponse.json({ plan });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await deleteBusinessPlan(params.slug, params.planId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
