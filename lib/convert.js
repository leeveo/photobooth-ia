// Mettez à jour la fonction pour utiliser ffmpeg-static
import ffmpegStatic from 'ffmpeg-static';
import { exec } from 'child_process';

export function getFfmpegPath() {
  // Fonction désactivée pour Vercel
  console.log("FFmpeg désactivé pour le déploiement");
  return null;
}

// Ajoutez une fonction de fallback pour gérer les cas où FFmpeg n'est pas disponible
export function handleFFmpegError(error) {
  console.error('FFmpeg error:', error);
  // Retourner une réponse alternative ou un message d'erreur
  return { error: 'FFmpeg processing unavailable in this environment' };
}

// Make sure this function is properly exported
export async function convertWebmToMp4(inputPath, outputPath) {
  // Fonction désactivée pour Vercel
  console.log("Conversion WebM vers MP4 désactivée pour le déploiement");
  return outputPath; // Retourne simplement le chemin de sortie sans traitement
}

export async function mergeVideos(videoList, outputPath) {
  // Fonction désactivée pour Vercel
  console.log("Fusion de vidéos désactivée pour le déploiement");
  return outputPath;
}