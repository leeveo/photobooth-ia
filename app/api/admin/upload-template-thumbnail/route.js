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
    const templateId = formData.get('templateId');
    
    if (!file || !templateId) {
      return NextResponse.json({
        success: false,
        message: 'File and template ID are required'
      }, { status: 400 });
    }
    
    // Create a unique file name
    const fileName = `template_${templateId}_${Date.now()}.${file.name.split('.').pop()}`;
    
    // Upload the file to the templates bucket
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('templates')
      .upload(`thumbnails/${fileName}`, file, {
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
      .from('templates')
      .getPublicUrl(`thumbnails/${fileName}`);
    
    // Update the template with the new thumbnail URL
    const { error: updateError } = await supabase
      .from('templates')
      .update({ thumbnail_url: publicUrlData.publicUrl })
      .eq('id', templateId);
    
    if (updateError) {
      return NextResponse.json({
        success: false,
        message: 'Failed to update template with new thumbnail',
        error: updateError.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl
    });
    
  } catch (error) {
    console.error('Error uploading template thumbnail:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to upload template thumbnail',
      error: error.message
    }, { status: 500 });
  }
}
