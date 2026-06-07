// app/api/brands/[slug]/posts/[id]/stats/route.js

import { NextResponse } from 'next/server';
import { addStatsEntry } from '../../../../../../../lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  try {
    const body = await req.json();
    const entry = await addStatsEntry(params.slug, params.id, body);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
