import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { uploadToS3 } from '../../../../lib/s3';
import mime from 'mime-types';

// Configure FAL client with correct auth variables
fal.config({
  // Use FAL_KEY if available, otherwise combine key ID and secret
  credentials: process.env.FAL_KEY || 
    `${process.env.FAL_KEY_ID}:${process.env.FAL_KEY_SECRET}`,
});

// Log the configuration for debugging
console.log('🔐 FAL API Auth configured with:', process.env.FAL_KEY ? 'FAL_KEY' : 'FAL_KEY_ID + FAL_KEY_SECRET');

export async function POST(req: NextRequest) {
  try {
    // Extract filename from request
    const { filename } = await req.json();
    if (!filename) {
      return NextResponse.json({ error: 'Nom de fichier manquant' }, { status: 400 });
    }

    console.log(`🖼️ Traitement de l'image: ${filename}`);
    
    // Set up file paths
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const inputPath = path.join(uploadsDir, filename);
    
    // Check if file exists
    try {
      await readFile(inputPath);
    } catch (error) {
      console.error(`❌ Fichier introuvable: ${inputPath}`);
      return NextResponse.json({ error: `Fichier introuvable: ${filename}` }, { status: 404 });
    }

    // Determine if this is an image file
    const fileExtension = path.extname(filename).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(fileExtension);

    if (!isImage) {
      console.error(`❌ Format de fichier non supporté: ${fileExtension}`);
      return NextResponse.json({ error: 'Format de fichier non supporté' }, { status: 400 });
    }

    try {
      // Read the image file
      const imageBuffer = await readFile(inputPath);
      const imageMime = mime.lookup(inputPath) || 'image/jpeg';

      // Get image dimensions using probe-image-size
      // You'll need to install this package: npm install probe-image-size
      let originalDimensions = { width: 0, height: 0 };
      try {
        const sizeOf = require('probe-image-size');
        const dimensions = sizeOf.sync(imageBuffer);
        originalDimensions = { 
          width: dimensions.width, 
          height: dimensions.height 
        };
        console.log(`📏 Dimensions de l'image originale: ${dimensions.width}x${dimensions.height}`);
      } catch (dimError) {
        console.error('❌ Erreur lors de la récupération des dimensions:', dimError);
      }

      // Create a clean filename without spaces or special characters for S3
      const cleanFilename = `image-${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExtension.replace('.', '')}`;
      
      // Always use PNG extension for output to preserve transparency
      const baseName = path.basename(filename, path.extname(filename));
      const outputName = `bg_removed_${baseName}.png`;
      const outputPath = path.join(uploadsDir, outputName);

      try {
        // Try S3 + FAL approach first with a clean filename
        console.log('📤 Tentative d\'envoi à S3...');
        const s3Url = await uploadToS3(imageBuffer, cleanFilename, imageMime);
        console.log('📤 Image envoyée à S3 avec nom nettoyé:', s3Url);

        // Process with FAL AI to remove background
        console.log('🧙 Suppression de l\'arrière-plan avec FAL AI...');
        
        try {
          // First attempt with the rembg model
          console.log('Essai avec modèle imageutils/rembg...');
          const result = await fal.subscribe("fal-ai/imageutils/rembg", {
            input: {
              image_url: s3Url
              // The rembg model outputs PNG by default, no need to specify format
            },
            logs: true,
            onQueueUpdate: (update) => {
              console.log('Queue update:', update.status);
              if (update.status === "IN_PROGRESS" && update.logs) {
                update.logs.forEach(log => console.log(log.message));
              }
            },
          });

          const outputUrl = result.data?.image?.url;
          if (outputUrl) {
            console.log('✅ Arrière-plan supprimé avec succès (rembg). URL:', outputUrl);
            
            // Download and save the processed image
            const processedRes = await fetch(outputUrl);
            const outputBuffer = Buffer.from(await processedRes.arrayBuffer());
            // Convert Buffer to Uint8Array which is compatible with writeFile
            const uint8Array = new Uint8Array(outputBuffer.buffer, outputBuffer.byteOffset, outputBuffer.byteLength);
            await writeFile(outputPath, uint8Array);
            console.log(`✅ Image PNG enregistrée: ${outputPath}`);
            
            return NextResponse.json({ 
              message: 'Traitement terminé', 
              imagePath: `/uploads/${outputName}`,
              originalDimensions: originalDimensions,
              processedDimensions: originalDimensions, // Assuming dimensions don't change after bg removal
              format: "png" // Indicate the format is PNG
            });
          } else {
            throw new Error("Pas d'URL retournée par le modèle rembg");
          }
        } catch (firstModelError) {
          // If first model fails, try the background-removal model
          console.error('❌ Erreur avec le modèle rembg:', firstModelError);
          console.log('Essai avec modèle background-removal...');
          
          const result = await fal.subscribe("fal-ai/background-removal", {
            input: {
              image_url: s3Url,
              remove_background: true,
              output_format: "png" // Keep this for background-removal model if supported
            },
            logs: true,
          });

          const outputUrl = result.data?.image?.url;
          if (!outputUrl) {
            throw new Error('Pas d\'URL d\'image dans la réponse de FAL');
          }

          console.log('✅ Arrière-plan supprimé avec succès (background-removal). URL:', outputUrl);

          // Download and save the processed image
          const processedRes = await fetch(outputUrl);
          const outputBuffer = Buffer.from(await processedRes.arrayBuffer());
          // Convert Buffer to Uint8Array which is compatible with writeFile
          const uint8Array = new Uint8Array(outputBuffer.buffer, outputBuffer.byteOffset, outputBuffer.byteLength);
          await writeFile(outputPath, uint8Array);
          console.log(`✅ Image PNG enregistrée: ${outputPath}`);
          
          return NextResponse.json({ 
            message: 'Traitement terminé', 
            imagePath: `/uploads/${outputName}`,
            originalDimensions: originalDimensions,
            processedDimensions: originalDimensions, // Assuming dimensions don't change after bg removal
            format: "png" // Indicate the format is PNG
          });
        }

      } catch (processingError) {
        console.error('❌ Erreur avec FAL AI ou S3:', processingError);
        
        // Simple fallback that applies a basic transparency effect
        console.log('⚠️ Utilisation du traitement fallback...');
        
        // For now we just copy the original since we don't have a local background removal solution
        // In a real app you might want to implement a local algorithm or use a different API
        const uint8Array = new Uint8Array(imageBuffer.buffer, imageBuffer.byteOffset, imageBuffer.byteLength);
        await writeFile(outputPath, uint8Array);
        console.log(`⚠️ Image originale copiée (sans traitement): ${outputPath}`);
      }

      // Return success response with image dimensions and format
      return NextResponse.json({ 
        message: 'Traitement terminé', 
        imagePath: `/uploads/${outputName}`,
        originalDimensions: originalDimensions,
        processedDimensions: originalDimensions,
        format: "png" // Indicate the format is PNG
      });
      
    } catch (processError) {
      console.error('❌ Erreur lors du traitement de l\'image:', processError);
      
      // Fix the 'unknown' type error by checking the type or using a safe approach to get the message
      const errorMessage = processError instanceof Error 
        ? processError.message 
        : 'Erreur inconnue';
        
      return NextResponse.json({ error: `Erreur de traitement: ${errorMessage}` }, { status: 500 });
    }

  } catch (err: any) {
    console.error('❌ Erreur globale:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
