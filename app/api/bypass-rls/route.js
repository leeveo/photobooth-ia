import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Créer un client Supabase avec la clé de service qui ignore les RLS
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Variables d\'environnement Supabase manquantes');
    return null;
  }
  
  console.log('Création du client admin avec URL:', supabaseUrl, 'et clé de service (tronquée):', supabaseServiceKey.substring(0, 10) + '...');
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export async function POST(request) {
  try {
    console.log('API bypass-rls: Début du traitement');
    
    // Vérifier l'authentification (simple check de présence)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.log('API bypass-rls: Pas d\'en-tête d\'autorisation');
      return NextResponse.json({ 
        success: false, 
        message: 'Non autorisé' 
      }, { status: 401 });
    }
    
    // Log de l'en-tête d'autorisation (pour debug)
    console.log('En-tête d\'autorisation reçu:', authHeader.substring(0, 20) + '...');
    
    // Obtenir les données du body
    const requestData = await request.json();
    const { projectId, elements, stageSize } = requestData;
    
    console.log('API bypass-rls: Données reçues pour le projet:', projectId);
    
    if (!projectId || !elements || !stageSize) {
      console.log('API bypass-rls: Données incomplètes');
      return NextResponse.json({ 
        success: false, 
        message: 'Données incomplètes' 
      }, { status: 400 });
    }
    
    // Créer un client admin
    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      console.log('API bypass-rls: Échec de création du client admin');
      return NextResponse.json({ 
        success: false, 
        message: 'Erreur de connexion admin' 
      }, { status: 500 });
    }
    
    // Vérifier que le client admin est bien créé
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from('canvas_layouts')
        .select('count')
        .limit(1);
        
      if (testError) {
        console.error('Erreur de test du client admin:', testError);
        return NextResponse.json({ 
          success: false, 
          message: `Erreur de connexion admin: ${testError.message}`,
          error: testError
        }, { status: 500 });
      }
      
      console.log('Client admin vérifié avec succès');
    } catch (testError) {
      console.error('Exception lors du test du client admin:', testError);
      return NextResponse.json({ 
        success: false, 
        message: `Exception lors du test de connexion: ${testError.message}` 
      }, { status: 500 });
    }
    
    // Préparer les données
    const generatedName = `Layout_${new Date().toISOString().slice(0, 10)}`;
    const layoutData = {
      name: generatedName,
      elements: JSON.stringify(elements),
      stage_size: JSON.stringify(stageSize),
      project_id: projectId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('API bypass-rls: Vérification des layouts existants');
    
    // Vérifier si un layout existe déjà
    const { data: existingLayouts, error: queryError } = await supabaseAdmin
      .from('canvas_layouts')
      .select('id')
      .eq('project_id', projectId)
      .limit(1);
      
    if (queryError) {
      console.error('API bypass-rls: Erreur de requête:', queryError);
      return NextResponse.json({ 
        success: false, 
        message: `Erreur de requête: ${queryError.message}` 
      }, { status: 500 });
    }
    
    let result;
    
    if (existingLayouts && existingLayouts.length > 0) {
      // Mettre à jour le layout existant
      console.log('API bypass-rls: Mise à jour du layout:', existingLayouts[0].id);
      const { data, error } = await supabaseAdmin
        .from('canvas_layouts')
        .update({
          elements: layoutData.elements,
          stage_size: layoutData.stage_size,
          updated_at: layoutData.updated_at
        })
        .eq('id', existingLayouts[0].id)
        .select();
        
      if (error) {
        console.error('API bypass-rls: Erreur de mise à jour:', error);
        return NextResponse.json({ 
          success: false, 
          message: `Erreur de mise à jour: ${error.message}` 
        }, { status: 500 });
      }
      
      result = data[0];
      console.log('API bypass-rls: Layout mis à jour avec succès');
    } else {
      // Créer un nouveau layout
      console.log('API bypass-rls: Création d\'un nouveau layout');
      const { data, error } = await supabaseAdmin
        .from('canvas_layouts')
        .insert(layoutData)
        .select();
        
      if (error) {
        console.error('API bypass-rls: Erreur d\'insertion:', error);
        return NextResponse.json({ 
          success: false, 
          message: `Erreur d'insertion: ${error.message}` 
        }, { status: 500 });
      }
      
      result = data[0];
      console.log('API bypass-rls: Nouveau layout créé avec succès');
    }
    
    console.log('API bypass-rls: Traitement terminé avec succès');
    return NextResponse.json({
      success: true,
      layout: result
    });
    
  } catch (error) {
    console.error('API bypass-rls: Erreur générale:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Erreur serveur: ${error.message}` 
    }, { status: 500 });
  }
}
