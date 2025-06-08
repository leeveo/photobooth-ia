// Script pour créer le bucket "assets" dans Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
  try {
    // Créer le bucket "assets"
    const { data, error } = await supabase.storage.createBucket('assets', {
      public: true, // Rendre le bucket public
      fileSizeLimit: 10485760, // 10 MB en octets
    });

    if (error) {
      console.error('Erreur lors de la création du bucket:', error);
      return;
    }

    console.log('Bucket "assets" créé avec succès:', data);

    // Appliquer les politiques nécessaires
    await setupPolicies();
  } catch (error) {
    console.error('Exception lors de la création du bucket:', error);
  }
}

async function setupPolicies() {
  // La création de politiques via l'API JavaScript n'est pas directement supportée
  // Ces politiques doivent être configurées dans l'interface d'administration de Supabase
  console.log(`
    ====== POLITIQUES À CONFIGURER MANUELLEMENT DANS SUPABASE ======
    
    1. Accédez à l'interface d'administration Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}
    2. Allez dans la section "Storage"
    3. Sélectionnez le bucket "assets"
    4. Allez dans l'onglet "Policies"
    5. Configurez les politiques suivantes:
  `);
}

createBucket();
