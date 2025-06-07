import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    // Get the request body
    const body = await request.json();
    const { projectId, name, imageUrl } = body;

    // Validate inputs
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // First, deactivate all existing backgrounds for this project
    const { error: deactivateError } = await supabase
      .from('backgrounds')
      .update({ is_active: false })
      .eq('project_id', projectId);
    
    if (deactivateError) {
      console.error('Error deactivating existing backgrounds:', deactivateError);
      return NextResponse.json({ error: deactivateError.message }, { status: 500 });
    }

    // Add the background to the database with the service role
    const { data, error } = await supabase
      .from('backgrounds')
      .insert({
        project_id: projectId,
        name: name || 'Arrière-plan',
        image_url: imageUrl,
        is_active: true
      })
      .select();

    if (error) {
      console.error('Error inserting background:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error in add-background-from-url route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
