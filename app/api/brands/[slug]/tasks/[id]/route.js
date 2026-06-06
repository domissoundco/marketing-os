// app/api/brands/[slug]/tasks/[id]/route.js

import { NextResponse } from 'next/server';
import { updateTask, deleteTask } from '../../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const patch = {};
    if ('text' in body) patch.text = String(body.text || '').trim();
    if ('done' in body) patch.done = !!body.done;
    const task = await updateTask(params.slug, params.id, patch);
    return NextResponse.json({ task });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await deleteTask(params.slug, params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
