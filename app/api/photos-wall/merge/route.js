import { NextResponse } from 'next/server';
import { existsSync, readdirSync, mkdirSync } from 'fs';
import path from 'path';

// Export the route handler function
export async function POST(req) {
  try {
    // Créer le répertoire s'il n'existe pas
    const backgroundRemovedDir = path.join(process.cwd(), 'public', 'background_removed_photos');
    
    let files = [];
    try {
      if (!existsSync(backgroundRemovedDir)) {
        mkdirSync(backgroundRemovedDir, { recursive: true });
        console.log(`Répertoire créé: ${backgroundRemovedDir}`);
      }
      files = readdirSync(backgroundRemovedDir);
    } catch (dirError) {
      console.error("Erreur lors de la lecture du répertoire:", dirError);
      // Continuer avec un tableau vide plutôt que d'échouer
      files = [];
    }
    
    // Retourner les données disponibles
    return NextResponse.json({ 
      success: true, 
      files: files,
      message: "Liste de fichiers générée avec succès" 
    });
  } catch (error) {
    console.error('Error in photos-wall/merge:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}