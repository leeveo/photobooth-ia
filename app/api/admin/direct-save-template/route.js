import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('API direct-save-template: Démarrage du processus de sauvegarde directe');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Erreur d\'authentification:', authError);
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    // Récupérer les données du template
    const data = await request.json();
    const { name, description, category, elements, stage_size, is_public } = data;
    
    // Validation basique
    if (!name) {
      return NextResponse.json({ error: 'Le nom du template est requis' }, { status: 400 });
    }
    
    if (!elements || !Array.isArray(elements) || elements.length === 0) {
      return NextResponse.json({ error: 'Au moins un élément est requis' }, { status: 400 });
    }
    
    // Exécuter une requête SQL directe
    const { data: result, error: sqlError } = await supabase.rpc('insert_layout_template', {
      p_name: name,
      p_layout_name: name,
      p_description: description || null,
      p_category: category || null,
      p_elements: JSON.stringify(elements),
      p_stage_size: JSON.stringify(stage_size),
      p_is_public: is_public !== undefined ? is_public : true,
      p_created_by: user.id
    });
    
    if (sqlError) {
      console.error('Erreur SQL lors de l\'insertion:', sqlError);
      return NextResponse.json({ 
        error: `Erreur SQL: ${sqlError.message}`,
        details: sqlError
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Template créé avec succès via SQL direct', 
      data: result
    });
    
  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ 
      error: `Erreur serveur: ${error.message}`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
