import { NextResponse } from 'next/server';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    // Initialize S3 client with your credentials
    const s3Client = new S3Client({
      region: 'eu-west-3',
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY
      }
    });
    
    // Try to list buckets to check permissions
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    return NextResponse.json({
      success: true,
      message: 'S3 permissions verified successfully',
      buckets: response.Buckets.map(bucket => bucket.Name)
    });
  } catch (error) {
    console.error('S3 permission test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      suggestion: 'Check your AWS credentials and IAM permissions'
    }, { status: 500 });
  }
}
