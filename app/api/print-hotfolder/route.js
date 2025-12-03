import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API Route pour sauvegarder une photo dans un "Hot Folder" local
 * Ce dossier doit être surveillé par le logiciel DNP Hot Folder Print (ou WCM)
 * pour lancer l'impression automatiquement.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { imageBase64, imageUrl, filename } = body;
    
    // Configuration du dossier Hot Folder
    // Idéalement, ceci devrait être dans une variable d'environnement
    // Ex: process.env.HOT_FOLDER_PATH || 'C:\\DNP_HotFolder'
    const hotFolderPath = process.env.HOT_FOLDER_PATH || 'C:\\Photobooth_HotFolder';

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json(
        { error: 'Image manquante (base64 ou url requise)' },
        { status: 400 }
      );
    }

    // S'assurer que le dossier existe
    if (!fs.existsSync(hotFolderPath)) {
      try {
        fs.mkdirSync(hotFolderPath, { recursive: true });
      } catch (err) {
        return NextResponse.json(
          { error: `Impossible de créer le dossier Hot Folder: ${hotFolderPath}`, details: err.message },
          { status: 500 }
        );
      }
    }

    // Générer un nom de fichier unique si non fourni
    const finalFilename = filename || `print_${Date.now()}.jpg`;
    const filePath = path.join(hotFolderPath, finalFilename);

    let buffer;

    if (imageBase64) {
      // Cas 1: Image en Base64
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      // Cas 2: Image depuis URL
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Erreur téléchargement image: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    // Écriture du fichier
    fs.writeFileSync(filePath, buffer);

    console.log(`✅ [HotFolder] Image sauvegardée: ${filePath}`);

    return NextResponse.json({
      success: true,
      message: 'Image envoyée au Hot Folder',
      path: filePath
    });

  } catch (error) {
    console.error('❌ [HotFolder] Erreur:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
