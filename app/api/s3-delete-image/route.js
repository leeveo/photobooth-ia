import { NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Configuration client S3
const s3Client = new S3Client({
  region: 'eu-west-3',
  credentials: {
  accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { key } = body;
    
    if (!key) {
      return NextResponse.json(
        { error: "La clé S3 est requise" },
        { status: 400 }
      );
    }
    
    const command = new DeleteObjectCommand({
      Bucket: 'leeveostockage',
      Key: key,
    });
    
    await s3Client.send(command);
    
    return NextResponse.json({
      success: true,
      message: "Image supprimée avec succès",
    });
    
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}