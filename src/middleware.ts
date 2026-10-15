import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/about',
  '/courses',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Immediately pass all static files, api, images, favicon, scripts
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Ultra-fast Cookie Check for User Token / Session
  // Checks common auth cookies (Firebase, session, or legacy auth)
  const cookies = request.cookies;
  const authToken =
    cookies.get('token')?.value ||
    cookies.get('firebaseToken')?.value ||
    cookies.get('sb-access-token')?.value ||
    cookies.get('session')?.value;

  const userRole = cookies.get('user_role')?.value || cookies.get('role')?.value;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const isAdmin = pathname.startsWith('/admin');

  // If user is logged in and visits home `/` or `/login` or `/register`:
  // Redirect immediately to dashboard or admin
  if (authToken && (pathname === '/' || pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone();
    url.pathname = userRole === 'admin' ? '/admin' : '/dashboard';
    return NextResponse.redirect(url);
  }

  // If trying to access admin panel without admin role
  if (isAdmin && userRole !== 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = authToken ? '/dashboard' : '/login';
    return NextResponse.redirect(url);
  }

  // If visiting protected page without being logged in
  if (!authToken && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js)$).*)',
  ],
};
