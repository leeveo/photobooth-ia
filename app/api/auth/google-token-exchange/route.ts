import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  console.log("🔄 API Token Exchange démarrée");
  
  try {
    const { code, redirect_uri } = await request.json();

    console.log("📝 Code reçu:", code ? `${code.substring(0, 20)}...` : 'AUCUN');
    console.log("🔗 Redirect URI:", redirect_uri);

    if (!code) {
      console.error("❌ Code manquant");
      return NextResponse.json({ error: 'Code manquant' }, { status: 400 });
    }

    console.log("🔑 Client ID:", GOOGLE_CLIENT_ID ? 'PRÉSENT' : 'MANQUANT');
    console.log("🔐 Client Secret:", GOOGLE_CLIENT_SECRET ? 'PRÉSENT' : 'MANQUANT');

    const tokenParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID || '',
      client_secret: GOOGLE_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri,
    });

    console.log("🚀 Appel à Google...");

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    });

    console.log("📡 Réponse Google:", tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ Erreur Google:", errorText);
      return NextResponse.json({ error: 'Échec échange token', details: errorText }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    console.log("✅ Token obtenu");

    return NextResponse.json({
      success: true,
      access_token: tokenData.access_token
    });

  } catch (error) {
    console.error("💥 Erreur API:", error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}