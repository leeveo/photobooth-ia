import { NextResponse } from 'next/server';
import path from 'path';

export async function POST(req) {
  try {
    const { videoPath, bgPath } = await req.json();
    
    if (!videoPath || !bgPath) {
      return NextResponse.json({ error: 'Chemins vidéo et arrière-plan requis' }, { status: 400 });
    }
    
    // En production, retourner simplement la vidéo originale
    console.log("⚠️ FFmpeg désactivé, retour de la vidéo originale");
    
    // Enlever le chemin public du videoPath si nécessaire
    const normalizedVideoPath = videoPath.startsWith('/') 
      ? videoPath 
      : `/${videoPath.replace(/^public\//, '')}`;
    
    return NextResponse.json({ 
      success: true,
      message: "FFmpeg désactivé en production", 
      videoPath: normalizedVideoPath
    });
    
  } catch (error) {
    console.error('❌ Erreur background:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}