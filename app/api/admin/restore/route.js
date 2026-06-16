// app/api/admin/restore/route.js
// Accepts a backup JSON payload (POST body) and writes it back into Redis.

import { NextResponse } from 'next/server';
import { restoreBrands } from '../../../../lib/store';
import { setActivityLog } from '../../../../lib/activity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const payload = await req.json();
    if (!payload || !Array.isArray(payload.brands)) {
      return NextResponse.json({ error: 'Not a valid backup file (no brands array).' }, { status: 400 });
    }
    const restored = await restoreBrands(payload.brands);
    if (payload.activity && typeof payload.activity === 'object') {
      await setActivityLog(payload.activity);
    }
    return NextResponse.json({ ok: true, restored, activityRestored: !!payload.activity });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
