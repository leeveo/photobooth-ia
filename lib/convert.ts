import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = promisify(exec);

/**
 * Récupère le chemin vers l'exécutable ffmpeg
 */
export function getFfmpegPath(): string {
  // Sur la plupart des systèmes, ffmpeg est disponible dans le PATH
  return 'ffmpeg';
}

/**
 * Convertit une vidéo WebM en MP4
 * @param inputPath Chemin vers le fichier WebM d'entrée
 * @param outputPath Chemin où le fichier MP4 sera enregistré
 */
export async function convertWebmToMp4(inputPath: string, outputPath: string): Promise<void> {
  try {
    const ffmpegPath = getFfmpegPath();
    
    // Conversion simple de WebM vers MP4
    const command = `${ffmpegPath} -i "${inputPath}" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 128k "${outputPath}"`;
    
    console.log(`Exécution de la commande: ${command}`);
    await execPromise(command);
    console.log(`Conversion terminée: ${outputPath}`);
  } catch (error) {
    console.error('Erreur lors de la conversion WebM vers MP4:', error);
    throw new Error(`La conversion vidéo a échoué: ${error instanceof Error ? error.message : String(error)}`);
  }
}
