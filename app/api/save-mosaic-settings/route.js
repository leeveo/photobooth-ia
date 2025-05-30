import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase with server-side admin privileges to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Important: This has to be the full service role key with admin privileges
);

export async function POST(request) {
  try {
    // Log that the API was called
    console.log('Save mosaic settings API called');
    
    // Parse the request body
    const settingsData = await request.json();
    
    if (!settingsData.project_id) {
      console.error('Missing project_id in request');
      return NextResponse.json(
        { success: false, message: 'Project ID is required' }, 
        { status: 400 }
      );
    }
    
    console.log('Processing settings for project:', settingsData.project_id);
    
    // Check if settings already exist for this project
    const { data: existingData, error: checkError } = await supabase
      .from('mosaic_settings')
      .select('id')
      .eq('project_id', settingsData.project_id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
      console.error('Error checking existing settings:', checkError);
      return NextResponse.json(
        { success: false, message: `Database error: ${checkError.message}` },
        { status: 500 }
      );
    }
    
    let result;
    
    // If settings exist, update them
    if (existingData) {
      console.log(`Updating existing settings for project ${settingsData.project_id}`);
      const { data, error } = await supabase
        .from('mosaic_settings')
        .update(settingsData)
        .eq('id', existingData.id)
        .select();
      
      if (error) {
        console.error('Error updating mosaic settings:', error);
        return NextResponse.json(
          { success: false, message: `Database update error: ${error.message}`, error },
          { status: 500 }
        );
      }
      
      result = data?.[0];
    } else {
      // If no settings exist, insert new ones
      console.log(`Creating new settings for project ${settingsData.project_id}`);
      const { data, error } = await supabase
        .from('mosaic_settings')
        .insert([settingsData])
        .select();
        
      if (error) {
        console.error('Error inserting mosaic settings:', error);
        return NextResponse.json(
          { success: false, message: `Database insert error: ${error.message}`, error },
          { status: 500 }
        );
      }
      
      result = data?.[0];
    }
    
    if (!result) {
      console.error('Operation succeeded but no data was returned');
      return NextResponse.json({
        success: true,
        message: 'Settings saved but no data returned',
        data: null
      });
    }
    
    console.log('Settings saved successfully');
    return NextResponse.json({
      success: true,
      message: 'Mosaic settings saved successfully',
      data: result
    });
    
  } catch (error) {
    console.error('Server error saving mosaic settings:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
