import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const requestData = await request.json();
    const { projectId } = requestData;
    
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'ID de projet manquant' }, { status: 400 });
    }
    
    console.log(`Suppression du projet ${projectId} via l'API serveur`);
    
    // Créer un client supabase côté serveur
    const supabase = createRouteHandlerClient({ cookies });
    
    // 1. Vérifier que le projet existe
    const { data: project, error: checkError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
      
    if (checkError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Projet non trouvé',
        details: checkError
      }, { status: 404 });
    }
    
    console.log(`Projet trouvé: ${project.name} (${projectId})`);
    
    // 2. Identification de toutes les références potentielles
    // Suppression des relations en cascade dans un ordre précis

    // 2.1 Supprimer d'abord les styles
    const { error: stylesError } = await supabase
      .from('styles')
      .delete()
      .eq('project_id', projectId);
    
    if (stylesError) {
      console.warn('Erreur lors de la suppression des styles:', stylesError);
    }
    
    // 2.2 Supprimer les arrière-plans
    const { error: backgroundsError } = await supabase
      .from('backgrounds')
      .delete()
      .eq('project_id', projectId);
    
    if (backgroundsError) {
      console.warn('Erreur lors de la suppression des arrière-plans:', backgroundsError);
    }
    
    // 2.3 Supprimer les paramètres du projet
    const { error: settingsError } = await supabase
      .from('project_settings')
      .delete()
      .eq('project_id', projectId);
    
    if (settingsError) {
      console.warn('Erreur lors de la suppression des paramètres:', settingsError);
    }

    // 2.4 Rechercher d'autres tables qui pourraient référencer ce projet
    // Supprimer ces relations aussi (ajouter selon votre schéma)
    try {
      // Essayer de supprimer les sessions associées si la table existe
      await supabase.from('sessions').delete().eq('project_id', projectId);
    } catch (e) {
      // Ignorer si la table n'existe pas
    }

    try {
      // Essayer de supprimer les photos associées si la table existe
      await supabase.from('photos').delete().eq('project_id', projectId);
    } catch (e) {
      // Ignorer si la table n'existe pas
    }
    
    // 3. Supprimer le projet lui-même avec des tentatives multiples
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Tentative ${attempt} de suppression du projet ${projectId}`);
      
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (!deleteError) {
        // Vérifier que le projet a bien été supprimé
        const { data: checkProject } = await supabase
          .from('projects')
          .select('id')
          .eq('id', projectId);
        
        if (!checkProject || checkProject.length === 0) {
          console.log(`Projet ${projectId} supprimé avec succès à la tentative ${attempt}`);
          return NextResponse.json({ 
            success: true, 
            message: `Projet ${project.name} supprimé avec succès`
          });
        }
      } else {
        console.warn(`Échec de la tentative ${attempt}:`, deleteError);
      }
      
      // Attendre un peu avant de réessayer
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 4. Approche plus agressive - suppression directe via requête RPC
    // En dernier recours, utiliser une requête SQL personnalisée
    try {
      const { data, error: rpcError } = await supabase.rpc('force_delete_project', { 
        project_id_param: projectId 
      });
      
      if (!rpcError) {
        console.log(`Suppression forcée réussie via RPC`);
        return NextResponse.json({ 
          success: true, 
          message: `Projet ${project.name} supprimé avec succès (suppression forcée)`
        });
      } else {
        console.error('Erreur lors de la suppression forcée:', rpcError);
      }
    } catch (rpcErr) {
      console.warn('Fonction RPC non disponible:', rpcErr);
    }

    // 5. Vérification finale
    const { data: finalCheck } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId);
    
    if (finalCheck && finalCheck.length > 0) {
      console.error(`Le projet ${projectId} existe toujours après suppression!`);
      return NextResponse.json({ 
        success: false, 
        error: 'Le projet existe toujours après la tentative de suppression',
        suggestion: 'Vérifiez les contraintes référentielles dans votre base de données'
      }, { status: 500 });
    }
    
    // Si on arrive ici, le projet n'existe plus mais on n'a pas détecté le succès
    return NextResponse.json({ 
      success: true, 
      message: `Projet ${project.name} probablement supprimé (non détecté)`
    });
    
  } catch (error) {
    console.error('Erreur serveur lors de la suppression du projet:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur interne du serveur',
      details: error.message
    }, { status: 500 });
  }
}
