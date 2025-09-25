import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * API Google OAuth - Nouvelle version simplifiée
 * Route unique pour gérer l'authentification Google OAuth
 */

// GET: Test de la configuration OAuth
export async function GET(request: NextRequest) {
  console.log("🔍 Test API Google OAuth");
  
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  
  return NextResponse.json({
    message: "API Google OAuth - Version simplifiée",
    status: "active",
    config: {
      client_id_exists: !!CLIENT_ID,
      client_id_preview: CLIENT_ID ? `${CLIENT_ID.substring(0, 20)}...` : "non configuré",
      client_secret_exists: !!CLIENT_SECRET,
      redirect_uri: getRedirectUri(request),
    },
    usage: {
      auth: "GET /api/auth/google/authorize - Démarrer le flow OAuth",
      token: "POST /api/auth/google avec { code, state } - Échanger le code",
    }
  });
}

// POST: Échange du code OAuth pour un token
export async function POST(request: NextRequest) {
  console.log("🔐 Échange code OAuth Google");
  
  try {
    const body = await request.json();
    const { code, state, redirect_uri } = body;
    
    if (!code) {
      return NextResponse.json({ error: 'Code OAuth manquant' }, { status: 400 });
    }
    
    // Configuration OAuth
    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error("❌ Variables d'environnement OAuth manquantes");
      return NextResponse.json({ error: 'Configuration OAuth incomplète' }, { status: 500 });
    }
    
    // URL de redirection
    const finalRedirectUri = redirect_uri || getRedirectUri(request);
    
    console.log("🔗 Redirect URI utilisée:", finalRedirectUri);
    
    // Échange du code pour un token
    const tokenParams = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: finalRedirectUri,
    });
    
    console.log("📡 Requête vers Google OAuth...");
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ Erreur échange token:", errorText);
      return NextResponse.json({ 
        error: 'Erreur échange token', 
        details: errorText,
        status: tokenResponse.status 
      }, { status: 400 });
    }
    
    const tokenData = await tokenResponse.json();
    console.log("✅ Token obtenu");
    
    // Récupération des informations utilisateur
    const userResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`);
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("❌ Erreur données utilisateur:", errorText);
      return NextResponse.json({ 
        error: 'Erreur récupération utilisateur', 
        details: errorText 
      }, { status: 400 });
    }
    
    const userData = await userResponse.json();
    console.log("🎉 Utilisateur connecté:", userData.email);
    
    // Retour des données
    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        verified_email: userData.verified_email,
      },
      token: {
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
      }
    });
    
  } catch (error: any) {
    console.error("💥 Erreur API Google OAuth:", error);
    return NextResponse.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
}

// Fonction helper pour déterminer l'URL de redirection
function getRedirectUri(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}/photobooth-ia/admin/auth/callback`;
}