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
    const bucket = formData.get('bucket') || 'images'; // Default bucket
    const folder = formData.get('folder') || ''; // Optional folder path
    
    if (!file) {
      return NextResponse.json({
        success: false,
        message: 'File is required'
      }, { status: 400 });
    }
    
    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    
    // Upload the file to the specified bucket
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucket)
      .upload(filePath, file, {
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
      .from(bucket)
      .getPublicUrl(filePath);
    
    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      path: filePath,
      bucket: bucket
    });
    
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(request) {
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
    
    const url = new URL(request.url);
    const bucket = url.searchParams.get('bucket') || 'images';
    const folder = url.searchParams.get('folder') || '';
    
    // List files in the specified bucket/folder
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .list(folder, {
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) {
      return NextResponse.json({
        success: false,
        message: 'Failed to list images',
        error: error.message
      }, { status: 500 });
    }
    
    // Add public URLs to the files
    const filesWithUrls = data.map(file => {
      const filePath = folder ? `${folder}/${file.name}` : file.name;
      const { data: urlData } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      return {
        ...file,
        publicUrl: urlData.publicUrl
      };
    });
    
    return NextResponse.json({
      success: true,
      data: filesWithUrls
    });
    
  } catch (error) {
    console.error('Error listing images:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to list images',
      error: error.message
    }, { status: 500 });
  }
}
