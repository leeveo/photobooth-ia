import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Créer un client Supabase admin qui bypass les politiques RLS
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

export async function DELETE(request) {
  try {
    // Récupérer les données de la requête
    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: 'ID du projet manquant'
      }, { status: 400 });
    }
    
    console.log('Suppression des arrière-plans pour le projet:', projectId);
    
    // Utiliser le client admin au lieu du client utilisateur
    const { error: deleteError } = await supabaseAdmin
      .from('backgrounds')
      .delete()
      .eq('project_id', projectId);
    
    if (deleteError) {
      console.error('Erreur lors de la suppression des arrière-plans:', deleteError);
      return NextResponse.json({
        success: false,
        error: `Erreur lors de la suppression: ${deleteError.message}`
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Arrière-plans supprimés avec succès'
    });
    
  } catch (error) {
    console.error('Erreur générale:', error);
    return NextResponse.json({
      success: false,
      error: `Erreur serveur: ${error.message}`
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Récupérer les données de la requête
    const { projectId, name, imageUrl } = await request.json();
    
    if (!projectId || !imageUrl) {
      return NextResponse.json({
        success: false,
        error: 'Informations manquantes'
      }, { status: 400 });
    }
    
    console.log('Ajout d\'un arrière-plan pour le projet:', projectId);
    
    // Utiliser le client admin au lieu du client utilisateur
    const { data: newBackground, error: insertError } = await supabaseAdmin
      .from('backgrounds')
      .insert({
        project_id: projectId,
        name: name || 'Background',
        image_url: imageUrl,
        is_active: true
      })
      .select('*')
      .single();
    
    if (insertError) {
      console.error('Erreur lors de l\'ajout de l\'arrière-plan:', insertError);
      return NextResponse.json({
        success: false,
        error: `Erreur lors de l'ajout: ${insertError.message}`
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: newBackground
    });
    
  } catch (error) {
    console.error('Erreur générale:', error);
    return NextResponse.json({
      success: false,
      error: `Erreur serveur: ${error.message}`
    }, { status: 500 });
  }
}
