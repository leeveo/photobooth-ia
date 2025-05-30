import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  try {
    // Vérifier l'authentification
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Récupérer l'ID du projet
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    // Récupérer les données du projet
    const { data, error } = await supabase
      .from('projects')
      .select('watermark_elements, watermark_enabled, name')
      .eq('id', projectId)
      .single();
    
    if (error) {
      console.error('Erreur lors de la récupération du projet:', error);
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });
    }
    
    // Analyser les éléments de filigrane
    let elements = [];
    if (data.watermark_elements) {
      try {
        elements = JSON.parse(data.watermark_elements);
        if (!Array.isArray(elements)) {
          elements = [];
        }
      } catch (e) {
        console.error('Erreur lors de l\'analyse des éléments de filigrane:', e);
        elements = [];
      }
    }
    
    return NextResponse.json({
      elements,
      enabled: data.watermark_enabled === true,
      projectName: data.name
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des éléments de filigrane:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  try {
    // Vérifier l'authentification
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Analyser les données du corps
    const body = await request.json();
    const { projectId, elements } = body;
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    if (!Array.isArray(elements)) {
      return NextResponse.json({ error: 'Invalid elements data' }, { status: 400 });
    }
    
    // Mettre à jour les éléments de filigrane du projet
    const { error } = await supabase
      .from('projects')
      .update({
        watermark_elements: JSON.stringify(elements),
        watermark_enabled: elements.length > 0
      })
      .eq('id', projectId);
    
    if (error) {
      console.error('Erreur lors de la mise à jour des éléments de filigrane:', error);
      return NextResponse.json({ 
        error: `Erreur lors de la mise à jour: ${error.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour des éléments de filigrane:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
