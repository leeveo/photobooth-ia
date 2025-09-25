import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de santé pour vérifier que les API routes fonctionnent
 */
export async function GET(request: NextRequest) {
  console.log("🏥 Health check called");
  
  const timestamp = new Date().toISOString();
  const host = request.headers.get('host');
  const userAgent = request.headers.get('user-agent');
  
  // Vérifier les variables d'environnement critiques
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    GOOGLE_CLIENT_ID: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    VERCEL: !!process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
  };
  
  return NextResponse.json({
    status: 'healthy',
    timestamp,
    environment: {
      host,
      userAgent,
      ...envCheck,
    },
    message: 'API routes are working'
  });
}

export async function POST(request: NextRequest) {
  console.log("🏥 Health check POST called");
  
  try {
    const body = await request.json();
    console.log("📝 POST body received:", body);
    
    return NextResponse.json({
      status: 'healthy',
      received: body,
      message: 'POST requests are working'
    });
  } catch (error: any) {
    console.error("❌ Health check POST error:", error);
    
    return NextResponse.json({
      status: 'error',
      error: error.message,
      message: 'POST request failed'
    }, { status: 500 });
  }
}