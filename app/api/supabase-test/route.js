import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Créer un client Supabase normal
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Créer un client admin
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Tester les accès avec le client normal
    const { data: normalData, error: normalError } = await supabaseClient
      .from('canvas_layouts')
      .select('count')
      .limit(1);
      
    // Tester les accès avec le client admin
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('canvas_layouts')
      .select('count')
      .limit(1);
      
    // Vérifier les variables d'environnement (valeurs tronquées pour la sécurité)
    const envInfo = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
        `Présent (${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}...)` : 'Manquant',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
        `Présent (${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...)` : 'Manquant',
      AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY
    };
    
    return NextResponse.json({
      normalAccess: {
        success: !normalError,
        error: normalError ? normalError.message : null,
        data: normalData
      },
      adminAccess: {
        success: !adminError,
        error: adminError ? adminError.message : null,
        data: adminData
      },
      environment: envInfo
    });
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
