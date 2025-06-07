import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the token is valid
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
    
    // Get background data from request
    const backgroundData = await request.json();
    
    // Validate required fields
    if (!backgroundData.project_id || !backgroundData.image_url) {
      return NextResponse.json({ 
        error: 'Missing required fields: project_id and image_url are required' 
      }, { status: 400 });
    }
    
    // Insert the background data using admin privileges
    const { data, error } = await supabaseAdmin
      .from('backgrounds')
      .insert(backgroundData)
      .select();
    
    if (error) {
      console.error('Admin API - Error inserting background:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Background added successfully' 
    });
    
  } catch (error) {
    console.error('Admin API - Server error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
