import { NextResponse } from 'next/server';

export async function middleware(request) {
  // En production, les vérifications de répertoire sont désactivées
  // car elles ne sont pas compatibles avec Edge Runtime
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
