// app/api/brands/[slug]/posts/[id]/stats/[statsId]/route.js

import { NextResponse } from 'next/server';
import { deleteStatsEntry } from '../../../../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req, { params }) {
  try {
    await deleteStatsEntry(params.slug, params.id, params.statsId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
