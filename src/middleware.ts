import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifyAuthToken } from '@/lib/auth-token';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Skip Next.js internal files, static assets, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Allow auth API routes without restriction
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 3. Check for active session cookie
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = sessionCookie ? await verifyAuthToken(sessionCookie) : null;
  const isAuthenticated = !!user;

  // 4. Handle /login page
  if (pathname === '/login') {
    if (isAuthenticated) {
      // If already logged in, redirect straight to dashboard
      const dashboardUrl = new URL('/', req.url);
      return NextResponse.redirect(dashboardUrl);
    }
    return NextResponse.next();
  }

  // 5. If not authenticated, block access
  if (!isAuthenticated) {
    // If it's an API route (non-auth), return JSON 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    // Otherwise redirect browser to login page
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
