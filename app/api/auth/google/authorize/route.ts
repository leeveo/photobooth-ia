import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * API pour démarrer le flow d'autorisation Google OAuth
 * Génère l'URL d'autorisation et redirige l'utilisateur vers Google
 */
export async function GET(request: NextRequest) {
  console.log("🚀 Démarrage du flow Google OAuth");
  
  try {
    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!CLIENT_ID) {
      console.error("❌ GOOGLE_CLIENT_ID manquant");
      return NextResponse.json({ error: 'Configuration OAuth incomplète' }, { status: 500 });
    }
    
    // Déterminer l'URL de redirection
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/photobooth-ia/admin/auth/callback`;
    
    console.log("🔗 Redirect URI:", redirectUri);
    
    // Générer un state aléatoire pour la sécurité
    const state = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    
    // Paramètres OAuth Google
    const authParams = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state: state,
    });
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;
    
    console.log("✅ URL d'autorisation générée");
    
    // Redirection vers Google OAuth
    return NextResponse.redirect(authUrl);
    
  } catch (error: any) {
    console.error("💥 Erreur génération URL OAuth:", error);
    return NextResponse.json({ 
      error: 'Erreur génération URL OAuth', 
      details: error.message 
    }, { status: 500 });
  }
}