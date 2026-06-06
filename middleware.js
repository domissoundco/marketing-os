// middleware.js — Gates every page and API route behind a password cookie.
// The cookie value must equal process.env.APP_PASSWORD. /login and /api/auth
// are exempt so the user can sign in.

import { NextResponse } from 'next/server';

const PUBLIC_PATHS = new Set(['/login', '/api/auth']);

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return new NextResponse('APP_PASSWORD not configured on this deployment.', {
      status: 500,
    });
  }

  const cookie = request.cookies.get('mos-auth')?.value;
  if (cookie === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on every route except Next.js internals and static assets.
  matcher: ['/((?!_next/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|js|css|map)$).*)'],
};
