// Mettez à jour la fonction pour utiliser ffmpeg-static
import ffmpegStatic from 'ffmpeg-static';

export function getFfmpegPath() {
  return ffmpegStatic;
}

// Ajoutez une fonction de fallback pour gérer les cas où FFmpeg n'est pas disponible
export function handleFFmpegError(error) {
  console.error('FFmpeg error:', error);
  // Retourner une réponse alternative ou un message d'erreur
  return { error: 'FFmpeg processing unavailable in this environment' };
}