import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Créer un client Supabase avec la clé service role pour contourner les RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: false
    }
  }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '500'); // Limite par défaut à 500
    
    console.log('📦 ZIP API - Project ID:', projectId, 'Limit:', limit);
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, message: 'Project ID is required' },
        { status: 400 }
      );
    }

    const projectIdToQuery = String(projectId).trim();

    // Récupérer les images du projet avec une limite pour éviter le timeout
    // On sélectionne uniquement les colonnes nécessaires pour optimiser
    const { data: sessionsData, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, result_s3_url, result_image_url, created_at, moderation')
      .eq('project_id', projectIdToQuery)
      .or('result_s3_url.neq.null,result_image_url.neq.null')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sessionsError) {
      console.error('❌ ZIP API Error fetching sessions:', sessionsError);
      return NextResponse.json(
        { success: false, message: sessionsError.message },
        { status: 500 }
      );
    }

    console.log('📦 ZIP API - Sessions brutes trouvées:', sessionsData?.length || 0);

    // Transformer les données pour ne garder que les URLs valides et exclure les modérées
    const images = (sessionsData || [])
      .filter(session => {
        // Exclure les images modérées
        if (session.moderation === 'M') return false;
        
        const url = session.result_s3_url || session.result_image_url;
        return url && url.trim() !== '' && url !== 'null' && url !== 'undefined';
      })
      .map(session => ({
        id: session.id,
        url: session.result_s3_url || session.result_image_url,
        created_at: session.created_at,
        filename: `photo_${new Date(session.created_at).toISOString().replace(/[:.]/g, '-')}.jpg`
      }));

    console.log('📦 ZIP API - Images valides (non modérées):', images.length);

    return NextResponse.json({
      success: true,
      data: images,
      total: images.length
    });

  } catch (error) {
    console.error('❌ ZIP API Error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
