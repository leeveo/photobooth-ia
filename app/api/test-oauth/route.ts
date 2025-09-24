import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log("🔍 API Test OAuth appelée");
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    google_client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'PRÉSENT' : 'MANQUANT',
    google_client_secret: process.env.GOOGLE_CLIENT_SECRET ? 'PRÉSENT' : 'MANQUANT',
    google_client_secret_length: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
    all_env_vars: Object.keys(process.env).filter(key => key.includes('GOOGLE')),
  };
  
  console.log("📊 Diagnostics OAuth:", diagnostics);
  
  return NextResponse.json({
    message: 'Test OAuth API Route',
    diagnostics,
    status: 'OK'
  });
}