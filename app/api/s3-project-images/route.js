import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const projectId = searchParams.get('projectId');
  const countOnly = searchParams.get('countOnly') === 'true';
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 12;
  
  if (!projectId) {
    return Response.json({
      success: false, 
      error: 'Project ID is required'
    }, { status: 400 });
  }
  
  try {
    // If we only need the count
    if (countOnly) {
      const { count, error: countError } = await supabase
        .from('project_images')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);

      if (countError) throw countError;

      return Response.json({
        success: true,
        count: count || 0
      });
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Get images from database with pagination
    const { data: images, error } = await supabase
      .from('project_images')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    
    // Transform the data to match expected format
    const transformedImages = (images || []).map(img => ({
      id: img.id,
      url: img.image_url, // Map image_url to url for the frontend
      image_url: img.image_url, // Keep original field too
      project_id: img.project_id,
      created_at: img.created_at,
      last_modified: img.created_at,
      metadata: img.metadata || {}
    }));
    
    return Response.json({
      success: true,
      images: transformedImages,
      pagination: {
        page,
        limit,
        hasMore: transformedImages.length === limit
      }
    });
  } catch (error) {
    console.error('Error in project images API:', error);
    return Response.json({
      success: false,
      error: error.message,
      images: []
    }, { status: 500 });
  }
}