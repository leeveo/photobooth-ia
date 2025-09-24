import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 DEBUG OAUTH - Variables:', {
      hasClientId: !!GOOGLE_CLIENT_ID,
      hasClientSecret: !!GOOGLE_CLIENT_SECRET,
      clientIdStart: GOOGLE_CLIENT_ID?.slice(0, 20)
    });

    const body = await request.json();
    console.log('📝 Body reçu:', body);

    const { code, redirect_uri } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Code d\'autorisation manquant' }, 
        { status: 400 }
      );
    }

    console.log('🔄 Échange du code...');
    console.log('🔗 Redirect URI:', redirect_uri);
    console.log('🆔 Client ID:', GOOGLE_CLIENT_ID?.slice(0, 30) + '...');

    const tokenParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID || '',
      client_secret: GOOGLE_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri,
    });

    console.log('📤 Envoi vers Google:', tokenParams.toString());

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    });

    console.log('📡 Réponse Google Token:', tokenResponse.status, tokenResponse.statusText);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Erreur détaillée Google:', errorText);
      return NextResponse.json(
        { error: 'Erreur lors de l\'échange du token', details: errorText }, 
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Token reçu:', { 
      access_token: tokenData.access_token?.slice(0, 20) + '...',
      token_type: tokenData.token_type 
    });

    // Récupérer les informations utilisateur
    console.log('👤 Récupération des données utilisateur...');
    const userResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`,
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      }
    );

    console.log('👤 Réponse User Info:', userResponse.status, userResponse.statusText);

    if (!userResponse.ok) {
      const userErrorText = await userResponse.text();
      console.error('❌ Erreur User Info:', userErrorText);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des données utilisateur', details: userErrorText }, 
        { status: 400 }
      );
    }

    const userData = await userResponse.json();
    console.log('✅ Données utilisateur:', { 
      id: userData.id,
      email: userData.email, 
      name: userData.name,
      verified_email: userData.verified_email 
    });

    // Retourner directement sans passer par Supabase RPC
    const responseData = {
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
    };

    console.log('🎉 Succès final:', responseData);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Erreur API OAuth DEBUG:', error);
    console.error('❌ Stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json(
      { 
        error: 'Erreur serveur interne', 
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}