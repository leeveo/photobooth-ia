// Test script pour déboguer le système de quota
const QuotaManager = require('./lib/quota-manager');

async function testQuotaSystem() {
  console.log('🧪 Test du système de quota...');
  
  // Simuler un adminId - vous devez le remplacer par un vrai ID
  const testAdminId = 'your-admin-id-here'; // REMPLACEZ PAR VOTRE VRAI ADMIN ID
  
  try {
    // 1. Vérifier le quota actuel
    console.log('\n📊 1. Vérification du quota actuel...');
    const manager = new QuotaManager();
    const currentQuota = await manager.checkQuota();
    console.log('Quota actuel:', JSON.stringify(currentQuota, null, 2));
    
    // 2. Tester l'API quota-manager directement
    console.log('\n🔌 2. Test API quota-manager...');
    const response = await fetch('http://localhost:3000/api/quota-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        adminId: testAdminId, 
        action: 'check' 
      })
    });
    
    if (response.ok) {
      const quotaData = await response.json();
      console.log('Réponse API quota-manager:', JSON.stringify(quotaData, null, 2));
    } else {
      console.error('Erreur API:', response.status, response.statusText);
    }
    
    // 3. Vérifier la table quota_usage directement
    console.log('\n🗄️ 3. Vérification table quota_usage...');
    // Vous devrez adapter cette partie selon votre setup de base de données
    
  } catch (error) {
    console.error('❌ Erreur test:', error);
  }
}

// Fonction pour tester la consommation de quota
async function testQuotaConsumption(sessionId, projectId) {
  console.log('\n🔥 Test consommation quota...');
  
  try {
    const manager = new QuotaManager();
    const result = await manager.consumeAfterSuccess(sessionId, projectId);
    console.log('Résultat consommation:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Erreur consommation:', error);
  }
}

console.log('🚀 Démarrage des tests...');
console.log('⚠️  IMPORTANT: Remplacez testAdminId par votre vrai ID admin !');

// Uncomment to run tests
// testQuotaSystem();

// Pour tester la consommation avec de vrais IDs:
// testQuotaConsumption('session-id-here', 'project-id-here');

module.exports = { testQuotaSystem, testQuotaConsumption };