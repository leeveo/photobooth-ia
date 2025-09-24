import { NextRequest, NextResponse } from 'next/server';

// Marquer comme dynamique pour éviter l'erreur de rendu statique  
export const dynamic = 'force-dynamic';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  console.log("🔄 Début API OAuth google-oauth-debug");
  
  try {
    const body = await request.json();
    const { code, redirect_uri } = body;
    
    console.log("📝 Code reçu:", code ? `${code.substring(0, 20)}...` : 'AUCUN');
    console.log("🔗 Redirect URI:", redirect_uri);

    if (!code) {
      console.error("❌ Code d'autorisation manquant");
      return NextResponse.json(
        { error: 'Code d\'autorisation manquant' }, 
        { status: 400 }
      );
    }

    console.log("🔑 Google Client ID:", GOOGLE_CLIENT_ID ? 'PRÉSENT' : 'MANQUANT');
    console.log("🔐 Google Client Secret:", GOOGLE_CLIENT_SECRET ? 'PRÉSENT' : 'MANQUANT');

    const tokenParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID || '',
      client_secret: GOOGLE_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri,
    });
    
    console.log("🚀 Échange de token avec Google...");

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    });

    console.log("📡 Réponse token Google:", tokenResponse.status, tokenResponse.statusText);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ Erreur échange token:", errorText);
      return NextResponse.json(
        { error: 'Erreur lors de l\'échange du token', details: errorText }, 
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("✅ Token reçu:", tokenData.access_token ? 'PRÉSENT' : 'MANQUANT');

    const userResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`,
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      }
    );

    console.log("👤 Réponse user Google:", userResponse.status, userResponse.statusText);

    if (!userResponse.ok) {
      const userErrorText = await userResponse.text();
      console.error("❌ Erreur données utilisateur:", userErrorText);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des données utilisateur', details: userErrorText }, 
        { status: 400 }
      );
    }

    const userData = await userResponse.json();
    console.log("✅ Données utilisateur récupérées:", userData.email);

    const result = {
      success: true,
      adminData: {
        success: true,
        user_id: userData.id,
        email: userData.email,
        company_name: userData.name || 'Google User',
        message: 'OAuth debug réussi'
      },
      userData: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture
      }
    };

    console.log("🎉 API OAuth complète avec succès");
    return NextResponse.json(result);

  } catch (error) {
    console.error("💥 Erreur générale API OAuth:", error);
    return NextResponse.json(
      { 
        error: 'Erreur serveur interne', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}