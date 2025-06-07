import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Extract background data from request body
    const backgroundData = await request.formData();
    
    const projectId = backgroundData.get('projectId');
    const name = backgroundData.get('name') || 'Arrière-plan sans nom';
    const isActive = backgroundData.get('isActive') === 'true';
    const file = backgroundData.get('file');
    
    if (!projectId || !file) {
      return NextResponse.json({ error: 'Project ID and file are required' }, { status: 400 });
    }
    
    // Generate a unique filename with project ID prefix for better organization
    const fileExt = file.name.split('.').pop();
    const fileName = `${projectId}/${Date.now()}.${fileExt}`;
    
    // Upload the file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('backgrounds')
      .upload(fileName, file);
      
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
    
    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('backgrounds')
      .getPublicUrl(fileName);
    
    // Create a record in the backgrounds table
    const { data, error } = await supabaseAdmin
      .from('backgrounds')
      .insert([
        {
          project_id: projectId,
          name: name,
          image_url: publicUrl,
          is_active: isActive
        }
      ])
      .select();
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
