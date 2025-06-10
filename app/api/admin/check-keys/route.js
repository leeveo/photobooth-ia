import { NextResponse } from 'next/server';

// Fonction pour décoder un JWT sans le vérifier
function decodeJwt(token) {
  try {
    // Split le token en ses 3 parties et prend la deuxième partie (payload)
    const base64Url = token.split('.')[1];
    // Convertit la base64url en base64 standard
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    // Décode en UTF-8
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    // Parse le JSON
    return JSON.parse(jsonPayload);
  } catch (error) {
    return { error: 'Invalid JWT format' };
  }
}

export async function GET() {
  try {
    // Récupérer les variables d'environnement
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Détecter les problèmes potentiels
    const problems = [];
    
    if (!supabaseUrl) {
      problems.push('NEXT_PUBLIC_SUPABASE_URL is missing');
    }
    
    if (!supabaseKey) {
      problems.push('SUPABASE_SERVICE_ROLE_KEY is missing');
    }
    
    // Vérifier le contenu de la clé JWT
    let jwtPayload = null;
    let jwtRole = null;
    
    if (supabaseKey) {
      jwtPayload = decodeJwt(supabaseKey);
      jwtRole = jwtPayload?.role || jwtPayload?.rose || null;
      
      if (!jwtRole) {
        problems.push('JWT does not contain "role" or "rose" field');
      } else if (jwtRole !== 'service_role') {
        problems.push(`JWT contains incorrect role: "${jwtRole}" instead of "service_role"`);
      }
    }
    
    // Retourner les informations de diagnostic
    return NextResponse.json({
      status: problems.length === 0 ? 'ok' : 'error',
      environment: process.env.NODE_ENV,
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : null,
      serviceKeyPrefix: supabaseKey ? `${supabaseKey.substring(0, 10)}...` : null,
      jwtPayload: jwtPayload ? {
        iss: jwtPayload.iss,
        ref: jwtPayload.ref,
        role: jwtRole,
        // Masquer les autres informations sensibles
      } : null,
      problems
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error.message
    }, { status: 500 });
  }
}
