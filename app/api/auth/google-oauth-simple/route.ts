import { NextRequest, NextResponse } from 'next/server';

// Marquer comme dynamique pour éviter l'erreur de rendu statique
export const dynamic = 'force-dynamic';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { code, redirect_uri } = await request.json();
    
    console.log('🚀 OAuth Simple - Début');
    console.log('📝 Code reçu:', code?.slice(0, 20) + '...');
    console.log('🔗 Redirect URI:', redirect_uri);

    if (!code) {
      return NextResponse.json(
        { error: 'Code d\'autorisation manquant' }, 
        { status: 400 }
      );
    }

    // Échanger le code contre un access token
    console.log('🔄 Échange du code...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID || '',
        client_secret: GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('❌ Erreur token Google:', error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'échange du token' }, 
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Token reçu');

    // Récupérer les informations utilisateur
    console.log('👤 Récupération des données utilisateur...');
    const userResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`
    );

    if (!userResponse.ok) {
      console.error('❌ Erreur données utilisateur');
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des données utilisateur' }, 
        { status: 400 }
      );
    }

    const userData = await userResponse.json();
    console.log('✅ Données utilisateur:', { email: userData.email, name: userData.name });

    // Retourner directement sans passer par Supabase RPC
    return NextResponse.json({
      success: true,
      adminData: {
        success: true,
        user_id: userData.id,
        email: userData.email,
        company_name: userData.name || 'Google User',
        message: 'OAuth simple réussi'
      },
      userData: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture
      }
    });

  } catch (error) {
    console.error('❌ Erreur API OAuth Simple:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' }, 
      { status: 500 }
    );
  }
}