import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function DELETE(request) {
  try {
    // Récupérer les données de la requête
    const { projectId, imageUrl } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: 'ID du projet manquant'
      }, { status: 400 });
    }
    
    console.log('Tentative de suppression des arrière-plans pour le projet:', projectId);
    
    // Créer un client Supabase qui utilise la session de l'utilisateur actuel
    const supabase = createRouteHandlerClient({ cookies });
    
    // Supprimer les arrière-plans existants
    const { error: deleteError } = await supabase
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
    
    // Si une nouvelle URL d'image est fournie, ajouter le nouvel arrière-plan
    if (imageUrl) {
      const { data: newBackground, error: insertError } = await supabase
        .from('backgrounds')
        .insert({
          project_id: projectId,
          name: 'Background',  // Vous pouvez passer le nom en paramètre aussi
          image_url: imageUrl,
          is_active: true
        })
        .select('*')
        .single();
      
      if (insertError) {
        console.error('Erreur lors de l\'ajout du nouvel arrière-plan:', insertError);
        return NextResponse.json({
          success: false,
          error: `Erreur lors de l'ajout: ${insertError.message}`
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        data: newBackground,
        message: 'Arrière-plan remplacé avec succès'
      });
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
    
    // Créer un client Supabase qui utilise la session de l'utilisateur actuel
    const supabase = createRouteHandlerClient({ cookies });
    
    // Ajouter le nouvel arrière-plan
    const { data: newBackground, error: insertError } = await supabase
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
