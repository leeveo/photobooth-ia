import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

// Configure S3 client with proper error handling for environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  },
});

// Initialize Supabase client with fallback for environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials are missing. Please check environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const userId = searchParams.get('userId'); // Get the logged-in user ID
    const countOnly = searchParams.get('countOnly') === 'true';
    const includeModerated = searchParams.get('includeModerated') !== 'false'; // Default to true
    
    if (!projectId) {
      return NextResponse.json({
        success: false, 
        error: 'Project ID is required'
      }, { status: 400 });
    }

    // S3 bucket name with fallback
    const bucketName = process.env.AWS_S3_BUCKET || 'leeveostockage';
    
    // Step 1: Check if the project belongs to the user or is public
    if (userId) {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, created_by, is_public')
        .eq('id', projectId)
        .single();
      
      if (projectError) {
        console.error('Error checking project:', projectError);
        return Response.json({
          success: false,
          error: 'Error checking project permissions'
        }, { status: 403 });
      }
      
      // Check if the user has access to this project
      if (projectData.created_by !== userId && !projectData.is_public) {
        return Response.json({
          success: false,
          error: 'You do not have access to this project'
        }, { status: 403 });
      }
    }
    
    // Step 2: First, try to fetch data from Supabase photos table
    try {
      console.log(`Trying to fetch from photos table for project ${projectId}`);
      
      let query = supabase
        .from('photos')
        .select('*', { count: countOnly ? 'exact' : null })
        .eq('project_id', projectId);
      
      // Filter out moderated photos if requested
      if (!includeModerated) {
        query = query.eq('is_moderated', false);
      }
      
      const { data: photosData, error: photosError, count: totalCount } = await query;
      
      // If we only need the count
      if (countOnly) {
        if (photosError) {
          console.error('Error counting photos:', photosError);
          // Continue with S3 if error
        } else {
          return Response.json({
            success: true,
            count: totalCount || 0,
            source: 'supabase'
          });
        }
      } else if (!photosError && photosData && photosData.length > 0) {
        // Format the data for the client
        const images = photosData.map(photo => ({
          id: photo.id,
          image_url: photo.image_url,
          project_id: photo.project_id,
          isModerated: photo.is_moderated || false,
          created_at: photo.created_at,
          metadata: photo.metadata || {
            fileName: photo.image_url.split('/').pop(),
            size: 0
          }
        }));
        
        return Response.json({
          success: true,
          images,
          source: 'supabase'
        });
      }
    } catch (supabaseError) {
      console.error('Error in Supabase query:', supabaseError);
      // Continue with S3 if error
    }
    
    // Step 3: If Supabase fails or returns no results, try S3
    console.log('Searching in S3 for project:', projectId);
    
    // Search in the layouts folder instead of projects
    const s3Prefix = 'layouts/';
    
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: s3Prefix,
      // Increase MaxKeys to fetch more objects
      MaxKeys: countOnly ? 1000 : 100,
    });
    
    const response = await s3Client.send(command);
    
    // Filter objects that contain the project ID in their name
    const projectObjects = (response.Contents || []).filter(obj => {
      const key = obj.Key;
      // Search for the project ID in the file name
      return key.includes(`-${projectId}-`) || 
             key.includes(`_project-${projectId}_`) || 
             key.includes(`photobooth-premium-${projectId}`);
    });
    
    // If we need more objects, and there's a continuation token
    let allProjectObjects = [...projectObjects];
    let nextToken = response.NextContinuationToken;
    
    // For counting, we want to retrieve all objects (up to a point)
    if (countOnly && nextToken) {
      let attempts = 0;
      const maxAttempts = 5; // Limit the number of requests to avoid infinite loop
      
      while (nextToken && attempts < maxAttempts) {
        attempts++;
        const nextCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: s3Prefix,
          MaxKeys: 1000,
          ContinuationToken: nextToken
        });
        
        const nextResponse = await s3Client.send(nextCommand);
        
        // Filter new objects and add to the list
        const moreProjectObjects = (nextResponse.Contents || []).filter(obj => {
          const key = obj.Key;
          return key.includes(`-${projectId}-`) || 
                 key.includes(`_project-${projectId}_`) || 
                 key.includes(`photobooth-premium-${projectId}`);
        });
        
        allProjectObjects = [...allProjectObjects, ...moreProjectObjects];
        nextToken = nextResponse.NextContinuationToken;
        
        // If no new objects found or no token, stop
        if (moreProjectObjects.length === 0 || !nextToken) {
          break;
        }
      }
    }
    
    // If we only need the count
    if (countOnly) {
      return Response.json({
        success: true,
        count: allProjectObjects.length,
        source: 's3'
      });
    }
    
    // When constructing URLs, use the environment variable for region and bucket
    const s3Region = process.env.AWS_REGION || 'eu-west-3';
    
    // Process the objects into the format expected by the UI
    const images = allProjectObjects.map(item => {
      const key = item.Key;
      const filename = key.split('/').pop();
      const created = item.LastModified || new Date();
      
      // Extract metadata from the file name if possible
      let metadata = {
        fileName: filename,
        size: item.Size
      };
      
      // Parse the file name to extract metadata
      try {
        const parts = filename.split('_');
        const timestamp = parts[0];
        metadata.timestamp = timestamp;
        
        // Try to extract other information if available
        if (parts.length > 1) {
          const infoPart = parts[1];
          if (infoPart.includes('-')) {
            const subParts = infoPart.split('-');
            if (subParts.length >= 3) {
              metadata.type = subParts[0];
              metadata.userId = subParts[1];
              metadata.projectName = subParts.slice(2).join('-');
            }
          }
        }
      } catch (e) {
        // Ignore parsing errors, keep default metadata
      }
      
      return {
        id: `s3_${key.replace(/[\/\.]/g, '_')}`, // Create a unique ID for S3
        image_url: `https://${bucketName}.s3.${s3Region}.amazonaws.com/${key}`,
        project_id: projectId,
        isModerated: false, // Default S3 images to non-moderated
        created_at: created.toISOString(),
        metadata
      };
    });
    
    return Response.json({
      success: true,
      images,
      source: 's3',
      hasMore: !!nextToken
    });
  } catch (error) {
    console.error('Error in S3 project images API:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      images: []
    }, { status: 500 });
  }
}