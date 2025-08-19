import { createClient } from '@supabase/supabase-js';

// Vérifier les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 GET API - Configuration Supabase:');
console.log('URL présente:', !!supabaseUrl);
console.log('Service Role Key présente:', !!serviceRoleKey);

// Client Supabase avec service role pour contourner RLS
const supabaseServiceRole = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get('projectId');

    console.log('🔍 API READ: Project ID reçu:', projectId);

    if (!projectId) {
      return Response.json({ error: 'Project ID requis' }, { status: 400 });
    }

    // Utiliser le service role pour contourner RLS
    const { data, error } = await supabaseServiceRole
      .from('mosaic_settings')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ API READ: Erreur:', error);
      return Response.json({ 
        error: error.message,
        details: error 
      }, { status: 500 });
    }
    
    console.log('✅ API READ: Données trouvées:', data);
    return Response.json({ 
      success: true, 
      data: data 
    });

  } catch (err) {
    console.error('❌ API READ: Erreur globale:', err);
    return Response.json({ 
      error: err.message 
    }, { status: 500 });
  }
}
