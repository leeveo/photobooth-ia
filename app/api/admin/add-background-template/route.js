import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create service role client that bypasses RLS
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

export async function POST(request) {
  try {
    console.log('Template background API called');

    const { projectId, templateData } = await request.json();

    if (!projectId || !templateData) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    console.log('Adding template for project:', projectId);
    console.log('Template data:', templateData);

    // First, delete existing backgrounds for this project using service role
    const { error: deleteError } = await supabaseAdmin
      .from('backgrounds')
      .delete()
      .eq('project_id', projectId);

    if (deleteError) {
      console.error('Error deleting existing backgrounds:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression des arrière-plans existants' },
        { status: 500 }
      );
    }

    console.log('Existing backgrounds deleted successfully');

    // Insert the new background from template using service role
    const { data: newBackground, error: insertError } = await supabaseAdmin
      .from('backgrounds')
      .insert({
        project_id: projectId,
        name: templateData.name || 'Template Background',
        image_url: templateData.url || templateData.path,
        storage_path: null,
        is_active: true,
        created_by: null // Service role doesn't have a user context
      })
      .select();

    if (insertError) {
      console.error('Error inserting background:', insertError);
      return NextResponse.json(
        { error: `Erreur lors de l'ajout: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log('Background inserted successfully:', newBackground);

    // Return the new backgrounds for this project
    const { data: backgrounds, error: fetchError } = await supabaseAdmin
      .from('backgrounds')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching backgrounds:', fetchError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des arrière-plans' },
        { status: 500 }
      );
    }



    console.log('Returning backgrounds:', backgrounds);

    return NextResponse.json({ data: backgrounds || [] });

  } catch (error) {
    console.error('Template background API error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
