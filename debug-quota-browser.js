// Script à copier-coller dans la console du navigateur pour diagnostiquer le quota

(function() {
console.log('🔍 DIAGNOSTIC QUOTA AUTOMATIQUE');
console.log('================================');

// 1. Récupérer l'admin ID de la session
const session = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
if (!session) {
  console.error('❌ Aucune session trouvée');
  return;
}

let adminData;
try {
  adminData = JSON.parse(atob(session));
} catch (e) {
  try {
    adminData = JSON.parse(session);
  } catch (e2) {
    console.error('❌ Impossible de décoder la session');
    return;
  }
}

const adminId = adminData.user_id || adminData.userId;
const email = adminData.email;

console.log('📧 Email connecté:', email);
console.log('🆔 Admin ID:', adminId);

// 2. Tester le quota via l'API
fetch('/api/quota-manager', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({adminId: adminId, action: 'check'})
})
.then(r => r.json())
.then(data => {
  console.log('\n📊 RÉSULTATS QUOTA:');
  console.log('===================');
  console.log('📅 Plan mensuel:');
  console.log('  - Quota:', data.monthly.quota);
  console.log('  - Consommé:', data.monthly.consumed);
  console.log('  - Restant:', data.monthly.remaining);
  console.log('  - Plan gratuit:', data.monthly.isFreePlan);
  console.log('  - Reset:', data.monthly.resetAt);
  
  console.log('\n📦 Packs addon:');
  console.log('  - Total:', data.addons.total);
  console.log('  - Restant:', data.addons.remaining);
  console.log('  - Nombre de packs:', data.addons.packs.length);
  
  console.log('\n🎯 TOTAL:');
  console.log('  - Quota total:', data.total.quota);
  console.log('  - Consommé total:', data.total.consumed);
  console.log('  - Restant total:', data.total.remaining);
  
  console.log('\n🔧 Prochaine source:', data.nextQuotaSource);
  
  // 3. Diagnostic
  console.log('\n🩺 DIAGNOSTIC:');
  if (data.monthly.isFreePlan && data.monthly.quota === 3) {
    console.log('⚠️  Vous êtes sur le plan GRATUIT (3 photos)');
    console.log('💡 Solution: Il faut exécuter le script SQL pour ajouter votre plan payant');
  } else if (data.monthly.quota === 100) {
    console.log('✅ Plan de 100 photos détecté et actif');
  } else {
    console.log('📋 Plan actuel:', data.monthly.quota, 'photos');
  }
  
  if (data.addons.total > 0) {
    console.log('✅ Addons détectés:', data.addons.total, 'photos');
  } else {
    console.log('⚠️  Aucun addon détecté');
  }
})
.catch(err => {
  console.error('❌ Erreur API:', err);
});

})(); // Fin de la fonction auto-exécutée