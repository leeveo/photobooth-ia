import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET endpoint to retrieve current storage policies
export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Check admin privileges
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
    
    // Get bucket name from query params
    const url = new URL(request.url);
    const bucketName = url.searchParams.get('bucket');
    
    if (!bucketName) {
      return NextResponse.json({
        success: false,
        message: 'Bucket name is required'
      }, { status: 400 });
    }
    
    // Fetch current storage bucket policies
    const { data, error } = await supabase
      .storage
      .getBucket(bucketName);
    
    if (error) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch bucket policy',
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Error retrieving storage policy:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve storage policy',
      error: error.message
    }, { status: 500 });
  }
}

// POST endpoint to update storage policies
export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Check admin privileges
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
    
    // Parse request body
    const { bucketName, isPublic, allowedMimeTypes } = await request.json();
    
    if (!bucketName) {
      return NextResponse.json({
        success: false,
        message: 'Bucket name is required'
      }, { status: 400 });
    }
    
    // Update bucket policy
    const { data, error } = await supabase
      .storage
      .updateBucket(bucketName, {
        public: isPublic,
        file_size_limit: 10485760, // 10MB
        allowed_mime_types: allowedMimeTypes || ['image/jpeg', 'image/png', 'image/gif']
      });
    
    if (error) {
      return NextResponse.json({
        success: false,
        message: 'Failed to update bucket policy',
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: data,
      message: 'Storage policy updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating storage policy:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update storage policy',
      error: error.message
    }, { status: 500 });
  }
}
