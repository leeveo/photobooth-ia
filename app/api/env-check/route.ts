import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Récupérer l'URL pour vérifier l'environnement
  const url = request.nextUrl;
  const isProduction = url.hostname !== 'localhost';
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    hostname: url.hostname,
    environment: process.env.NODE_ENV || 'unknown',
    vercel_env: process.env.VERCEL_ENV || 'local',
    is_production: isProduction,
    
    // Variables Google OAuth
    google_client_id_exists: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    google_client_id_value: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'UNDEFINED',
    google_client_secret_exists: !!process.env.GOOGLE_CLIENT_SECRET,
    google_client_secret_length: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
    google_client_secret_preview: process.env.GOOGLE_CLIENT_SECRET 
      ? `${process.env.GOOGLE_CLIENT_SECRET.substring(0, 10)}...` 
      : 'UNDEFINED',
    
    // Toutes les variables Google
    google_env_vars: Object.keys(process.env).filter(key => key.includes('GOOGLE')),
    
    // Variables Vercel
    vercel_vars: Object.keys(process.env).filter(key => key.startsWith('VERCEL_')),
    
    // Total des variables d'environnement
    total_env_vars: Object.keys(process.env).length
  };
  
  console.log("📊 Diagnostics environnement complets:", diagnostics);
  
  return NextResponse.json({
    message: 'Diagnostic Environnement OAuth',
    diagnostics,
    status: 'OK',
    recommendations: isProduction ? [
      'Vérifiez que GOOGLE_CLIENT_SECRET est configuré dans Vercel Dashboard',
      'Allez sur https://vercel.com/dashboard/[project]/settings/environment-variables',
      'Ajoutez GOOGLE_CLIENT_SECRET avec la valeur: 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',
      'Cochez Production, Preview et Development',
      'Redéployez après ajout'
    ] : [
      'Configuration locale OK',
      'Les variables sont chargées depuis .env.local',
      'Testez maintenant sur https://photobooth.waibooth.app/api/env-check'
    ]
  });
}