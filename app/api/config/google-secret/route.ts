import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log("🔐 API Secret Google appelée");
  
  // Récupérer le secret depuis les variables d'environnement
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!secret) {
    console.log("❌ Google Client Secret non configuré");
    return NextResponse.json({ error: 'Secret non configuré' }, { status: 404 });
  }
  
  console.log("✅ Secret trouvé");
  return NextResponse.json({ 
    secret: secret,
    configured: true 
  });
}