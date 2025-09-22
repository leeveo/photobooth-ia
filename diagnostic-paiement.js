// Script de diagnostic pour vérifier le paiement et les quotas

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function diagnosticPaiement() {
  console.log('=== DIAGNOSTIC SYSTÈME PAIEMENT ===\n');

  try {
    // 1. Vérifier les tables existantes
    console.log('1. 📊 Vérification des tables...');
    
    const { data: adminUsers, error: usersError } = await supabase
      .from('admin_users')
      .select('*')
      .limit(5);
    
    console.log('   - admin_users:', adminUsers?.length || 0, 'utilisateurs');
    if (usersError) console.log('   ❌ Erreur admin_users:', usersError.message);

    const { data: adminPayments, error: paymentsError } = await supabase
      .from('admin_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('   - admin_payments:', adminPayments?.length || 0, 'paiements');
    if (paymentsError) console.log('   ❌ Erreur admin_payments:', paymentsError.message);

    // 2. Afficher les derniers paiements
    console.log('\n2. 💳 Derniers paiements:');
    if (adminPayments?.length > 0) {
      adminPayments.forEach((payment, i) => {
        console.log(`   ${i+1}. ${payment.admin_email} - Plan: ${payment.plan} - Quota: ${payment.photo_quota} - Status: ${payment.status}`);
        console.log(`      Created: ${payment.created_at} - Reset: ${payment.photo_quota_reset_at}`);
      });
    } else {
      console.log('   ❌ Aucun paiement trouvé !');
    }

    // 3. Vérifier les webhooks récents (via logs ou erreurs)
    console.log('\n3. 🔄 Test de connexion webhook...');
    
    // Simulation d'un test webhook
    const testWebhookData = {
      type: 'test.webhook',
      data: {
        object: {
          customer_email: 'test@example.com',
          amount_total: 1900, // 19€ en centimes
          id: 'test_session_123'
        }
      }
    };

    console.log('   - Structure webhook test:', JSON.stringify(testWebhookData, null, 2));

    // 4. Vérifier la structure de la table admin_payments
    console.log('\n4. 🗃️ Structure de la table admin_payments:');
    const { data: tableInfo, error: infoError } = await supabase
      .from('admin_payments')
      .select('*')
      .limit(1);
    
    if (tableInfo?.length > 0) {
      console.log('   Colonnes disponibles:', Object.keys(tableInfo[0]));
    } else {
      console.log('   ❌ Table vide ou inaccessible');
    }

    // 5. Tester le quota-manager
    console.log('\n5. 🎯 Test quota-manager simulation:');
    
    if (adminPayments?.length > 0) {
      const lastPayment = adminPayments[0];
      console.log(`   - Dernier paiement: ${lastPayment.admin_email}`);
      console.log(`   - Photo quota: ${lastPayment.photo_quota}`);
      console.log(`   - Reset date: ${lastPayment.photo_quota_reset_at}`);
      console.log(`   - Status: ${lastPayment.stripe_subscription_status}`);
      
      // Simuler ce que fait quota-manager
      const now = new Date();
      const resetDate = new Date(lastPayment.photo_quota_reset_at);
      const isExpired = now > resetDate;
      
      console.log(`   - Quota expiré: ${isExpired ? '❌ OUI' : '✅ NON'}`);
      console.log(`   - Quota disponible: ${isExpired ? 0 : lastPayment.photo_quota}`);
    }

  } catch (error) {
    console.error('❌ Erreur pendant le diagnostic:', error);
  }
}

// Exécuter le diagnostic
diagnosticPaiement().then(() => {
  console.log('\n=== FIN DU DIAGNOSTIC ===');
  process.exit(0);
}).catch(console.error);