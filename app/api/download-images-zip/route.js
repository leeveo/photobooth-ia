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

// POST method - receive image URLs directly from client (avoids DB timeout)
export async function POST(request) {
  try {
    const body = await request.json();
    const { images, projectName } = body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Images array is required' },
        { status: 400 }
      );
    }

    console.log('📦 ZIP Download API (POST) - Processing', images.length, 'images for project:', projectName);

    // Importer JSZip côté serveur
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    let successCount = 0;
    let errorCount = 0;

    // Télécharger par lots de 10 pour paralléliser efficacement
    const batchSize = 10;
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (image, batchIndex) => {
          try {
            const response = await fetch(image.url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              signal: AbortSignal.timeout(15000) // 15s timeout par image
            });
            
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const filename = image.filename || `photo_${String(i + batchIndex + 1).padStart(4, '0')}.jpg`;
              return { success: true, filename, data: arrayBuffer };
            } else {
              return { success: false, filename: image.filename || `photo_${i + batchIndex + 1}.jpg` };
            }
          } catch (err) {
            return { success: false, error: err.message };
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          zip.file(result.value.filename, result.value.data);
          successCount++;
        } else {
          errorCount++;
        }
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
      compressionOptions: { level: 5 } // Compression légèrement plus rapide
    });

    // Retourner le fichier ZIP
    const date = new Date().toISOString().split('T')[0];
    const safeName = (projectName || 'photos').replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 30);
    const filename = `${safeName}_${date}.zip`;

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

// GET method - fallback with DB query (may timeout on large projects)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Réduit à 50 par défaut
    const offset = parseInt(searchParams.get('offset') || '0');
    
    console.log('📦 ZIP Download API (GET) - Project ID:', projectId, 'Limit:', limit, 'Offset:', offset);
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, message: 'Project ID is required' },
        { status: 400 }
      );
    }

    const projectIdToQuery = String(projectId).trim();

    // Récupérer les images avec une requête simple et rapide
    const { data: sessionsData, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, result_s3_url, result_image_url, created_at, moderation')
      .eq('project_id', projectIdToQuery)
      .not('result_s3_url', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (sessionsError) {
      console.error('❌ ZIP Download API Error:', sessionsError);
      return NextResponse.json(
        { success: false, message: sessionsError.message },
        { status: 500 }
      );
    }

    console.log('📦 ZIP Download API - Sessions trouvées:', sessionsData?.length || 0);

    // Filtrer et préparer les images
    const images = (sessionsData || [])
      .filter(session => {
        if (session.moderation === 'M') return false;
        const url = session.result_s3_url || session.result_image_url;
        return url && url.trim() !== '' && url !== 'null' && url !== 'undefined';
      })
      .map((session, index) => ({
        url: session.result_s3_url || session.result_image_url,
        filename: `photo_${String(offset + index + 1).padStart(4, '0')}_${new Date(session.created_at).toISOString().replace(/[:.]/g, '-').substring(0, 19)}.jpg`
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

    let successCount = 0;
    let errorCount = 0;

    // Télécharger par lots de 5
    const batchSize = 5;
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (image) => {
          try {
            const response = await fetch(image.url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              signal: AbortSignal.timeout(15000)
            });
            
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              return { success: true, filename: image.filename, data: arrayBuffer };
            } else {
              return { success: false, filename: image.filename };
            }
          } catch (err) {
            return { success: false, filename: image.filename, error: err.message };
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          zip.file(result.value.filename, result.value.data);
          successCount++;
        } else {
          errorCount++;
        }
      }
    }

    if (successCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Impossible de télécharger les images' },
        { status: 500 }
      );
    }

    console.log('📦 ZIP Download API - Génération du ZIP...', successCount, 'images,', errorCount, 'erreurs');

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 5 }
    });

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
