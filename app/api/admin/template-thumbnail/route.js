import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * GET endpoint to fetch a template thumbnail image
 * Retrieves the thumbnail from Supabase storage and returns it
 */
export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const url = new URL(request.url);
    const templateId = url.searchParams.get('id');
    
    if (!templateId) {
      return NextResponse.json({
        success: false,
        message: 'Template ID is required'
      }, { status: 400 });
    }
    
    // First get the template to get the thumbnail URL
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('thumbnail_url')
      .eq('id', templateId)
      .single();
    
    if (templateError) {
      return NextResponse.json({
        success: false,
        message: 'Template not found',
        error: templateError.message
      }, { status: 404 });
    }
    
    if (!template.thumbnail_url) {
      return NextResponse.json({
        success: false,
        message: 'Template has no thumbnail'
      }, { status: 404 });
    }
    
    // Get the public URL for the thumbnail
    const thumbnailPath = template.thumbnail_url.replace(/^.*\/storage\/v1\/object\/public\//, '');
    const bucketName = thumbnailPath.split('/')[0];
    const filePath = thumbnailPath.substring(bucketName.length + 1);
    
    const { data: publicURL } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    return NextResponse.json({
      success: true,
      url: publicURL.publicUrl
    });
    
  } catch (error) {
    console.error('Error retrieving template thumbnail:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve template thumbnail',
      error: error.message
    }, { status: 500 });
  }
}
