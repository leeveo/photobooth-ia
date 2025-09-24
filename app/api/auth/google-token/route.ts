import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log("🔐 API Google Token Exchange appelée");
  
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
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log("❌ Erreur lors de l'échange du token:", errorText);
      return NextResponse.json({ error: 'Échec échange token', details: errorText }, { status: 400 });
    }
    
    const tokenData = await tokenResponse.json();
    console.log("✅ Token obtenu avec succès");
    
    // Récupération des données utilisateur
    console.log("👤 Récupération des données utilisateur...");
    const userResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`);
    
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
    
  } catch (error) {
    console.error("💥 Erreur API Google Token:", error);
    return NextResponse.json({ 
      error: 'Erreur serveur', 
      details: error instanceof Error ? error.message : 'Erreur inconnue' 
    }, { status: 500 });
  }
}