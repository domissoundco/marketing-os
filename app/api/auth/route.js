// app/api/auth/route.js — Verify password, set auth cookie.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request) {
  try {
    const { password } = await request.json();
    const expected = process.env.APP_PASSWORD;

    if (!expected) {
      return NextResponse.json(
        { error: 'APP_PASSWORD not configured' },
        { status: 500 },
      );
    }

    if (!constantTimeEqual(password, expected)) {
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set('mos-auth', expected, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('mos-auth');
  return response;
}
