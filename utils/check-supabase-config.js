// Utilitaire pour vérifier la configuration Supabase

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkSupabaseConfig() {
  console.log('=== VÉRIFICATION DE LA CONFIGURATION SUPABASE ===');
  
  // Vérifier les variables d'environnement
  console.log('\n1. Vérification des variables d\'environnement:');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Défini' : '❌ Manquant'}`);
  console.log(`- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Défini' : '❌ Manquant'}`);
  console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Défini' : '❌ Manquant'}`);
  
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.log('\n❌ ERREUR: Certaines variables d\'environnement sont manquantes!');
    console.log('Veuillez vérifier votre fichier .env.local');
    return;
  }
  
  // Test de connexion avec la clé anonyme
  console.log('\n2. Test de connexion avec la clé anonyme:');
  try {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await anonClient.auth.getUser();
    
    if (error) {
      console.log(`❌ Échec de la connexion anonyme: ${error.message}`);
    } else {
      console.log('✅ Connexion anonyme réussie');
    }
  } catch (err) {
    console.log(`❌ Exception lors de la connexion anonyme: ${err.message}`);
  }
  
  // Test de connexion avec la clé de service
  console.log('\n3. Test de connexion avec la clé de service:');
  try {
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await serviceClient
      .from('canvas_layouts')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log(`❌ Échec de la connexion de service: ${error.message}`);
    } else {
      console.log('✅ Connexion de service réussie');
      console.log(`✅ Requête test réussie: ${data ? data.length : 0} layouts trouvés`);
    }
  } catch (err) {
    console.log(`❌ Exception lors de la connexion de service: ${err.message}`);
  }
  
  console.log('\n=== FIN DE LA VÉRIFICATION ===');
}

// Exécuter la vérification
checkSupabaseConfig();
