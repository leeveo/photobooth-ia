import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Default buckets that the application needs
const DEFAULT_BUCKETS = [
  { 
    name: 'images', 
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  { 
    name: 'templates', 
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  { 
    name: 'thumbnails', 
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  { 
    name: 'user-uploads', 
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  }
];

/**
 * POST endpoint to create required storage buckets
 */
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
    
    // Get list of existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      return NextResponse.json({
        success: false,
        message: 'Failed to list existing buckets',
        error: listError.message
      }, { status: 500 });
    }
    
    const existingBucketNames = existingBuckets.map(bucket => bucket.name);
    const results = [];
    
    // Create any missing buckets
    for (const bucket of DEFAULT_BUCKETS) {
      if (!existingBucketNames.includes(bucket.name)) {
        // Create the bucket
        const { data, error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: bucket.allowedMimeTypes
        });
        
        results.push({
          bucket: bucket.name,
          success: !error,
          message: error ? error.message : 'Created successfully',
          data: data
        });
      } else {
        // Update existing bucket
        const { data, error } = await supabase.storage.updateBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: bucket.allowedMimeTypes
        });
        
        results.push({
          bucket: bucket.name,
          success: !error,
          message: error ? error.message : 'Updated successfully',
          data: data
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Bucket creation/update completed',
      results: results
    });
    
  } catch (error) {
    console.error('Error creating buckets:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create buckets',
      error: error.message
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check if required buckets exist
 */
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
    
    // Get list of existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      return NextResponse.json({
        success: false,
        message: 'Failed to list existing buckets',
        error: listError.message
      }, { status: 500 });
    }
    
    const existingBucketNames = existingBuckets.map(bucket => bucket.name);
    const missingBuckets = DEFAULT_BUCKETS.filter(bucket => 
      !existingBucketNames.includes(bucket.name)
    );
    
    return NextResponse.json({
      success: true,
      existingBuckets: existingBuckets,
      missingBuckets: missingBuckets,
      allBucketsExist: missingBuckets.length === 0
    });
    
  } catch (error) {
    console.error('Error checking buckets:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to check buckets',
      error: error.message
    }, { status: 500 });
  }
}
