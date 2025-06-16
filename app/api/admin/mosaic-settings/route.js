import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { projectId, settings } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: 'Project ID is required'
      }, { status: 400 });
    }
    
    // Check if settings already exist for this project
    const { data: existingSettings } = await supabase
      .from('mosaic_settings')
      .select('id')
      .eq('project_id', projectId)
      .single();
      
    // Prepare settings data with all fields explicitly listed
    const settingsData = {
      project_id: projectId,
      bg_color: settings.bg_color || '#000000',
      bg_image_url: settings.bg_image_url || '',
      title: settings.title || '',
      description: settings.description || '',
      show_qr_code: settings.show_qr_code || false,
      qr_title: settings.qr_title || 'Scannez-moi',
      qr_description: settings.qr_description || '',
      qr_position: settings.qr_position || 'center',
      updated_at: new Date()
    };
    
    let result;
    
    if (existingSettings) {
      // Update existing settings
      const { data, error } = await supabase
        .from('mosaic_settings')
        .update(settingsData)
        .eq('project_id', projectId)
        .select();
        
      if (error) throw error;
      result = data;
    } else {
      // Insert new settings
      const { data, error } = await supabase
        .from('mosaic_settings')
        .insert([settingsData])
        .select();
        
      if (error) throw error;
      result = data;
    }
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error saving mosaic settings:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies });
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  
  if (!projectId) {
    return NextResponse.json({
      success: false,
      error: 'Project ID is required'
    }, { status: 400 });
  }
  
  try {
    const { data, error } = await supabase
      .from('mosaic_settings')
      .select('*')
      .eq('project_id', projectId)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      data: data || { 
        bg_color: '#000000',
        bg_image_url: '',
        title: '',
        description: '',
        show_qr_code: false,
        qr_title: 'Scannez-moi',
        qr_description: '',
        qr_position: 'center'
      }
    });
  } catch (error) {
    console.error('Error fetching mosaic settings:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
