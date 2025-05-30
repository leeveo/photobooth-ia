import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase with admin privileges to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
        message: 'Project ID, name and file are required'
      }, { status: 400 });
    }
    
    console.log('Uploading background image for project', projectId);
    
    // Get project slug from projectId
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('slug')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json({
        success: false,
        message: `Error fetching project: ${projectError.message}`
      }, { status: 500 });
    }
    
    const projectSlug = projectData.slug;
    
    // Create file path
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const filePath = `${projectSlug}/backgrounds/${timestamp}.${fileExt}`;
    
    // Create bucket if it doesn't exist
    try {
      await supabase.storage.createBucket('backgrounds', { public: true });
    } catch (bucketError) {
      console.log("Note on bucket creation:", bucketError?.message || bucketError);
    }
    
    // Upload file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('backgrounds')
      .upload(filePath, file, { 
        contentType: file.type,
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({
        success: false,
        message: `Upload error: ${uploadError.message}`
      }, { status: 500 });
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('backgrounds')
      .getPublicUrl(filePath);
    
    if (!urlData || !urlData.publicUrl) {
      return NextResponse.json({
        success: false,
        message: 'Failed to get public URL'
      }, { status: 500 });
    }
    
    // Insert background in database
    const { data: insertData, error: insertError } = await supabase
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
        message: `Database error: ${insertError.message}`
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        background: insertData[0],
        url: urlData.publicUrl
      }
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({
      success: false,
      message: `Server error: ${error.message}`
    }, { status: 500 });
  }
}
