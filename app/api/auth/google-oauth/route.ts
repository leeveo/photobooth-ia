import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '../../../../lib/supabaseClient';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { code, redirect_uri } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Code d\'autorisation manquant' }, 
        { status: 400 }
      );
    }

    // Échanger le code contre un access token
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
      console.error('Erreur token Google:', error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'échange du token' }, 
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    // Récupérer les informations utilisateur
    const userResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`
    );

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des données utilisateur' }, 
        { status: 400 }
      );
    }

    const userData = await userResponse.json();

    // Créer/connecter l'utilisateur admin via notre fonction RPC custom
    const supabase = createSupabaseClient();
    
    const { data: adminData, error: adminError } = await supabase.rpc(
      'handle_custom_google_oauth',
      {
        google_user_id: userData.id,
        google_email: userData.email,
        google_name: userData.name || '',
        access_token: tokenData.access_token
      }
    );

    if (adminError) {
      console.error('Erreur RPC custom OAuth:', adminError);
      return NextResponse.json(
        { error: `Erreur base de données: ${adminError.message}` }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      adminData,
      userData: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture
      }
    });

  } catch (error) {
    console.error('Erreur API Google OAuth:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' }, 
      { status: 500 }
    );
  }
}