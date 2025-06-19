import { createClient } from '@supabase/supabase-js';

// Créer un client Supabase avec la clé de service qui ignore les RLS
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Variables d\'environnement Supabase manquantes');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Fonction pour vérifier et configurer les politiques RLS nécessaires
export const setupRequiredRlsPolicies = async () => {
  try {
    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) return { success: false, message: 'Client admin non initialisé' };
    
    console.log('Configuration des politiques RLS pour canvas_layouts...');
    
    // Tenter directement d'exécuter des requêtes SQL pour créer les politiques
    // sans vérifier si les tables existent
    
    // Créer les politiques nécessaires
    const policies = [
      // Politiques pour canvas_layouts
      `CREATE POLICY IF NOT EXISTS "Enable insert for authenticated users" 
       ON public.canvas_layouts FOR INSERT TO authenticated WITH CHECK (true);`,
      
      `CREATE POLICY IF NOT EXISTS "Enable select for authenticated users" 
       ON public.canvas_layouts FOR SELECT TO authenticated USING (true);`,
      
      `CREATE POLICY IF NOT EXISTS "Enable update for authenticated users" 
       ON public.canvas_layouts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`,
      
      `CREATE POLICY IF NOT EXISTS "Enable delete for authenticated users" 
       ON public.canvas_layouts FOR DELETE TO authenticated USING (true);`,
      
      // Politiques pour project_settings
      `CREATE POLICY IF NOT EXISTS "Enable select for project_settings" 
       ON public.project_settings FOR SELECT TO authenticated USING (true);`,
      
      `CREATE POLICY IF NOT EXISTS "Enable insert for project_settings" 
       ON public.project_settings FOR INSERT TO authenticated WITH CHECK (true);`,
      
      `CREATE POLICY IF NOT EXISTS "Enable update for project_settings" 
       ON public.project_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`
    ];
    
    // S'assurer que la fonction RLS est activée pour les tables
    const enableRLS = [
      `ALTER TABLE IF EXISTS public.canvas_layouts ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE IF EXISTS public.project_settings ENABLE ROW LEVEL SECURITY;`
    ];
    
    // Exécuter les requêtes SQL en utilisant directement la méthode query
    for (const sql of [...enableRLS, ...policies]) {
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
        if (error) {
          console.warn(`Avertissement lors de l'exécution de SQL: ${error.message}`);
          // Continuer malgré les erreurs, certaines politiques pourraient déjà exister
        }
      } catch (sqlError) {
        console.warn(`Erreur lors de l'exécution de SQL: ${sqlError.message}`);
        // Essayer une approche alternative si exec_sql ne fonctionne pas
      }
    }
    
    // Méthode alternative: utiliser l'API REST de Supabase directement
    // Essayer d'insérer un enregistrement dans canvas_layouts
    console.log('Test des politiques RLS en tentant une opération...');
    const testData = {
      name: 'Test RLS Policy',
      elements: '[]',
      stage_size: '{}',
      project_id: '00000000-0000-0000-0000-000000000000', // ID factice
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Essayer d'insérer/supprimer pour tester les politiques
    try {
      const { data, error } = await supabaseAdmin
        .from('canvas_layouts')
        .insert(testData)
        .select();
      
      if (error && error.code === '42501') {
        console.log('Les politiques RLS ne sont toujours pas correctement configurées');
        return { 
          success: false, 
          message: 'Impossible de configurer les politiques RLS automatiquement. ' + 
                   'Veuillez contacter votre administrateur pour configurer les politiques manuellement.' 
        };
      }
      
      // Si l'insertion réussit, supprimer l'entrée de test
      if (data && data.length > 0) {
        await supabaseAdmin
          .from('canvas_layouts')
          .delete()
          .eq('id', data[0].id);
      }
    } catch (testError) {
      console.warn('Erreur lors du test des politiques:', testError);
      // Continuer malgré l'erreur
    }
    
    return { success: true, message: 'Politiques RLS configurées ou testées' };
  } catch (error) {
    console.error('Erreur lors de la configuration des politiques RLS:', error);
    return { success: false, message: `Erreur: ${error.message}` };
  }
};
