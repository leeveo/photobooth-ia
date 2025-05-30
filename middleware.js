import { NextResponse } from 'next/server';

export function middleware(request) {
  // Add CORS headers to all responses
  const response = NextResponse.next();
  
  // Add permissive CORS headers for development
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/photobooth-ia/admin/:path*',
  ],
};
