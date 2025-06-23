import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Configure S3 client
const s3Client = new S3Client({
  region: 'eu-west-3',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  },
});

export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const projectId = searchParams.get('projectId');
  const countOnly = searchParams.get('countOnly') === 'true';
  const includeModerated = searchParams.get('includeModerated') !== 'false'; // Default to true
  
  if (!projectId) {
    return Response.json({
      success: false, 
      error: 'Project ID is required'
    }, { status: 400 });
  }
  
  try {
    // List objects from S3
    const prefix = `projects/${projectId}/`;
    
    const command = new ListObjectsV2Command({
      Bucket: 'leeveostockage',
      Prefix: prefix,
    });
    
    const response = await s3Client.send(command);
    
    // If we only need the count
    if (countOnly) {
      return Response.json({
        success: true,
        count: response.Contents?.length || 0
      });
    }
    
    // Process the objects into the format expected by the UI
    const images = response.Contents?.map(item => {
      const key = item.Key;
      const filename = key.split('/').pop();
      const created = item.LastModified || new Date();
      
      return {
        id: key, // Use the S3 key as the ID
        image_url: `https://leeveostockage.s3.eu-west-3.amazonaws.com/${key}`,
        project_id: projectId,
        isModerated: false, // Default all to non-moderated for now
        created_at: created.toISOString(),
        metadata: {
          fileName: filename,
          size: item.Size
        }
      };
    }) || [];
    
    return Response.json({
      success: true,
      images
    });
  } catch (error) {
    console.error('Error in S3 project images API:', error);
    return Response.json({
      success: false,
      error: error.message,
      images: []
    }, { status: 500 });
  }
}