import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import GifEncoder from 'gifencoder';
import { createCanvas, loadImage } from 'canvas';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';

// Initialize S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    // Get form data with images
    const formData = await request.formData();
    
    // Get project ID
    const projectId = formData.get('projectId') || 'unknown';
    
    // Extract images
    const images = [];
    for (let i = 0; i < 4; i++) {
      const image = formData.get(`image${i}`);
      if (image) {
        const buffer = Buffer.from(await image.arrayBuffer());
        images.push(buffer);
      }
    }
    
    if (images.length < 4) {
      return NextResponse.json(
        { error: 'Not enough images provided' },
        { status: 400 }
      );
    }
    
    // Create GIF
    const gifBuffer = await createGif(images);
    
    // Upload to S3
    const filename = `gif_${randomUUID()}_${projectId}.gif`;
    const s3Key = `uploads/gifs/${filename}`;
    
    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: gifBuffer,
      ContentType: 'image/gif',
      ACL: 'public-read',
    }));
    
    // Return the S3 URL
    const gifUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    
    return NextResponse.json({ gifUrl });
    
  } catch (error) {
    console.error('Error creating GIF:', error);
    return NextResponse.json(
      { error: 'Failed to create GIF: ' + error.message },
      { status: 500 }
    );
  }
}

async function createGif(imageBuffers) {
  // Define GIF dimensions
  const width = 480;
  const height = 480;
  
  // Create GIF encoder
  const encoder = new GifEncoder(width, height);
  const chunks = [];
  
  // Collect data chunks
  encoder.on('data', chunk => chunks.push(chunk));
  
  // Create a promise to wait for the GIF encoding to complete
  const encodingComplete = new Promise(resolve => {
    encoder.on('end', () => resolve(Buffer.concat(chunks)));
  });
  
  // Start encoding
  encoder.setRepeat(0);  // 0 for repeat, -1 for no-repeat
  encoder.setDelay(300); // 300ms delay between frames
  encoder.setQuality(10); // Lower means better quality
  encoder.start();
  
  // Process each image and add to the GIF
  for (const buffer of imageBuffers) {
    // Resize and format the image
    const resizedBuffer = await sharp(buffer)
      .resize(width, height, { fit: 'cover' })
      .toBuffer();
    
    // Load the image for the GIF encoder
    const image = await loadImage(resizedBuffer);
    
    // Create canvas to draw the image
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Draw the image on the canvas
    ctx.drawImage(image, 0, 0, width, height);
    
    // Add the frame to the GIF
    encoder.addFrame(ctx);
  }
  
  // Finish encoding
  encoder.finish();
  
  // Wait for encoding to complete and return the buffer
  return encodingComplete;
}
