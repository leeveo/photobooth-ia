import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { projectId, name, url } = await request.json();
    
    if (!projectId || !url) {
      return NextResponse.json(
        { error: 'Project ID and URL are required' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Insert the image URL into your database
    const { data, error } = await supabase
      .from('uploaded_images')  // Replace with your actual table name
      .insert({
        project_id: projectId,
        name: name || 'Uploaded image',
        url: url,
        created_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      console.error('Error saving image URL:', error);
      return NextResponse.json(
        { error: 'Failed to save image URL' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, image: data[0] });
  } catch (error) {
    console.error('Error in save-uploaded-image API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
