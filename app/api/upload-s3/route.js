import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// AWS S3 client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export async function POST(request) {
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    
    // Get file, bucket and path from form data
    const file = formData.get('file');
    const bucket = formData.get('bucket') || 'leeveostockage';
    const path = formData.get('path');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    if (!path) {
      return NextResponse.json(
        { error: 'No path provided' },
        { status: 400 }
      );
    }
    
    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Set up S3 upload parameters
    const params = {
      Bucket: bucket,
      Key: path,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read' // Make the file publicly accessible
    };
    
    // Upload file to S3
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    
    // Construct the public URL for the uploaded file
    const url = `https://${bucket}.s3.${process.env.AWS_REGION || 'eu-west-3'}.amazonaws.com/${path}`;
    
    // Return success response with the URL
    return NextResponse.json({
      success: true,
      url: url
    });
  } catch (error) {
    console.error('Error uploading to S3:', error);
    
    return NextResponse.json(
      { error: error.message || 'Error uploading file to S3' },
      { status: 500 }
    );
  }
}
