/**
 * Script de test pour simuler la prise de photo et vérifier le décompte du quota
 * Utilisation: node test-quota-simulation.js
 */

const QuotaManager = require('./lib/quota-manager.js');

async function testQuotaFlow() {
  console.log('🧪 === TEST SIMULATION PRISE DE PHOTO ===');
  
  try {
    // Configuration de test
    const testConfig = {
      adminId: '01933c3d-a76a-7c7b-9bc1-1a00b37fa7fc', // Remplacez par votre admin ID
      projectId: 'test-project-' + Date.now(),
      sessionId: 'test-session-' + Date.now()
    };
    
    console.log('📋 Configuration:', testConfig);
    
    // 1. Vérifier le quota avant
    console.log('\n📊 1. Vérification quota AVANT prise de photo...');
    const quotaManager = new QuotaManager();
    const quotaBefore = await quotaManager.checkStatus(testConfig.adminId);
    console.log('Quota avant:', JSON.stringify(quotaBefore, null, 2));
    
    // 2. Simuler la prise de photo (appeler consumeAfterSuccess)
    console.log('\n📸 2. Simulation prise de photo...');
    const consumeResult = await quotaManager.consumeAfterSuccess(
      testConfig.sessionId, 
      testConfig.projectId
    );
    console.log('Résultat consommation:', JSON.stringify(consumeResult, null, 2));
    
    // 3. Vérifier le quota après
    console.log('\n📊 3. Vérification quota APRÈS prise de photo...');
    const quotaAfter = await quotaManager.checkStatus(testConfig.adminId);
    console.log('Quota après:', JSON.stringify(quotaAfter, null, 2));
    
    // 4. Comparer les résultats
    console.log('\n🔍 4. Comparaison des quotas:');
    console.log(`- Quota disponible AVANT: ${quotaBefore?.total?.remaining || 'N/A'}`);
    console.log(`- Quota disponible APRÈS: ${quotaAfter?.total?.remaining || 'N/A'}`);
    
    if (quotaBefore && quotaAfter) {
      const difference = (quotaBefore.total?.remaining || 0) - (quotaAfter.total?.remaining || 0);
      console.log(`- Différence: ${difference} (devrait être 1)`);
      
      if (difference === 1) {
        console.log('✅ SUCCESS: Le quota a bien été décrémenté !');
      } else {
        console.log('❌ ERROR: Le quota n\'a pas été correctement décrémenté !');
      }
    }
    
  } catch (error) {
    console.error('💥 Erreur lors du test:', error);
    console.error('Stack:', error.stack);
  }
}

// Test direct de l'API quota-manager
async function testQuotaAPI() {
  console.log('\n🌐 === TEST DIRECT API QUOTA-MANAGER ===');
  
  try {
    const testData = {
      adminId: '01933c3d-a76a-7c7b-9bc1-1a00b37fa7fc', // Remplacez par votre admin ID
      action: 'consume',
      sessionId: 'test-api-session-' + Date.now(),
      projectId: 'test-api-project-' + Date.now()
    };
    
    console.log('📋 Test API avec données:', testData);
    
    const response = await fetch('http://localhost:3000/api/quota-manager', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    console.log('📡 Réponse API:', JSON.stringify(result, null, 2));
    console.log('📊 Status:', response.status);
    
    if (response.ok && result.success) {
      console.log('✅ SUCCESS: L\'API quota-manager fonctionne !');
    } else {
      console.log('❌ ERROR: Problème avec l\'API quota-manager');
    }
    
  } catch (error) {
    console.error('💥 Erreur test API:', error);
  }
}

// Vérification des tables de base de données
async function checkDatabaseTables() {
  console.log('\n🗃️  === VÉRIFICATION TABLES BASE DE DONNÉES ===');
  
  try {
    // Test de connexion à Supabase
    const { createClient } = require('@supabase/supabase-js');
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('❌ Variables d\'environnement Supabase manquantes');
      return;
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Vérifier la table quota_usage
    console.log('🔍 Vérification table quota_usage...');
    const { data: quotaUsage, error: quotaError } = await supabase
      .from('quota_usage')
      .select('*')
      .limit(5);
    
    if (quotaError) {
      console.log('❌ Erreur quota_usage:', quotaError.message);
    } else {
      console.log('✅ Table quota_usage accessible');
      console.log('📊 Derniers enregistrements:', quotaUsage?.length || 0);
      if (quotaUsage?.length > 0) {
        console.log('🔍 Exemple:', quotaUsage[0]);
      }
    }
    
    // Vérifier la table sessions
    console.log('\n🔍 Vérification table sessions...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .limit(5);
    
    if (sessionsError) {
      console.log('❌ Erreur sessions:', sessionsError.message);
    } else {
      console.log('✅ Table sessions accessible');
      console.log('📊 Derniers enregistrements:', sessions?.length || 0);
      if (sessions?.length > 0) {
        console.log('🔍 Exemple:', sessions[0]);
      }
    }
    
  } catch (error) {
    console.error('💥 Erreur vérification DB:', error);
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('🚀 DÉBUT DES TESTS DE QUOTA\n');
  
  // 1. Vérifier les tables
  await checkDatabaseTables();
  
  // 2. Test du QuotaManager
  await testQuotaFlow();
  
  // 3. Test de l'API directement
  await testQuotaAPI();
  
  console.log('\n🏁 TESTS TERMINÉS');
}

// Démarrer les tests
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testQuotaFlow,
  testQuotaAPI,
  checkDatabaseTables
};