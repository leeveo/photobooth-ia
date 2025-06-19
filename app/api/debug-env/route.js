import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Vérifier les variables d'environnement
    const envInfo = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'manquant',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
        `Présent (${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}...)` : 'manquant',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
        `Présent (${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...)` : 'manquant',
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'manquant',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'Présent' : 'manquant',
      AWS_REGION: process.env.AWS_REGION || 'manquant',
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'manquant'
    };

    // Tester la connexion Supabase avec la clé de service
    let supabaseTest = 'Non testé';
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        
        const { data, error } = await supabaseAdmin
          .from('projects')
          .select('count')
          .limit(1);
          
        if (error) throw error;
        
        supabaseTest = `Succès! La connexion avec la clé de service fonctionne.`;
      }
    } catch (error) {
      supabaseTest = `Erreur: ${error.message}`;
    }

    return NextResponse.json({
      success: true,
      environment: envInfo,
      supabaseTest
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: `Erreur: ${error.message}` 
    }, { status: 500 });
  }
}
