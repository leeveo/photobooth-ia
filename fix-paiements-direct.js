// Script de réparation directe des paiements
const { createClient } = require('@supabase/supabase-js');

// Configuration manuelle des variables d'environnement
const SUPABASE_URL = 'https://fmhfbbdbsqccykewjqgh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtaGZiYmRic3FjY3lrZXdqcWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzA3MDMyNywiZXhwIjoyMDQyNjQ2MzI3fQ.gMZIgBQkT-5LF_VYaZr9pYMhiXsXXb_k5LsI1E2WYjw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixPayments() {
  console.log('🔧 RÉPARATION DIRECTE DES PAIEMENTS');
  console.log('=====================================');

  try {
    // 1. Lister tous les utilisateurs
    const { data: users, error: usersError } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Erreur users:', usersError.message);
      return;
    }

    console.log(`\n👥 UTILISATEURS TROUVÉS (${users.length}):`);
    users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email} (ID: ${user.id})`);
    });

    // 2. Lister tous les paiements
    const { data: payments, error: paymentsError } = await supabase
      .from('admin_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('❌ Erreur payments:', paymentsError.message);
      return;
    }

    console.log(`\n💳 PAIEMENTS TROUVÉS (${payments.length}):`);
    payments.forEach((payment, i) => {
      console.log(`${i + 1}. Plan: ${payment.plan} | Email: ${payment.admin_email || 'NULL'} | Quota: ${payment.photo_quota} | Status: ${payment.status}`);
    });

    // 3. Identifier les paiements orphelins
    const orphanPayments = payments.filter(p => !p.admin_email || p.admin_email.trim() === '');
    console.log(`\n🚨 PAIEMENTS ORPHELINS (${orphanPayments.length}):`);
    orphanPayments.forEach((payment, i) => {
      console.log(`${i + 1}. ID: ${payment.id} | Plan: ${payment.plan} | Quota: ${payment.photo_quota} | Montant: ${payment.amount/100}€`);
    });

    if (orphanPayments.length === 0) {
      console.log('✅ Aucun paiement orphelin trouvé !');
      return;
    }

    // 4. Proposer les emails disponibles
    console.log('\n📧 EMAILS DISPONIBLES POUR LIAISON:');
    const emails = [...new Set(users.map(u => u.email))];
    emails.forEach((email, i) => {
      console.log(`${i + 1}. ${email}`);
    });

    // 5. Auto-liaison avec le premier email trouvé (ou le plus récent)
    const targetEmail = users[0]?.email;
    const targetUser = users[0];

    if (!targetEmail) {
      console.log('❌ Aucun utilisateur trouvé pour la liaison');
      return;
    }

    console.log(`\n🔗 LIAISON AUTOMATIQUE AVEC: ${targetEmail}`);
    
    // 6. Lier tous les paiements orphelins
    for (const payment of orphanPayments) {
      const { data: updated, error: updateError } = await supabase
        .from('admin_payments')
        .update({
          admin_email: targetEmail,
          admin_user_id: targetUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)
        .select();

      if (updateError) {
        console.error(`❌ Erreur liaison paiement ${payment.id}:`, updateError.message);
      } else {
        console.log(`✅ Paiement ${payment.id} lié à ${targetEmail}`);
      }
    }

    console.log('\n🎉 RÉPARATION TERMINÉE !');
    console.log('➡️ Allez maintenant sur http://localhost:3000/photobooth-ia/admin/parametre');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

fixPayments();