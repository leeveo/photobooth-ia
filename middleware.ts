// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // CORS headers
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const path = req.nextUrl.pathname;

  const isAdminRoute = path.startsWith('/photobooth-ia/admin');

  // ✅ Exclusions : login, logout, register, et la page du dashboard elle-même
  const isExcluded =
    path === '/photobooth-ia/admin/login' ||
    path === '/photobooth-ia/admin/logout' ||
    path === '/photobooth-ia/admin/register' ||
    path === '/photobooth-ia/admin/oauth-callback' ||
    path === '/photobooth-ia/admin/dashboard'; // Ajout du dashboard aux exclusions

  if (isAdminRoute && !isExcluded) {
    // Vérifier uniquement la présence du cookie de session personnalisé
    const customAuthCookie = req.cookies.get('admin_session')?.value;

    if (!customAuthCookie) {
      return NextResponse.redirect(new URL('/photobooth-ia/admin/login', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/photobooth-ia/admin/:path*',
  ],
};
