import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('API save-template: Début du processus de sauvegarde');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Erreur d\'authentification:', authError);
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    // Récupérer les données du template
    const data = await request.json();
    console.log('Données reçues pour le template:', {
      name: data.name,
      layout_name: data.layout_name || data.name, // Utiliser name comme fallback
      category: data.category,
      elementCount: data.elements?.length || 0,
      hasStageSize: !!data.stage_size
    });
    
    // Validation de base
    if (!data.name) {
      return NextResponse.json({ error: 'Le nom du template est requis' }, { status: 400 });
    }
    
    if (!data.elements || !Array.isArray(data.elements) || data.elements.length === 0) {
      return NextResponse.json({ error: 'Au moins un élément est requis' }, { status: 400 });
    }
    
    // Préparer les données pour l'insertion avec une structure claire
    const templateData = {
      name: data.name,
      layout_name: data.layout_name || data.name, // Assurer que layout_name est défini
      description: data.description || '',
      category: data.category || '',
      elements: data.elements,
      stage_size: data.stage_size,
      is_public: data.is_public === false ? false : true,
      created_by: user.id,
      created_at: new Date().toISOString()
    };
    
    console.log('Données structurées pour l\'insertion:', {
      name: templateData.name,
      layout_name: templateData.layout_name,
      category: templateData.category,
      elementCount: templateData.elements.length
    });
    
    // Utiliser un try/catch pour l'opération d'insertion
    try {
      const { data: insertedTemplate, error: insertError } = await supabase
        .from('layout_templates')
        .insert(templateData)
        .select();
      
      if (insertError) {
        console.error('Erreur lors de l\'insertion:', insertError);
        return NextResponse.json({ 
          error: `Erreur lors de la création du template: ${insertError.message}`,
          details: insertError
        }, { status: 500 });
      }
      
      if (!insertedTemplate || insertedTemplate.length === 0) {
        console.error('Aucune donnée retournée après insertion');
        return NextResponse.json({ 
          error: 'Erreur lors de la création du template: Aucune donnée retournée'
        }, { status: 500 });
      }
      
      console.log('Template créé avec succès, ID:', insertedTemplate[0].id);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Template créé avec succès', 
        data: insertedTemplate[0] 
      });
    } catch (insertErr) {
      console.error('Exception lors de l\'insertion:', insertErr);
      return NextResponse.json({ 
        error: `Exception lors de l'insertion: ${insertErr.message}`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Erreur serveur générale:', error);
    return NextResponse.json({ 
      error: `Erreur serveur: ${error.message}`
    }, { status: 500 });
  }
}
