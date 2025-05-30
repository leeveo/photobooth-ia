// Mettez à jour la fonction pour utiliser ffmpeg-static
import ffmpegStatic from 'ffmpeg-static';
import { exec } from 'child_process';

export function getFfmpegPath() {
  return ffmpegStatic;
}

// Ajoutez une fonction de fallback pour gérer les cas où FFmpeg n'est pas disponible
export function handleFFmpegError(error) {
  console.error('FFmpeg error:', error);
  // Retourner une réponse alternative ou un message d'erreur
  return { error: 'FFmpeg processing unavailable in this environment' };
}

// Make sure this function is properly exported
export async function convertWebmToMp4(inputPath, outputPath) {
  const ffmpegPath = getFfmpegPath();
  console.log(`🎬 Converting WebM to MP4: ${inputPath} -> ${outputPath}`);
  
  return new Promise((resolve, reject) => {
    exec(`${ffmpegPath} -i "${inputPath}" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 128k "${outputPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error converting WebM to MP4: ${error.message}`);
        reject(error);
        return;
      }
      console.log(`✅ WebM converted to MP4 successfully: ${outputPath}`);
      resolve(outputPath);
    });
  });
}