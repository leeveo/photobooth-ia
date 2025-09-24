import { createClient } from '@supabase/supabase-js';

// Marquer comme dynamique pour éviter l'erreur de rendu statique
export const dynamic = 'force-dynamic';

// Initialiser Supabase avec les clés publiques et l'URL du projet
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Les variables d\'environnement SUPABASE_URL et SUPABASE_ANON_KEY doivent être définies');
}

// Créer le client Supabase avec service role pour l'accès admin
export const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

export async function GET(request) {
  try {
    // Récupérer l'email admin depuis les headers ou query params
    const { searchParams } = new URL(request.url);
    const adminEmail = searchParams.get('admin_email') || 'waibooth.app@gmail.com';

    console.log('🔍 Récupération des projets pour:', adminEmail);

    // Récupérer les projets depuis Supabase
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('admin_email', adminEmail)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      return Response.json({ error: 'Erreur lors de la récupération des projets', details: error.message }, { status: 500 });
    }

    console.log(`✅ ${projects?.length || 0} projets trouvés`);

    return Response.json({ 
      success: true, 
      projects: projects || [],
      count: projects?.length || 0
    });

  } catch (error) {
    console.error('❌ Erreur API projects:', error);
    return Response.json({ 
      error: 'Erreur serveur interne', 
      message: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('📝 Création d\'un nouveau projet:', body);

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur création projet:', error);
      return Response.json({ error: 'Erreur lors de la création du projet', details: error.message }, { status: 500 });
    }

    console.log('✅ Projet créé:', newProject);
    return Response.json({ success: true, project: newProject });

  } catch (error) {
    console.error('❌ Erreur API POST projects:', error);
    return Response.json({ 
      error: 'Erreur serveur interne', 
      message: error.message 
    }, { status: 500 });
  }
}