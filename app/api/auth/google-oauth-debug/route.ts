import { NextRequest, NextResponse } from 'next/server';

// Marquer comme dynamique pour éviter l'erreur de rendu statique  
export const dynamic = 'force-dynamic';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, redirect_uri } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Code d\'autorisation manquant' }, 
        { status: 400 }
      );
    }

    const tokenParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID || '',
      client_secret: GOOGLE_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri,
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return NextResponse.json(
        { error: 'Erreur lors de l\'échange du token', details: errorText }, 
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    const userResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`,
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      }
    );

    if (!userResponse.ok) {
      const userErrorText = await userResponse.text();
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des données utilisateur', details: userErrorText }, 
        { status: 400 }
      );
    }

    const userData = await userResponse.json();

    return NextResponse.json({
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
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erreur serveur interne', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}