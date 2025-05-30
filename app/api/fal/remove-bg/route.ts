import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { uploadToS3 } from '../../../../lib/s3'; // Chemin d'importation simplifié
import { convertWebmToMp4, getFfmpegPath } from '../../../../lib/convert'; // Chemin d'importation simplifié
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
    const { filename } = await req.json();
    if (!filename) {
      return NextResponse.json({ error: 'Nom de fichier manquant' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const inputPath = path.join(uploadsDir, filename);
    
    // Check if file exists
    try {
      await readFile(inputPath);
    } catch (error) {
      return NextResponse.json({ error: `Fichier introuvable: ${filename}` }, { status: 404 });
    }

    // Determine if this is a video or image file
    const fileExtension = path.extname(filename).toLowerCase();
    const isVideo = ['.webm', '.mp4', '.mov', '.avi'].includes(fileExtension);
    const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(fileExtension);

    if (!isVideo && !isImage) {
      return NextResponse.json({ error: 'Format de fichier non supporté' }, { status: 400 });
    }

    // Handle video files
    if (isVideo) {
      console.log('🎬 Traitement de la vidéo...');
      let sourceFilePath = inputPath;
      let sourceFileName = filename;

      // Convert WebM to MP4 if needed
      if (fileExtension === '.webm') {
        const mp4Filename = filename.replace(/\.webm$/, '.mp4');
        const mp4Path = path.join(uploadsDir, mp4Filename);

        console.log('🎬 Conversion WebM → MP4 ...');
        console.log('🔍 FFMPEG path utilisé :', getFfmpegPath());
        await convertWebmToMp4(inputPath, mp4Path);
        console.log('✅ Conversion terminée :', mp4Path);

        sourceFilePath = mp4Path;
        sourceFileName = mp4Filename;
      }

      const fileBuffer = await readFile(sourceFilePath);
      const fileMime = mime.lookup(sourceFilePath) || 'video/mp4';

      const s3Url = await uploadToS3(fileBuffer, sourceFileName, fileMime);
      console.log('📤 Vidéo envoyée à S3 :', s3Url);

      const result = await fal.subscribe("fal-ai/ben/v2/video", {
        input: { video_url: s3Url },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            update.logs?.forEach((log) => console.log(log.message));
          }
        },
      });

      const outputUrl = result.data?.video?.url;
      if (!outputUrl) {
        return NextResponse.json({ error: 'Aucune vidéo retournée' }, { status: 500 });
      }

      const processedRes = await fetch(outputUrl);
      const outputBuffer = Buffer.from(await processedRes.arrayBuffer());

      const outputName = `bg_removed_${sourceFileName}`;
      // Convert Buffer to Uint8Array for writeFile compatibility
      const uint8Array = new Uint8Array(outputBuffer.buffer, outputBuffer.byteOffset, outputBuffer.byteLength);
      await writeFile(path.join(uploadsDir, outputName), uint8Array);

      return NextResponse.json({ message: 'Traitement terminé', videoPath: `/uploads/${outputName}` });
    } 
    // Handle image files
    else if (isImage) {
      console.log('🖼️ Traitement de l\'image...');

      const imageBuffer = await readFile(inputPath);
      const imageMime = mime.lookup(inputPath) || 'image/jpeg';

      // For images, we'll use a different Fal AI endpoint specific for images
      const s3Url = await uploadToS3(imageBuffer, filename, imageMime);
      console.log('📤 Image envoyée à S3 :', s3Url);

      const result = await fal.subscribe("fal-ai/background-removal", {
        input: {
          image_url: s3Url,
          remove_background: true,
        },
        logs: true,
      });

      const outputUrl = result.data?.image?.url;
      if (!outputUrl) {
        return NextResponse.json({ error: 'Aucune image retournée' }, { status: 500 });
      }

      const processedRes = await fetch(outputUrl);
      const outputBuffer = Buffer.from(await processedRes.arrayBuffer());

      const outputName = `bg_removed_${filename}`;
      // Convert Buffer to Uint8Array for writeFile compatibility
      const uint8Array = new Uint8Array(outputBuffer.buffer, outputBuffer.byteOffset, outputBuffer.byteLength);
      await writeFile(path.join(uploadsDir, outputName), uint8Array);

      return NextResponse.json({ message: 'Traitement terminé', imagePath: `/uploads/${outputName}` });
    }

  } catch (err: any) {
    console.error('❌ Erreur Fal:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
