import { NextResponse } from 'next/server';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import path from 'path';

// Export the route handler function
export async function POST(req) {
  try {
    // Ajouter une gestion de sécurité pour le répertoire manquant
    const backgroundRemovedDir = path.join(process.cwd(), 'public', 'background_removed_photos');
    
    let files = [];
    try {
      // Tenter de lire le répertoire, mais ne pas échouer si impossible
      if (existsSync(backgroundRemovedDir)) {
        files = readdirSync(backgroundRemovedDir);
      } else {
        console.log("Répertoire manquant, création d'un tableau vide");
      }
    } catch (dirError) {
      console.error("Erreur lors de la lecture du répertoire:", dirError);
      // Continuer avec un tableau vide
    }
    
    // Continue with your existing implementation
    // ...existing code...
    
    return NextResponse.json({ success: true, files: files });
  } catch (error) {
    console.error('Error in photos-wall/merge:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}