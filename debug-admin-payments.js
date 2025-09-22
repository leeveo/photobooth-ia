// Script pour déboguer les données de la table admin_payments
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugAdminPayments() {
  console.log('🔍 Debug de la table admin_payments...\n');

  // 1. Récupérer quelques exemples de paiements
  const { data: payments, error } = await supabase
    .from('admin_payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log('📊 Exemples de paiements:');
  payments.forEach((payment, index) => {
    console.log(`\n${index + 1}. Paiement ID: ${payment.id}`);
    console.log(`   Admin User ID: ${payment.admin_user_id}`);
    console.log(`   Status: ${payment.status}`);
    console.log(`   Photo Quota: ${payment.photo_quota}`);
    console.log(`   Photo Quota Reset At: ${payment.photo_quota_reset_at}`);
    console.log(`   Stripe Subscription Status: ${payment.stripe_subscription_status || 'NULL'}`);
    console.log(`   Quota Expires At: ${payment.quota_expires_at || 'NULL'}`);
    console.log(`   Created At: ${payment.created_at}`);
  });

  // 2. Compter les paiements par statut
  const { data: statusCount } = await supabase
    .from('admin_payments')
    .select('status, stripe_subscription_status')
    .neq('status', null);

  console.log('\n📈 Répartition des statuts:');
  const statusStats = {};
  statusCount.forEach(payment => {
    const key = `${payment.status}/${payment.stripe_subscription_status || 'NULL'}`;
    statusStats[key] = (statusStats[key] || 0) + 1;
  });

  Object.entries(statusStats).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  // 3. Vérifier les colonnes qui existent
  const { data: tableInfo } = await supabase
    .from('admin_payments')
    .select('*')
    .limit(1)
    .single();

  if (tableInfo) {
    console.log('\n🏗️ Colonnes disponibles:');
    Object.keys(tableInfo).forEach(column => {
      console.log(`   - ${column}`);
    });
  }
}

debugAdminPayments().catch(console.error);