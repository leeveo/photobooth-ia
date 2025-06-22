import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Créez un client Supabase avec les clés d'environnement serveur
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Utiliser la même clé que les autres routes
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(req: NextRequest) {
  try {
    // Récupérer les données de la requête
    const { projectId, name, imageUrl } = await req.json();

    if (!projectId || !name || !imageUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Informations manquantes' 
      }, { status: 400 });
    }

    console.log('Tentative d\'ajout d\'arrière-plan avec méthode alternative:', { projectId, name, imageUrl });
    
    // 1. Supprimer les arrière-plans existants pour ce projet (si nécessaire)
    const { error: deleteError } = await supabaseAdmin
      .from('backgrounds')
      .delete()
      .eq('project_id', projectId);
    
    if (deleteError) {
      console.error('Erreur lors de la suppression des arrière-plans existants:', deleteError);
      return NextResponse.json({ 
        success: false, 
        error: `Erreur lors de la suppression des arrière-plans existants: ${deleteError.message}` 
      }, { status: 500 });
    }
    
    // 2. Insérer le nouvel arrière-plan
    const { data: newBackground, error: insertError } = await supabaseAdmin
      .from('backgrounds')
      .insert({
        project_id: projectId,
        name: name,
        image_url: imageUrl,
        is_active: true
      })
      .select('*')
      .single();
    
    if (insertError) {
      console.error('Erreur lors de l\'insertion du nouvel arrière-plan:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: `Erreur lors de l'insertion du nouvel arrière-plan: ${insertError.message}` 
      }, { status: 500 });
    }
    
    console.log('Arrière-plan ajouté avec succès (méthode alternative):', newBackground);
    
    return NextResponse.json({ 
      success: true, 
      data: newBackground 
    });
    
  } catch (error: any) {
    console.error('Erreur générale lors de l\'ajout d\'arrière-plan:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Erreur lors de l'ajout de l'arrière-plan: ${error.message}` 
    }, { status: 500 });
  }
}
