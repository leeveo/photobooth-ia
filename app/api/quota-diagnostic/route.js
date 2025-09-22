import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { adminId } = await req.json();
    
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID requis' }, { status: 400 });
    }

    // Récupérer tous les paiements pour diagnostic
    const { data: payments, error } = await supabase
      .from('admin_payments')
      .select('*')
      .eq('admin_user_id', adminId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = new Date().toISOString();
    
    const analysis = {
      adminId,
      totalPayments: payments.length,
      paymentsAnalysis: payments.map(payment => ({
        id: payment.id,
        created_at: payment.created_at,
        status: payment.status,
        stripe_subscription_status: payment.stripe_subscription_status,
        photo_quota: payment.photo_quota,
        photo_quota_reset_at: payment.photo_quota_reset_at,
        quota_expires_at: payment.quota_expires_at,
        amount: payment.amount,
        plan: payment.plan,
        // Vérifications
        validations: {
          statusOK: payment.status === 'succeeded',
          subscriptionOK: ['active', 'trialing'].includes(payment.stripe_subscription_status),
          notExpired: payment.photo_quota_reset_at ? new Date(payment.photo_quota_reset_at) > new Date() : false,
          quotaNotExpired: payment.quota_expires_at ? new Date(payment.quota_expires_at) > new Date() : true
        }
      })),
      recommendations: []
    };

    // Analyser et donner des recommandations
    const validPayments = analysis.paymentsAnalysis.filter(p => 
      p.validations.statusOK && 
      p.validations.subscriptionOK && 
      p.validations.notExpired
    );

    if (validPayments.length === 0) {
      analysis.recommendations.push("Aucun paiement valide trouvé");
      
      const hasSucceededPayments = analysis.paymentsAnalysis.some(p => p.validations.statusOK);
      const hasActiveSubscriptions = analysis.paymentsAnalysis.some(p => p.validations.subscriptionOK);
      
      if (!hasSucceededPayments) {
        analysis.recommendations.push("Problème: Aucun paiement avec status 'succeeded'");
      }
      if (!hasActiveSubscriptions) {
        analysis.recommendations.push("Problème: Aucun abonnement avec status 'active' ou 'trialing'");
      }
    } else {
      analysis.recommendations.push(`${validPayments.length} paiement(s) valide(s) trouvé(s)`);
      const latestValid = validPayments[0];
      analysis.recommendations.push(`Dernier paiement valide: ${latestValid.photo_quota} photos, reset: ${latestValid.photo_quota_reset_at}`);
    }

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('[QUOTA_DIAGNOSTIC] Erreur:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}