import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Export GET function to handle GET requests
export async function GET(request) {
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
    
    // Verify template table exists and is accessible
    const { data, error } = await supabase
      .from('templates')
      .select('count')
      .limit(1);
    
    if (error) {
      // Table might not exist or user doesn't have access
      return NextResponse.json({ 
        success: false, 
        exists: false,
        message: 'Template table check failed',
        error: error.message
      }, { status: 200 }); // Still return 200 as this is an expected condition
    }
    
    // Table exists and is accessible
    return NextResponse.json({
      success: true,
      exists: true,
      message: 'Template table exists and is accessible'
    });
    
  } catch (error) {
    console.error('API check-template-table error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
}

// Export POST function to handle POST requests (if needed for table creation)
export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Check if user has admin privileges
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    if (adminError || !adminData) {
      return NextResponse.json({ 
        success: false, 
        message: 'Admin privileges required' 
      }, { status: 403 });
    }
    
    // Could include logic to create the template table if it doesn't exist
    // This would typically be done through migrations or initial setup
    
    return NextResponse.json({
      success: true,
      message: 'Template table check completed'
    });
    
  } catch (error) {
    console.error('API check-template-table POST error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
}
