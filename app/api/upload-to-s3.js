import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const bucket = formData.get('bucket') || 'leeveostockage';
    const path = formData.get('path') || `uploads/${uuidv4()}`;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = file.type;

    // Upload to S3
    const params = {
      Bucket: bucket,
      Key: path,
      Body: buffer,
      ContentType: fileType,
      ACL: 'public-read',
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Return the public URL of the uploaded file
    const fileUrl = `https://${bucket}.s3.${process.env.AWS_REGION || 'eu-west-3'}.amazonaws.com/${path}`;

    return NextResponse.json({
      success: true,
      url: fileUrl
    });
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
