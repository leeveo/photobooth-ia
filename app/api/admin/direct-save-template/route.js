import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Handler for POST requests to save templates
export async function POST(request) {
  try {
    // Create a Supabase client with route handler context
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Get template data from request body
    const templateData = await request.json();
    
    // Validate required fields
    if (!templateData.name) {
      return NextResponse.json({
        success: false,
        message: 'Template name is required'
      }, { status: 400 });
    }
    
    // Add user ID and timestamps
    const dataToSave = {
      ...templateData,
      user_id: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Save to templates table
    const { data, error } = await supabase
      .from('templates')
      .insert(dataToSave)
      .select()
      .single();
    
    if (error) {
      console.error('Template save error:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to save template',
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Template saved successfully',
      template: data
    });
    
  } catch (error) {
    console.error('Template save exception:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}

// Handler for GET request to retrieve a template by ID
export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Get template ID from query parameters
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Template ID is required'
      }, { status: 400 });
    }
    
    // Fetch template
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return NextResponse.json({
        success: false,
        message: 'Failed to retrieve template',
        error: error.message
      }, { status: error.code === 'PGRST116' ? 404 : 500 });
    }
    
    return NextResponse.json({
      success: true,
      template: data
    });
    
  } catch (error) {
    console.error('Template retrieval exception:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}

// Handler for PUT/PATCH requests to update templates
export async function PUT(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Get update data
    const updateData = await request.json();
    
    if (!updateData.id) {
      return NextResponse.json({
        success: false,
        message: 'Template ID is required for updates'
      }, { status: 400 });
    }
    
    // Add updated timestamp
    const dataToUpdate = {
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    // Remove id from the update data as it's used in the query
    const { id, ...fieldsToUpdate } = dataToUpdate;
    
    // Update template
    const { data, error } = await supabase
      .from('templates')
      .update(fieldsToUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({
        success: false,
        message: 'Failed to update template',
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      template: data
    });
    
  } catch (error) {
    console.error('Template update exception:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}

// Alias PATCH to PUT
export const PATCH = PUT;
