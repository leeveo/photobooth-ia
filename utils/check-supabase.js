/**
 * Utilitaire pour vérifier la configuration Supabase
 * Exécutez ce script pour diagnostiquer les problèmes avec vos clés API Supabase
 * 
 * Pour l'exécuter:
 * 1. Ouvrez un terminal dans le dossier du projet
 * 2. Exécutez: node utils/check-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Fonction pour analyser un token JWT et afficher ses claims
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (error) {
    return { error: 'Invalid JWT token format' };
  }
}

async function checkSupabaseConfig() {
  console.log('=== DIAGNOSTIC DE CONFIGURATION SUPABASE ===');
  console.log('Date et heure du test:', new Date().toLocaleString());
  console.log('');
  
  // Vérifier les variables d'environnement
  console.log('1. Vérification des variables d\'environnement:');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Présent' : '❌ Manquant'}`);
  console.log(`- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Présent' : '❌ Manquant'}`);
  console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Présent' : '❌ Manquant'}`);
  
  // Analyser les tokens JWT
  console.log('\n2. Analyse des tokens JWT:');
  
  if (supabaseAnonKey) {
    const anonClaims = decodeJwt(supabaseAnonKey);
    console.log('Token Anon claims:');
    console.log('- iss:', anonClaims.iss);
    console.log('- ref:', anonClaims.ref);
    console.log('- role:', anonClaims.role);
    
    if (anonClaims.role !== 'anon') {
      console.log('❌ ERREUR: Le token anon devrait avoir role="anon"');
    } else {
      console.log('✅ Token anon valide');
    }
  }
  
  if (supabaseServiceKey) {
    const serviceClaims = decodeJwt(supabaseServiceKey);
    console.log('\nToken Service Role claims:');
    console.log('- iss:', serviceClaims.iss);
    console.log('- ref:', serviceClaims.ref);
    console.log('- role:', serviceClaims.role);
    
    if (serviceClaims.role !== 'service_role') {
      console.log('❌ ERREUR: Le token service devrait avoir role="service_role"');
      if (serviceClaims.rose) {
        console.log('   ⚠️ Trouvé "rose" au lieu de "role" - Ceci est une erreur de typo!');
      }
    } else {
      console.log('✅ Token service role valide');
    }
  }
  
  // Tester la connexion
  console.log('\n3. Test de connexion:');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Impossible de tester la connexion: URL ou clé anon manquante');
  } else {
    try {
      console.log('Tentative de connexion avec la clé anon...');
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: anonData, error: anonError } = await anonClient
        .from('projects')
        .select('id')
        .limit(1);
      
      if (anonError) {
        console.log(`❌ Échec de la connexion anon: ${anonError.message}`);
        console.log(`   Hint: ${anonError.hint || 'Aucun'}`);
      } else {
        console.log(`✅ Connexion anon réussie, projets trouvés: ${anonData.length}`);
      }
    } catch (anonErr) {
      console.log(`❌ Exception lors de la connexion anon: ${anonErr.message}`);
    }
  }
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('\n❌ Impossible de tester la connexion service: URL ou clé service manquante');
  } else {
    try {
      console.log('\nTentative de connexion avec la clé service...');
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: serviceData, error: serviceError } = await serviceClient
        .from('canvas_layouts')
        .select('id')
        .limit(1);
      
      if (serviceError) {
        console.log(`❌ Échec de la connexion service: ${serviceError.message}`);
        console.log(`   Hint: ${serviceError.hint || 'Aucun'}`);
        
        // Vérifier si l'erreur est liée à une table manquante
        if (serviceError.message.includes('does not exist')) {
          console.log('\n⚠️ La table canvas_layouts n\'existe pas encore.');
          console.log('   Veuillez exécuter les migrations SQL pour créer la table.');
          
          // Essayer une table qui existe certainement
          console.log('\nTest avec une table connue (projects)...');
          const { data: testData, error: testError } = await serviceClient
            .from('projects')
            .select('id')
            .limit(1);
            
          if (testError) {
            console.log(`❌ Échec du test alternatif: ${testError.message}`);
          } else {
            console.log(`✅ Test alternatif réussi, la clé service fonctionne!`);
          }
        }
      } else {
        console.log(`✅ Connexion service réussie, layouts trouvés: ${serviceData.length}`);
      }
    } catch (serviceErr) {
      console.log(`❌ Exception lors de la connexion service: ${serviceErr.message}`);
    }
  }
  
  console.log('\n=== FIN DU DIAGNOSTIC ===');
}

// Exécuter la vérification
checkSupabaseConfig().catch(err => {
  console.error('Erreur lors de l\'exécution du diagnostic:', err);
});
