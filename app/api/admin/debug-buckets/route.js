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
    
    // List available storage buckets
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Error fetching storage buckets',
        error: bucketsError.message
      }, { status: 500 });
    }
    
    // Return buckets information
    return NextResponse.json({
      success: true,
      buckets: buckets || [],
      message: 'Storage buckets retrieved successfully'
    });
    
  } catch (error) {
    console.error('API debug-buckets error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
}

// Export POST function for creating or testing buckets if needed
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
    
    // Parse request body to get bucket name or other parameters
    const body = await request.json();
    const { bucketName, isPublic = false } = body;
    
    if (!bucketName) {
      return NextResponse.json({ 
        success: false, 
        message: 'Bucket name is required' 
      }, { status: 400 });
    }
    
    // Create a new bucket or test an existing one
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: isPublic
    });
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        message: `Error with bucket "${bucketName}"`,
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Bucket "${bucketName}" operation successful`,
      data
    });
    
  } catch (error) {
    console.error('API debug-buckets POST error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
}
