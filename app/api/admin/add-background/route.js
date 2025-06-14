import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase admin client to bypass RLS
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
    // Get form data from the request
    const formData = await request.formData();
    const projectId = formData.get('projectId');
    const name = formData.get('name');
    const file = formData.get('file');
    
    if (!projectId || !name || !file) {
      return NextResponse.json({
        success: false,
        error: 'Project ID, name and file are required'
      }, { status: 400 });
    }
    
    console.log('Uploading background image for project', projectId);
    
    // First delete existing backgrounds for this project
    try {
      const { error: deleteError } = await supabaseAdmin
        .from('backgrounds')
        .delete()
        .eq('project_id', projectId)
        .eq('is_active', true);
        
      if (deleteError) {
        console.error('Error deleting backgrounds:', deleteError);
        throw new Error(`Error deleting existing backgrounds: ${deleteError.message}`);
      } else {
        console.log('Successfully deleted existing backgrounds');
      }
    } catch (error) {
      console.error('Error handling existing backgrounds:', error);
      return NextResponse.json({
        success: false,
        error: error.message || 'Error handling existing backgrounds'
      }, { status: 500 });
    }
    
    // Get project slug from projectId
    const { data: projectData, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('slug')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json({
        success: false,
        error: `Error fetching project: ${projectError.message}`
      }, { status: 500 });
    }
    
    const projectSlug = projectData.slug;
    
    // Create file path
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const filePath = `${projectSlug}/backgrounds/${timestamp}.${fileExt}`;
    
    // Ensure file buffer is valid
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('backgrounds')
      .upload(filePath, fileBuffer, { 
        contentType: file.type,
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({
        success: false,
        error: `Upload error: ${uploadError.message}`
      }, { status: 500 });
    }
    
    // Get public URL for the uploaded file
    const { data: urlData } = supabaseAdmin.storage
      .from('backgrounds')
      .getPublicUrl(filePath);
    
    if (!urlData || !urlData.publicUrl) {
      return NextResponse.json({
        success: false,
        error: 'Failed to get public URL'
      }, { status: 500 });
    }
    
    // Insert background in database
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('backgrounds')
      .insert({
        name: name,
        image_url: urlData.publicUrl,
        storage_path: filePath,
        project_id: projectId,
        is_active: true
      })
      .select();
    
    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({
        success: false,
        error: `Database error: ${insertError.message}`
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: insertData
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({
      success: false,
      error: `Server error: ${error.message}`
    }, { status: 500 });
  }
}
