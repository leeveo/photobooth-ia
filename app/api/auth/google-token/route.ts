import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log("🔍 API Google Token - Test GET");
  
  // Vérification des variables d'environnement
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  
  return NextResponse.json({
    message: "API Google Token Exchange - Test",
    status: "active",
    config: {
      client_id_exists: !!CLIENT_ID,
      client_id_preview: CLIENT_ID ? CLIENT_ID.substring(0, 20) + "..." : "non configuré",
      client_secret_exists: !!CLIENT_SECRET,
      client_secret_preview: CLIENT_SECRET ? CLIENT_SECRET.substring(0, 10) + "..." : "non configuré"
    },
    usage: "POST avec { code, redirectUri } pour échanger un code OAuth"
  });
}

export async function POST(request: NextRequest) {
  console.log("🔐 API Google Token Exchange appelée");
  
  // ⚡ Configuration timeout optimisée pour Vercel
  const TIMEOUT_MS = 8000; // 8 secondes max pour éviter timeout Vercel
  
  try {
    const { code, redirectUri } = await request.json();
    
    if (!code || !redirectUri) {
      console.log("❌ Code ou redirectUri manquant");
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }
    
    // Configuration OAuth depuis les variables d'environnement
    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.log("❌ Configuration OAuth incomplète");
      return NextResponse.json({ error: 'Configuration OAuth manquante' }, { status: 500 });
    }
    
    console.log("✅ Configuration OAuth disponible");
    
    // Échange du code pour un token (côté serveur sécurisé)
    const tokenParams = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET, // Sécurisé côté serveur
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    
    console.log("🔗 Échange du code pour un token avec Google...");
    
    // ⚡ Timeout controller pour éviter les timeouts Vercel
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
      signal: timeoutController.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log("❌ Erreur lors de l'échange du token:", errorText);
      return NextResponse.json({ error: 'Échec échange token', details: errorText }, { status: 400 });
    }
    
    const tokenData = await tokenResponse.json();
    console.log("✅ Token obtenu avec succès");
    
    // Récupération des données utilisateur avec timeout
    console.log("👤 Récupération des données utilisateur...");
    
    const userTimeoutController = new AbortController();
    const userTimeoutId = setTimeout(() => userTimeoutController.abort(), TIMEOUT_MS - 2000); // 6 secondes
    
    const userResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`, {
      signal: userTimeoutController.signal
    });
    
    clearTimeout(userTimeoutId);
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.log("❌ Erreur récupération utilisateur:", errorText);
      return NextResponse.json({ error: 'Échec récupération utilisateur', details: errorText }, { status: 400 });
    }
    
    const userData = await userResponse.json();
    console.log("🎉 Données utilisateur récupérées:", userData.email);
    
    // Retour des données utilisateur sécurisées
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
        expires_in: tokenData.expires_in
      }
    });
    
  } catch (error: any) {
    console.error("💥 Erreur API Google Token:", error);
    
    // Gestion spécifique des timeouts
    if (error.name === 'AbortError') {
      console.log("⏱️ Timeout détecté lors de l'échange OAuth");
      return NextResponse.json({ 
        error: 'Timeout OAuth', 
        message: 'Délai dépassé lors de l\'échange avec Google',
        timeout: true 
      }, { status: 408 });
    }
    
    return NextResponse.json({ 
      error: 'Erreur serveur', 
      details: error instanceof Error ? error.message : 'Erreur inconnue' 
    }, { status: 500 });
  }
}