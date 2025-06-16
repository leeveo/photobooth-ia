import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file');
    const projectId = formData.get('projectId');
    
    if (!file || !projectId) {
      return NextResponse.json({
        success: false,
        message: 'File and project ID are required'
      }, { status: 400 });
    }
    
    // Create a unique file name
    const fileName = `project_${projectId}_${Date.now()}.${file.name.split('.').pop()}`;
    
    // Upload the file to the thumbnails bucket
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('thumbnails')
      .upload(`projects/${fileName}`, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      return NextResponse.json({
        success: false,
        message: 'Upload failed',
        error: uploadError.message
      }, { status: 500 });
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('thumbnails')
      .getPublicUrl(`projects/${fileName}`);
    
    // Update the project with the new thumbnail URL if needed
    // This depends on your data model, you might want to update a projects table
    
    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl
    });
    
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to upload thumbnail',
      error: error.message
    }, { status: 500 });
  }
}
