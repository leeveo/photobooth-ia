// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateSharedToken, setSharedAuthCookie } from './utils/sharedAuth';

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
    
    // Si l'utilisateur est authentifié mais n'a pas de token partagé, en créer un
    const sharedToken = req.cookies.get('shared_auth_token')?.value;
    
    if (customAuthCookie && !sharedToken) {
      try {
        // Extraire l'ID utilisateur du cookie admin_session
        // Note: Ajustez cette partie selon le format de votre cookie
        const adminSession = JSON.parse(Buffer.from(customAuthCookie, 'base64').toString());
        const userId = adminSession.userId;
        
        if (userId) {
          // Générer un token partagé
          const newSharedToken = await generateSharedToken(userId);
          if (newSharedToken) {
            // Définir le cookie de token partagé
            setSharedAuthCookie(res, newSharedToken);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la création du token partagé:', error);
      }
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
