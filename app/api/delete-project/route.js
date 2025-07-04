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
    
    // 1.0 Vérifier les sessions qui référencent ce projet
    const { data: projectSessions } = await supabase
      .from('sessions')
      .select('id, project_id, style_id')
      .eq('project_id', projectId);
    
    console.log(`Trouvé ${projectSessions?.length || 0} sessions qui référencent ce projet`);
    
    // 1.1 Tenter une approche directe avec une requête SQL personnalisée via RPC
    // Cette méthode est plus puissante car elle contourne les contraintes côté API
    try {
      console.log("Tentative de dissociation des sessions via SQL direct...");
      
      // Créer une fonction RPC si elle n'existe pas déjà
      // Note: cette fonction devrait être créée manuellement dans Supabase
      const { error: rpcError } = await supabase.rpc('dissociate_project_sessions', { 
        p_project_id: projectId 
      });
      
      if (!rpcError) {
        console.log("Sessions dissociées avec succès via SQL direct");
      } else {
        console.warn("Erreur lors de la dissociation RPC, utilisation de la méthode alternative:", rpcError);
        
        // Méthode alternative: essayer session par session
        if (projectSessions && projectSessions.length > 0) {
          console.log(`Dissociation manuelle de ${projectSessions.length} sessions...`);
          
          for (const session of projectSessions) {
            // Générer un ID unique pour le nom de la requête (évite les limitations de taux)
            const queryId = Math.random().toString(36).substring(2, 15);
            
            // Utiliser une requête SQL directe pour contourner les contraintes
            await supabase.rpc('execute_sql', {
              sql_query: `UPDATE sessions SET project_id = NULL, style_id = NULL WHERE id = '${session.id}'`
            });
            
            console.log(`Session ${session.id} dissociée manuellement`);
          }
        }
      }
    } catch (e) {
      console.warn("Erreur lors de la tentative RPC, fallback vers méthode standard:", e);
      
      // Si RPC échoue, essayer la méthode standard
      // 1.2 Mettre à NULL les références style_id dans toutes les sessions liées à ce projet
      console.log("Tentative standard - Mise à NULL des références style_id...");
      const { error: updateStylesError } = await supabase
        .from('sessions')
        .update({ style_id: null })
        .eq('project_id', projectId);
      
      if (updateStylesError) {
        console.warn("Erreur lors de la mise à NULL des style_id:", updateStylesError);
      }
      
      // 1.3 Mettre à NULL les références project_id
      console.log("Tentative standard - Mise à NULL des références project_id...");
      const { error: updateProjectError } = await supabase
        .from('sessions')
        .update({ project_id: null })
        .eq('project_id', projectId);
      
      if (updateProjectError) {
        console.warn("Erreur lors de la mise à NULL des project_id:", updateProjectError);
      }
    }
    
    // Vérifier que les références ont bien été supprimées
    const { data: checkSessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('project_id', projectId);
    
    if (checkSessions && checkSessions.length > 0) {
      console.warn(`ATTENTION: Il reste encore ${checkSessions.length} sessions liées au projet après tentative de dissociation`);
    } else {
      console.log("Vérification réussie: Aucune session ne référence plus le projet");
    }
    
    // Si les sessions sont toujours liées, on peut essayer une approche plus radicale
    if (checkSessions && checkSessions.length > 0) {
      console.log("Tentative d'approche RADICALE: Suppression des sessions problématiques");
      for (const session of checkSessions) {
        await supabase
          .from('sessions')
          .delete()
          .eq('id', session.id);
      }
      console.log("Sessions problématiques supprimées");
    }
    
    // Maintenant, on peut procéder à la suppression normale
    // 2.1 Supprimer d'abord les styles
    console.log("Suppression des styles...");
    const { error: stylesError } = await supabase
      .from('styles')
      .delete()
      .eq('project_id', projectId);
    
    if (stylesError) {
      console.warn('Erreur lors de la suppression des styles:', stylesError);
      
      // Si la suppression groupée échoue, essayer style par style
      const { data: projectStyles } = await supabase
        .from('styles')
        .select('id')
        .eq('project_id', projectId);
      
      if (projectStyles && projectStyles.length > 0) {
        console.log(`Tentative de suppression style par style (${projectStyles.length} styles)`);
        for (const style of projectStyles) {
          // Vérifier et dissocier les sessions liées à ce style
          await supabase
            .from('sessions')
            .update({ style_id: null })
            .eq('style_id', style.id);
          
          // Puis essayer de supprimer le style
          await supabase
            .from('styles')
            .delete()
            .eq('id', style.id);
        }
      }
    } else {
      console.log('Styles supprimés avec succès');
    }
    
    // 2.2 Supprimer les arrière-plans
    const { error: backgroundsError } = await supabase
      .from('backgrounds')
      .delete()
      .eq('project_id', projectId);
    
    if (backgroundsError) {
      console.warn('Erreur lors de la suppression des arrière-plans:', backgroundsError);
    } else {
      console.log('Arrière-plans supprimés avec succès');
    }
    
    // 2.3 Supprimer les paramètres du projet
    const { error: settingsError } = await supabase
      .from('project_settings')
      .delete()
      .eq('project_id', projectId);
    
    if (settingsError) {
      console.warn('Erreur lors de la suppression des paramètres:', settingsError);
    } else {
      console.log('Paramètres du projet supprimés avec succès');
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
    
    // 3. Supprimer le projet lui-même
    console.log("Suppression du projet principal...");
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
    
    if (deleteError) {
      console.warn('Erreur lors de la suppression du projet:', deleteError);
      
      // Vérifier s'il reste des sessions qui référencent ce projet
      const { data: finalSessions } = await supabase
        .from('sessions')
        .select('id, project_id')
        .eq('project_id', projectId);
      
      if (finalSessions && finalSessions.length > 0) {
        console.error(`Il reste encore ${finalSessions.length} sessions liées au projet!`);
        
        // Solution de dernier recours: forcer la suppression via SQL direct
        try {
          console.log("Tentative de force ULTIME: SQL direct pour supprimer le projet");
          await supabase.rpc('execute_sql', {
            sql_query: `DELETE FROM projects WHERE id = '${projectId}'`
          });
          console.log("Suppression forcée du projet tentée via SQL direct");
        } catch (e) {
          console.error("Échec de la suppression forcée:", e);
        }
      }
    } else {
      console.log("Projet supprimé avec succès!");
      return NextResponse.json({ 
        success: true, 
        message: `Projet ${project.name} supprimé avec succès`
      });
    }
    
    // Vérification finale
    const { data: finalCheck } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId);
    
    if (!finalCheck || finalCheck.length === 0) {
      console.log("Vérification finale: Le projet a bien été supprimé");
      return NextResponse.json({ 
        success: true, 
        message: `Projet ${project.name} supprimé avec succès (méthode alternative)`
      });
    }
    
    // Si on arrive ici, le projet n'a pas pu être supprimé
    return NextResponse.json({ 
      success: false, 
      error: 'Impossible de supprimer le projet',
      suggestion: 'Vous devrez peut-être exécuter le script SQL update-foreign-key.sql pour modifier les contraintes de la base de données'
    }, { status: 500 });
    
  } catch (error) {
    console.error('Erreur serveur lors de la suppression du projet:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur interne du serveur',
      details: error.message
    }, { status: 500 });
  }
}
