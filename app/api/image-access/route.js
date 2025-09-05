import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Extraire les paramètres de l'URL
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const projectId = searchParams.get('project');

    if (!token) {
      return NextResponse.json({ error: 'Token requis' }, { status: 400 });
    }

    // Initialiser Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Décoder le token pour récupérer les informations de la session/photo
    let sessionData;
    try {
      // Le token est une version encodée de l'ID de session ou de photo
      const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
      sessionData = JSON.parse(decodedToken);
    } catch (err) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 400 });
    }

    let imageUrl = null;
    
    // Essayer de trouver l'image par ID de session
    if (sessionData.sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('result_s3_url, result_image_url, project_id')
        .eq('id', sessionData.sessionId)
        .single();

      if (!sessionError && session) {
        imageUrl = session.result_s3_url || session.result_image_url;
        
        // Vérifier que le projet correspond si fourni
        if (projectId && session.project_id !== projectId) {
          return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
        }
      }
    }

    // Essayer de trouver l'image par ID de photo
    if (!imageUrl && sessionData.photoId) {
      const { data: photo, error: photoError } = await supabase
        .from('photos')
        .select('image_url, project_id')
        .eq('id', sessionData.photoId)
        .single();

      if (!photoError && photo) {
        imageUrl = photo.image_url;
        
        // Vérifier que le projet correspond si fourni
        if (projectId && photo.project_id !== projectId) {
          return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
        }
      }
    }

    // Si l'URL est fournie directement dans le token
    if (!imageUrl && sessionData.imageUrl) {
      imageUrl = sessionData.imageUrl;
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image non trouvée' }, { status: 404 });
    }

    // Rediriger vers l'image
    return NextResponse.redirect(imageUrl);

  } catch (error) {
    console.error('Erreur lors de l\'accès à l\'image:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
