import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  console.log("🔄 API Token Exchange démarrée");
  console.log("🌐 Environment:", process.env.NODE_ENV);
  console.log("📍 Request URL:", request.url);
  console.log("🔧 Method:", request.method);
  
  try {
    const body = await request.json();
    const { code, redirect_uri } = body;
    console.log("📦 Request body keys:", Object.keys(body));

    console.log("📝 Code reçu:", code ? `${code.substring(0, 20)}...` : 'AUCUN');
    console.log("🔗 Redirect URI:", redirect_uri);

    if (!code) {
      console.error("❌ Code manquant");
      return NextResponse.json({ error: 'Code manquant' }, { status: 400 });
    }

    console.log("🔑 Client ID:", GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID?.substring(0, 20)}...` : 'MANQUANT');
    console.log("🔐 Client Secret:", GOOGLE_CLIENT_SECRET ? `${GOOGLE_CLIENT_SECRET?.substring(0, 10)}...` : 'MANQUANT');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("❌ Variables d'environnement manquantes");
      return NextResponse.json({ 
        error: 'Configuration manquante', 
        details: `ClientID: ${!!GOOGLE_CLIENT_ID}, ClientSecret: ${!!GOOGLE_CLIENT_SECRET}`
      }, { status: 500 });
    }

    const tokenParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID || '',
      client_secret: GOOGLE_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri,
    });

    console.log("🚀 Appel à Google...");
    console.log("📋 Token params:", {
      client_id: GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
      client_secret: GOOGLE_CLIENT_SECRET ? '***PRÉSENT***' : 'MANQUANT',
      code: code.substring(0, 20) + '...',
      grant_type: 'authorization_code',
      redirect_uri
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'PhotoBoothIA/1.0'
      },
      body: tokenParams,
    });

    console.log("📡 Réponse Google:", {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      ok: tokenResponse.ok,
      headers: Object.fromEntries(tokenResponse.headers.entries())
    });

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