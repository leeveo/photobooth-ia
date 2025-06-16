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
    const { id, name, description, layoutData, thumbnailUrl } = await request.json();
    
    // Validate required fields
    if (!name || !layoutData) {
      return NextResponse.json({
        success: false,
        message: 'Template name and layout data are required'
      }, { status: 400 });
    }
    
    let result;
    
    if (id) {
      // Update existing template
      const { data, error } = await supabase
        .from('templates')
        .update({
          name,
          description: description || '',
          layout_data: layoutData,
          thumbnail_url: thumbnailUrl || '',
          updated_at: new Date()
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      result = data;
    } else {
      // Insert new template
      const { data, error } = await supabase
        .from('templates')
        .insert([{
          name,
          description: description || '',
          layout_data: layoutData,
          thumbnail_url: thumbnailUrl || '',
          created_by: session.user.id,
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
    console.error('Error saving template:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to save template',
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      // Get all templates
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return NextResponse.json({
        success: true,
        data: data
      });
    } else {
      // Get specific template
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return NextResponse.json({
        success: true,
        data: data
      });
    }
  } catch (error) {
    console.error('Error fetching template(s):', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch template(s)',
      error: error.message
    }, { status: 500 });
  }
}
