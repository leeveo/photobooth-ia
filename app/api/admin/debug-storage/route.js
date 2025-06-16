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
    
    // Get URL parameters
    const url = new URL(request.url);
    const bucket = url.searchParams.get('bucket') || 'projects';
    const path = url.searchParams.get('path') || '';
    
    // List files in the specified bucket and path
    const { data: files, error } = await supabase
      .storage
      .from(bucket)
      .list(path, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        message: `Error accessing storage bucket "${bucket}"`,
        error: error.message
      }, { status: 500 });
    }
    
    // Return files information
    return NextResponse.json({
      success: true,
      bucket,
      path,
      files: files || [],
      message: 'Storage files retrieved successfully'
    });
    
  } catch (error) {
    console.error('API debug-storage error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
}

// Export POST function for testing file uploads
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
    
    // Get request data (this would be a FormData for file uploads in a real scenario)
    // For debugging purposes, we'll just check if storage is accessible
    const body = await request.json();
    const { bucket = 'projects', action = 'test' } = body;
    
    let result;
    
    // Perform the requested action
    if (action === 'test') {
      // Test if the bucket exists
      const { data, error } = await supabase
        .storage
        .getBucket(bucket);
      
      if (error) {
        return NextResponse.json({ 
          success: false, 
          message: `Bucket "${bucket}" not accessible`,
          error: error.message
        }, { status: 400 });
      }
      
      result = {
        bucketExists: true,
        bucketDetails: data
      };
    } else if (action === 'list_buckets') {
      // List all buckets
      const { data, error } = await supabase
        .storage
        .listBuckets();
      
      if (error) {
        return NextResponse.json({ 
          success: false, 
          message: 'Error listing buckets',
          error: error.message
        }, { status: 500 });
      }
      
      result = {
        buckets: data
      };
    }
    
    return NextResponse.json({
      success: true,
      action,
      result,
      message: 'Storage debug operation completed successfully'
    });
    
  } catch (error) {
    console.error('API debug-storage POST error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
}
