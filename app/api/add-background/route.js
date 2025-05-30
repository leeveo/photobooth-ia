import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(req) {
  try {
    const { videoPath, bgPath } = await req.json();
    
    if (!videoPath || !bgPath) {
      return NextResponse.json({ error: 'Chemins vidéo et arrière-plan requis' }, { status: 400 });
    }
    
    // Vérifier que les fichiers existent
    const fullVideoPath = path.join(process.cwd(), 'public', videoPath);
    const fullBgPath = path.join(process.cwd(), 'public', bgPath);
    
    if (!existsSync(fullVideoPath) || !existsSync(fullBgPath)) {
      return NextResponse.json({ error: 'Fichier vidéo ou arrière-plan introuvable' }, { status: 404 });
    }
    
    const outputName = 'merged_with_bg.mp4';
    const outputPath = path.join(process.cwd(), 'public', 'uploads', outputName);
    
    // Désactiver FFmpeg pour Vercel
    console.log("⚠️ FFmpeg désactivé pour le déploiement Vercel, retour de la vidéo originale");
    
    return NextResponse.json({ 
      message: "Fonction FFmpeg désactivée pour le déploiement Vercel", 
      videoPath: videoPath 
    });
    
  } catch (error) {
    console.error('❌ Erreur background:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}