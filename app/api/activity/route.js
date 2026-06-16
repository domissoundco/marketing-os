// app/api/activity/route.js

import { NextResponse } from 'next/server';
import { getActivityLog, setActivityForDate } from '../../../lib/activity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const log = await getActivityLog();
  return NextResponse.json({ log });
}

export async function POST(req) {
  try {
    const { date, items } = await req.json();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Valid date (YYYY-MM-DD) required' }, { status: 400 });
    }
    const log = await setActivityForDate(date, items || []);
    return NextResponse.json({ log });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
