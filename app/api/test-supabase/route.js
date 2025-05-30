import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Récupérer les variables d'environnement
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Vérifier si les variables sont définies
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Variables d\'environnement Supabase manquantes',
        variables: {
          NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseKey,
          SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey
        }
      }, { status: 500 });
    }
    
    // Créer un client Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Tester la connexion
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .limit(5);
      
    if (error) {
      return NextResponse.json({
        error: 'Erreur lors de la connexion à Supabase',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Connexion à Supabase réussie',
      projectCount: data.length,
      projects: data
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error.message
    }, { status: 500 });
  }
}
