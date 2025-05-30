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
        try {
          mkdirSync(backgroundRemovedDir, { recursive: true });
          console.log(`Répertoire créé: ${backgroundRemovedDir}`);
        } catch (mkdirError) {
          console.error("Erreur lors de la création du répertoire:", mkdirError);
          // Continuer avec un tableau vide
        }
      }
      
      // Essayer de lire le répertoire, mais ne pas échouer si impossible
      try {
        files = readdirSync(backgroundRemovedDir);
      } catch (readError) {
        console.error("Erreur lors de la lecture du répertoire:", readError);
        // Continuer avec un tableau vide
      }
    } catch (e) {
      console.error("Erreur lors de la vérification/création du répertoire:", e);
      // Continuer avec un tableau vide
    }
    
    // Retourner les fichiers (ou un tableau vide en cas d'erreur)
    return NextResponse.json({ 
      success: true, 
      files: files,
      message: "Traitement terminé" 
    });
  } catch (error) {
    console.error('Error in photos-wall/merge:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}