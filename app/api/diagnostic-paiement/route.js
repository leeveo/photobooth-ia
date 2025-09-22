import { createClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  console.log('=== DIAGNOSTIC SYSTÈME PAIEMENT ===');

  try {
    // 1. Vérifier les derniers paiements
    const { data: adminPayments, error: paymentsError } = await supabase
      .from('admin_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (paymentsError) {
      return Response.json({ 
        error: 'Erreur admin_payments', 
        details: paymentsError.message 
      }, { status: 500 });
    }

    // 2. Vérifier les utilisateurs
    const { data: adminUsers, error: usersError } = await supabase
      .from('admin_users')
      .select('*')
      .limit(10);
    
    if (usersError) {
      return Response.json({ 
        error: 'Erreur admin_users', 
        details: usersError.message 
      }, { status: 500 });
    }

    // 3. Analyser les données
    const diagnostic = {
      timestamp: new Date().toISOString(),
      users_count: adminUsers?.length || 0,
      payments_count: adminPayments?.length || 0,
      derniers_paiements: adminPayments?.slice(0, 5).map(p => ({
        email: p.admin_email,
        plan: p.plan,
        quota: p.photo_quota,
        status: p.status,
        stripe_status: p.stripe_subscription_status,
        created_at: p.created_at,
        reset_at: p.photo_quota_reset_at,
        amount: p.amount
      })) || [],
      problemes_detectes: []
    };

    // 4. Détecter les problèmes
    if (adminPayments?.length === 0) {
      diagnostic.problemes_detectes.push('❌ Aucun paiement trouvé - Le webhook ne fonctionne pas');
    }

    adminPayments?.forEach(payment => {
      if (!payment.photo_quota || payment.photo_quota === 0) {
        diagnostic.problemes_detectes.push(`❌ Quota invalide pour ${payment.admin_email}`);
      }
      if (!payment.photo_quota_reset_at) {
        diagnostic.problemes_detectes.push(`❌ Date de reset manquante pour ${payment.admin_email}`);
      }
      if (payment.status !== 'succeeded') {
        diagnostic.problemes_detectes.push(`⚠️ Paiement non réussi pour ${payment.admin_email}: ${payment.status}`);
      }
    });

    // 5. Recommandations
    const recommandations = [];
    if (diagnostic.payments_count === 0) {
      recommandations.push('1. Vérifier que le webhook Stripe est configuré');
      recommandations.push('2. Vérifier les logs du webhook dans la console');
      recommandations.push('3. Tester un paiement en mode test');
    }

    if (diagnostic.problemes_detectes.length === 0) {
      recommandations.push('✅ Système semble fonctionnel');
    }

    return Response.json({
      ...diagnostic,
      recommandations,
      debug: {
        env: process.env.NODE_ENV,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configuré' : 'Manquant',
        service_role: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configuré' : 'Manquant'
      }
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur diagnostic', 
      details: error.message 
    }, { status: 500 });
  }
}