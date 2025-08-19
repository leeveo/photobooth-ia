import { createClient } from '@supabase/supabase-js';

// Vérifier les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Configuration Supabase:');
console.log('URL présente:', !!supabaseUrl);
console.log('Service Role Key présente:', !!serviceRoleKey);
console.log('Service Role Key (premières lettres):', serviceRoleKey ? serviceRoleKey.substring(0, 10) + '...' : 'NON DÉFINIE');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variables d\'environnement manquantes!');
}

// Client Supabase avec service role pour bypasser RLS
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request) {
  try {
    const { mosaicData, projectId } = await request.json();

    console.log('🔍 API: Request reçue');
    console.log('🔍 API: Project ID reçu:', projectId);
    console.log('🔍 API: Type de projectId:', typeof projectId);
    console.log('🔍 API: Données reçues:', mosaicData);

    if (!projectId) {
      console.log('❌ API: Project ID manquant');
      return Response.json({ error: 'Project ID requis' }, { status: 400 });
    }

    console.log('🔍 API: Sauvegarde des paramètres mosaic pour le projet:', projectId);
    
    // Utiliser un upsert direct en contournant RLS avec le service role
    const { data, error } = await supabase
      .from('mosaic_settings')
      .upsert({ 
        project_id: projectId,
        bg_color: mosaicData.bg_color || '#000000',
        bg_image_url: mosaicData.bg_image_url || null,
        title: mosaicData.title || '',
        description: mosaicData.description || '',
        show_qr_code: mosaicData.show_qr_code || false,
        qr_title: mosaicData.qr_title || 'Scannez-moi',
        qr_description: mosaicData.qr_description || 'Retrouvez toutes les photos ici',
        qr_position: mosaicData.qr_position || 'center',
        is_public: mosaicData.is_public || false,
        enable_swipe: mosaicData.enable_swipe || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'project_id'
      })
      .select();
    
    if (error) {
      console.error('❌ API: Erreur upsert:', error);
      return Response.json({ 
        error: error.message,
        details: error 
      }, { status: 500 });
    }
    
    console.log('✅ API: Succès upsert:', data);
    return Response.json({ 
      success: true, 
      message: 'Paramètres de mosaïque enregistrés avec succès',
      data: data 
    });

  } catch (error) {
    console.error('API: Erreur lors de la sauvegarde des paramètres mosaic:', error);
    return Response.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
