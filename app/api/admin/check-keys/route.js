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
    
    // Get API keys from your database or configuration
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        message: 'Error fetching API keys',
        error: error.message
      }, { status: 500 });
    }
    
    // Return API keys information
    return NextResponse.json({
      success: true,
      hasKeys: !!data,
      keys: data ? {
        openai: !!data.openai_key,
        stability: !!data.stability_key,
        replicate: !!data.replicate_key,
      } : null
    });
    
  } catch (error) {
    console.error('API check-keys error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
}

// Export POST function to handle POST requests (if needed)
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
    
    // Parse request body
    const body = await request.json();
    const { openai_key, stability_key, replicate_key } = body;
    
    // Update or insert API keys
    const { data, error } = await supabase
      .from('api_keys')
      .upsert({
        user_id: session.user.id,
        openai_key,
        stability_key,
        replicate_key,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        message: 'Error saving API keys',
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'API keys updated successfully',
      keys: {
        openai: !!data.openai_key,
        stability: !!data.stability_key,
        replicate: !!data.replicate_key,
      }
    });
    
  } catch (error) {
    console.error('API check-keys POST error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
}
