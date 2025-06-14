import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request) {
  console.log('=== Add background from URL API called ===');
  
  try {
    // Get JSON data from the request
    const data = await request.json();
    const { projectId, name, imageUrl, forceReplace } = data;
    
    if (!projectId || !name || !imageUrl) {
      console.error('Missing required fields:', { projectId, name, imageUrl });
      return NextResponse.json({
        success: false,
        error: 'Project ID, name and image URL are required'
      }, { status: 400 });
    }
    
    console.log('Processing background from URL:', imageUrl);
    console.log('For project:', projectId);
    
    // If forceReplace is true, delete existing backgrounds
    if (forceReplace) {
      console.log('Force replace flag is true - removing existing backgrounds');
      
      try {
        // Delete all existing backgrounds for this project
        const { error: deleteError } = await supabaseAdmin
          .from('backgrounds')
          .delete()
          .eq('project_id', projectId)
          .eq('is_active', true);
          
        if (deleteError) {
          console.error('Error deleting backgrounds:', deleteError);
          throw new Error(`Error deleting existing backgrounds: ${deleteError.message}`);
        } else {
          console.log(`Successfully deleted backgrounds for project ${projectId}`);
        }
      } catch (error) {
        console.error('Error handling existing backgrounds:', error);
        return NextResponse.json({
          success: false,
          error: `Error deleting backgrounds: ${error.message}`
        }, { status: 500 });
      }
      
      // Pause briefly to ensure deletion is processed
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Insert the new background
    console.log('Inserting new background with URL:', imageUrl);
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('backgrounds')
      .insert({
        name: name,
        image_url: imageUrl,
        project_id: projectId,
        is_active: true
      })
      .select();
    
    if (insertError) {
      console.error('Error inserting background:', insertError);
      return NextResponse.json({
        success: false,
        error: `Database error: ${insertError.message}`
      }, { status: 500 });
    }
    
    console.log('Background added successfully:', insertedData);
    
    // Fetch all backgrounds to return them
    const { data: allBackgrounds, error: fetchError } = await supabaseAdmin
      .from('backgrounds')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true);
      
    if (fetchError) {
      console.error('Error fetching all backgrounds:', fetchError);
      // If we can't fetch all backgrounds, at least return the one we just inserted
      return NextResponse.json({
        success: true,
        data: insertedData
      });
    }
    
    console.log('All backgrounds after update:', allBackgrounds);
    
    return NextResponse.json({
      success: true,
      data: allBackgrounds
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({
      success: false,
      error: `Server error: ${error.message}`
    }, { status: 500 });
  }
}