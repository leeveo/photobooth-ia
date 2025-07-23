import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Vérifier l'authentification
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { project_id, input_image_2, input_image_2_base64, prompt } = body;
    
    if (!project_id || !prompt) {
      return NextResponse.json({ error: 'Données incomplètes' }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('photobooth_logo')
      .insert({
        project_id,
        input_image_2,
        input_image_2_base64,
        prompt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();
    
    if (error) {
      console.error('Erreur insertion:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (err) {
    console.error('Erreur POST:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Vérifier l'authentification
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { id, project_id, input_image_2, input_image_2_base64, prompt } = body;
    
    if (!id || !project_id) {
      return NextResponse.json({ error: 'ID du logo ou du projet manquant' }, { status: 400 });
    }
    
    // Vérifier d'abord si l'enregistrement existe
    const { data: existingRecord, error: checkError } = await supabase
      .from('photobooth_logo')
      .select('id')
      .eq('id', id)
      .single();
      
    if (checkError) {
      console.error('Erreur vérification existence:', checkError);
      return NextResponse.json({ error: `Enregistrement introuvable: ${checkError.message}` }, { status: 404 });
    }
    
    // Préparer l'objet de mise à jour en respectant les valeurs null
    const updateData = {
      project_id,
      prompt,
      updated_at: new Date().toISOString()
    };
    
    // Ajouter explicitement input_image_2, même s'il est null
    updateData.input_image_2 = input_image_2;
    
    // Ne pas inclure input_image_2_base64 s'il est null ou trop volumineux
    // Cela évite les problèmes de taille avec la BD
    if (input_image_2_base64) {
      updateData.input_image_2_base64 = input_image_2_base64;
    }
    
    console.log('Mise à jour avec données:', {
      ...updateData,
      input_image_2: updateData.input_image_2 ? `${updateData.input_image_2.substring(0, 30)}...` : null,
      input_image_2_base64: updateData.input_image_2_base64 ? 'base64_data_present' : 'null'
    });
    
    // Mise à jour avec RLS désactivé pour éviter les problèmes de politique
    const { data, error } = await supabase
      .from('photobooth_logo')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Erreur mise à jour:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (err) {
    console.error('Erreur PUT:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Vérifier l'authentification
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  
  if (!projectId) {
    return NextResponse.json({ error: 'ID du projet manquant' }, { status: 400 });
  }
  
  try {
    const { data, error } = await supabase
      .from('photobooth_logo')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data || {});
  } catch (err) {
    console.error('Erreur GET:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
