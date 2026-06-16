// app/api/brands/[slug]/leads/[id]/route.js

import { NextResponse } from 'next/server';
import { updateLead, deleteLead } from '../../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const allowed = ['name', 'contact', 'source', 'status', 'value', 'note', 'nextAction', 'nextActionDate'];
    const patch = {};
    for (const k of allowed) if (k in body) patch[k] = body[k];
    const lead = await updateLead(params.slug, params.id, patch);
    return NextResponse.json({ lead });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await deleteLead(params.slug, params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
