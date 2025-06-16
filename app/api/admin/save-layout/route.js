import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Parse request body
    const { projectId, layoutData } = await request.json();
    
    if (!projectId || !layoutData) {
      return NextResponse.json({
        success: false,
        message: 'Project ID and layout data are required'
      }, { status: 400 });
    }
    
    // Check if layout already exists for this project
    const { data: existingLayout } = await supabase
      .from('layouts')
      .select('id')
      .eq('project_id', projectId)
      .single();
    
    let result;
    
    if (existingLayout) {
      // Update existing layout
      const { data, error } = await supabase
        .from('layouts')
        .update({
          layout_data: layoutData,
          updated_at: new Date()
        })
        .eq('project_id', projectId)
        .select();
      
      if (error) throw error;
      result = data;
    } else {
      // Insert new layout
      const { data, error } = await supabase
        .from('layouts')
        .insert([{
          project_id: projectId,
          layout_data: layoutData,
          created_at: new Date(),
          updated_at: new Date()
        }])
        .select();
      
      if (error) throw error;
      result = data;
    }
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error saving layout:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to save layout',
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({
        success: false,
        message: 'Project ID is required'
      }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('layouts')
      .select('*')
      .eq('project_id', projectId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      data: data || { layout_data: null }
    });
  } catch (error) {
    console.error('Error fetching layout:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch layout',
      error: error.message
    }, { status: 500 });
  }
}
