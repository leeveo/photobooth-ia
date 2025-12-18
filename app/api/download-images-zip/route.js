import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Créer un client Supabase avec la clé service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: 'public' },
    auth: { persistSession: false }
  }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '500');
    
    console.log('📦 ZIP Download API - Project ID:', projectId);
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, message: 'Project ID is required' },
        { status: 400 }
      );
    }

    const projectIdToQuery = String(projectId).trim();

    // Récupérer les images du projet
    const { data: sessionsData, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, result_s3_url, result_image_url, created_at, moderation')
      .eq('project_id', projectIdToQuery)
      .or('result_s3_url.neq.null,result_image_url.neq.null')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sessionsError) {
      console.error('❌ ZIP Download API Error:', sessionsError);
      return NextResponse.json(
        { success: false, message: sessionsError.message },
        { status: 500 }
      );
    }

    // Filtrer et préparer les images
    const images = (sessionsData || [])
      .filter(session => {
        if (session.moderation === 'M') return false;
        const url = session.result_s3_url || session.result_image_url;
        return url && url.trim() !== '' && url !== 'null' && url !== 'undefined';
      })
      .map(session => ({
        url: session.result_s3_url || session.result_image_url,
        filename: `photo_${new Date(session.created_at).toISOString().replace(/[:.]/g, '-')}.jpg`
      }));

    if (images.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Aucune image à télécharger' },
        { status: 404 }
      );
    }

    console.log('📦 ZIP Download API - Téléchargement de', images.length, 'images...');

    // Importer JSZip côté serveur
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Télécharger chaque image côté serveur (pas de CORS ici)
    let successCount = 0;
    let errorCount = 0;

    for (const image of images) {
      try {
        const response = await fetch(image.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          zip.file(image.filename, arrayBuffer);
          successCount++;
        } else {
          console.warn('⚠️ Échec téléchargement:', image.url, response.status);
          errorCount++;
        }
      } catch (err) {
        console.error('❌ Erreur téléchargement image:', err.message);
        errorCount++;
      }
    }

    if (successCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Impossible de télécharger les images' },
        { status: 500 }
      );
    }

    console.log('📦 ZIP Download API - Génération du ZIP...', successCount, 'images,', errorCount, 'erreurs');

    // Générer le ZIP
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Retourner le fichier ZIP
    const date = new Date().toISOString().split('T')[0];
    const filename = `photos_${projectId.substring(0, 8)}_${date}.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBuffer.length.toString(),
        'X-Success-Count': successCount.toString(),
        'X-Error-Count': errorCount.toString()
      }
    });

  } catch (error) {
    console.error('❌ ZIP Download API Error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
