import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Process the form data
    const formData = await request.formData();
    const file = formData.get('file');
    const projectId = formData.get('projectId');
    const name = formData.get('name') || 'Arrière-plan';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();
    const fileBlob = new Blob([fileBuffer]);
    
    // Create filename
    const fileExt = file.name.split('.').pop();
    const fileName = `upload_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
    const filePath = `templates/${fileName}`;

    // Create a Supabase client with the service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Upload the file to storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('backgrounds')
      .upload(filePath, fileBlob, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('backgrounds')
      .getPublicUrl(filePath);
    
    // First, deactivate all existing backgrounds for this project
    const { error: deactivateError } = await supabase
      .from('backgrounds')
      .update({ is_active: false })
      .eq('project_id', projectId);
    
    if (deactivateError) {
      console.error('Error deactivating existing backgrounds:', deactivateError);
      return NextResponse.json({ error: deactivateError.message }, { status: 500 });
    }
    
    // Add the new background to the database with the service role to bypass RLS
    const { data, error } = await supabase
      .from('backgrounds')
      .insert({
        project_id: projectId,
        name: name,
        image_url: filePath,
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
    console.error('Error in add-background route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
