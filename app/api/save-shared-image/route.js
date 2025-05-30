import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase with admin privileges to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { projectId, imageUrl, watermarkedUrl, fileName, projectSlug, originalUrl } = await request.json();
    
    if (!projectId || !imageUrl) {
      return NextResponse.json(
        { success: false, message: 'Project ID and image URL are required' }, 
        { status: 400 }
      );
    }
    
    console.log('Saving shared image to database:', {
      projectId,
      imageUrl: imageUrl.substring(0, 50) + '...',
      watermarkedUrl: watermarkedUrl ? watermarkedUrl.substring(0, 50) + '...' : 'None',
      fileName
    });
    
    // Insert record with admin privileges (bypassing RLS)
    const { data, error } = await supabase
      .from('project_images')
      .insert([{
        project_id: projectId,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        metadata: {
          fileName,
          projectSlug,
          originalUrl,
          watermarked_url: watermarkedUrl // Store the watermarked URL in metadata
        }
      }])
      .select();
      
    if (error) {
      console.error('Error saving image record:', error);
      return NextResponse.json(
        { success: false, message: `Error saving image: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      imageId: data[0].id,
      imageUrl,
      watermarkedUrl
    });
    
  } catch (error) {
    console.error('Server error saving image:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
