import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Fonction pour décoder un JWT sans le vérifier
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (error) {
    return { error: 'Invalid JWT format' };
  }
}

export async function POST(request) {
  try {
    console.log('🔍 API save-layout: Requête reçue');
    
    // Parse the JSON body from the request
    const body = await request.json();
    const { projectId, name, elements, stageSize, setAsDefault } = body;
    
    console.log('📦 Données reçues:', { 
      projectId, 
      name, 
      elementsCount: elements?.length || 0,
      hasStageSize: !!stageSize,
      setAsDefault 
    });
    
    // Validation
    if (!projectId || typeof projectId !== 'string') {
      console.error('❌ Erreur: projectId manquant ou invalide');
      return NextResponse.json({ error: 'Project ID is required and must be a string' }, { status: 400 });
    }
    
    if (!name || typeof name !== 'string') {
      console.error('❌ Erreur: name manquant ou invalide');
      return NextResponse.json({ error: 'Layout name is required and must be a string' }, { status: 400 });
    }
    
    if (!elements || !Array.isArray(elements) || elements.length === 0) {
      console.error('❌ Erreur: elements invalides', elements);
      return NextResponse.json({ error: 'Elements data is invalid or empty' }, { status: 400 });
    }
    
    if (!stageSize || typeof stageSize !== 'object') {
      console.error('❌ Erreur: stageSize manquant ou invalide', stageSize);
      return NextResponse.json({ error: 'Stage size data is invalid' }, { status: 400 });
    }
    
    // Récupérer les variables d'environnement
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    // MODIFICATION CRITIQUE: Utiliser la clé anonyme au lieu de la clé de service
    // qui semble avoir un problème persistant
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Loguer les valeurs des variables d'environnement (sans révéler la clé complète)
    console.log('🔑 Variables d\'environnement:');
    console.log('- URL:', supabaseUrl);
    console.log('- KEY prefix:', supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'null');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Variables d\'environnement manquantes');
      return NextResponse.json({ 
        error: 'Configuration Supabase incomplète', 
        detail: 'Variables d\'environnement manquantes'
      }, { status: 500 });
    }
    
    // Initialisation du client Supabase avec la clé anonyme
    console.log('🔌 Création du client Supabase avec la clé anonyme');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { 
        persistSession: false,
        autoRefreshToken: false
      }
    });
    
    // Test de connexion
    console.log('🧪 Test de connexion à Supabase...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .limit(1)
        .single();
      
      if (testError) {
        console.error('❌ Erreur de connexion:', testError);
        return NextResponse.json({ 
          error: 'Database connection error',
          details: testError.message,
          hint: testError.hint
        }, { status: 500 });
      }
      
      console.log('✅ Connexion OK, projet trouvé:', testData.id);
    } catch (connErr) {
      console.error('❌ Exception lors du test de connexion:', connErr);
      return NextResponse.json({ 
        error: 'Database connection exception',
        details: connErr.message
      }, { status: 500 });
    }
    
    // Préparation des données avec les structures simplifiées
    console.log('📦 Préparation des données...');
    // Prepare the data to insert
    console.log('💾 Préparation des données à insérer');
    
    // Modifier la manière dont on stocke les données
    // S'assurer que elements et stageSize sont stockés comme des chaînes JSON
    const layoutToInsert = {
      project_id: projectId,
      name: name,
      elements: typeof elements === 'string' ? elements : JSON.stringify(elements),
      stage_size: typeof stageSize === 'string' ? stageSize : JSON.stringify(stageSize),
      created_at: new Date().toISOString()
    };
    
    console.log('📄 Données à insérer:', {
      project_id: layoutToInsert.project_id,
      name: layoutToInsert.name,
      elementsType: typeof elements,
      stageSizeType: typeof stageSize
    });
    
    // Insertion dans la base de données
    console.log('💾 Insertion dans canvas_layouts...');
    let insertResult;
    try {
      const { data, error } = await supabase
        .from('canvas_layouts')
        .insert(layoutToInsert)
        .select();
      
      if (error) {
        console.error('❌ Erreur d\'insertion:', error);
        return NextResponse.json({ 
          error: 'Database error',
          details: error.message,
          hint: error.hint || 'Check table permissions and structure'
        }, { status: 500 });
      }
      
      insertResult = data;
      console.log('✅ Insertion réussie:', data);
    } catch (insertErr) {
      console.error('❌ Exception lors de l\'insertion:', insertErr);
      return NextResponse.json({ 
        error: 'Database insert exception',
        details: insertErr.message
      }, { status: 500 });
    }
    
    // Mise à jour du projet si nécessaire
    if (setAsDefault && insertResult && insertResult.length > 0) {
      console.log('🔄 Mise à jour du projet avec le layout par défaut...');
      try {
        const { error: updateError } = await supabase
          .from('projects')
          .update({ default_layout_id: insertResult[0].id })
          .eq('id', projectId);
        
        if (updateError) {
          console.error('⚠️ Erreur lors de la mise à jour du projet:', updateError);
          // Ne pas échouer complètement si seulement cette partie échoue
        } else {
          console.log('✅ Projet mis à jour avec succès');
        }
      } catch (updateErr) {
        console.error('⚠️ Exception lors de la mise à jour du projet:', updateErr);
        // Ne pas échouer complètement si seulement cette partie échoue
      }
    }
    
    // Récupérer tous les layouts du projet
    console.log('🔍 Récupération de tous les layouts du projet...');
    try {
      const { data: allLayouts, error: fetchError } = await supabase
        .from('canvas_layouts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error('⚠️ Erreur lors de la récupération des layouts:', fetchError);
        // Renvoyer uniquement le layout nouvellement créé
        return NextResponse.json({ 
          success: true, 
          data: insertResult[0], 
          allLayouts: insertResult 
        });
      }
      
      console.log(`✅ ${allLayouts.length} layouts récupérés`);
      
      return NextResponse.json({ 
        success: true, 
        data: insertResult[0], 
        allLayouts: allLayouts 
      });
    } catch (fetchErr) {
      console.error('⚠️ Exception lors de la récupération des layouts:', fetchErr);
      // Renvoyer uniquement le layout nouvellement créé
      return NextResponse.json({ 
        success: true, 
        data: insertResult[0], 
        allLayouts: insertResult 
      });
    }
    
  } catch (error) {
    console.error('💥 Exception générale:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
