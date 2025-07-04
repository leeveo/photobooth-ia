// Ce middleware vérifie l'authentification sur toutes les routes admin

import { NextResponse } from 'next/server';

export async function middleware(request) {
  // Obtenir le cookie ou le token de session
  const adminSession = request.cookies.get('admin_session')?.value || 
                       request.headers.get('x-admin-session');

  const url = request.nextUrl.clone();
  
  // Si nous sommes sur une page protégée et qu'il n'y a pas de session
  if (!adminSession) {
    // Si c'est déjà la page de login, ne pas rediriger (évite les boucles de redirection)
    if (url.pathname.includes('/login')) {
      return NextResponse.next();
    }
    
    // Si c'est la page de création après paiement, ajouter un paramètre spécial
    if (url.pathname.includes('/projects/create')) {
      url.pathname = '/photobooth-ia/admin/login';
      url.searchParams.set('redirect', 'create-project');
      return NextResponse.redirect(url);
    }
    
    // Redirection standard vers la page de login
    url.pathname = '/photobooth-ia/admin/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/photobooth-ia/admin/:path*'],
};
