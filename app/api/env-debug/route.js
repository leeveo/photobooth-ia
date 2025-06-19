import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  // SÉCURITÉ: Ne PAS exposer les clés complètes en production
  // Cette route est uniquement pour le débogage
  
  try {
    // Vérifier si les variables d'environnement existent
    const envStatus = {
      // Supabase
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
        `Longueur: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length}`,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY && 
        `Longueur: ${process.env.SUPABASE_SERVICE_ROLE_KEY.length}`,
      
      // AWS
      AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY && 
        `Commence par: ${process.env.AWS_SECRET_ACCESS_KEY.substring(0, 4)}...`,
      AWS_REGION: process.env.AWS_REGION,
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    };
    
    // Tester la connexion Supabase
    let supabaseTestResult = "Non testé";
    
    try {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      
      // Tenter une requête simple
      const { data, error } = await supabaseAdmin
        .from('projects')
        .select('id')
        .limit(1);
        
      if (error) {
        supabaseTestResult = `Erreur: ${error.message}`;
      } else {
        supabaseTestResult = `Succès! ${data.length} projets trouvés.`;
      }
    } catch (supabaseError) {
      supabaseTestResult = `Exception: ${supabaseError.message}`;
    }
    
    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV,
      envVariablesPresent: envStatus,
      supabaseTest: supabaseTestResult
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
