import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

// Initialize S3 client with server-side environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    // Parse the request body
    const { imageUrl, projectId, fileName, metadata } = await request.json();
    
    // Log but don't expose sensitive info
    console.log(`Processing upload for project: ${projectId}, file: ${fileName}`);
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image URL provided' }, 
        { status: 400 }
      );
    }
    
    // Fetch the image data
    let imageResponse;
    try {
      imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
    } catch (fetchError) {
      console.error('Error fetching image:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch image from provided URL' }, 
        { status: 400 }
      );
    }
    
    // Convert to buffer
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate a key for S3
    const key = `projects/${projectId}/${fileName}`;
    
    // Upload to S3
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read', // Make the object publicly accessible
    };
    
    try {
      await s3Client.send(new PutObjectCommand(uploadParams));
      console.log('S3 upload successful for:', key);
    } catch (s3Error) {
      console.error('S3 upload error:', s3Error);
      return NextResponse.json(
        { error: `S3 upload failed: ${s3Error.message}` }, 
        { status: 500 }
      );
    }
    
    // Return the S3 URL
    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
    return NextResponse.json({ url: s3Url });
  } catch (error) {
    console.error('Server error during upload:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` }, 
      { status: 500 }
    );
  }
}
