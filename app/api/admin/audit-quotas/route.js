import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    console.log('[AUDIT] Début audit des quotas...');

    // 1. Récupérer tous les utilisateurs avec des paiements
    const { data: payments, error: paymentsError } = await supabase
      .from('admin_payments')
      .select(`
        id,
        admin_user_id,
        stripe_subscription_id,
        stripe_subscription_status,
        photo_quota,
        status,
        created_at,
        quota_expires_at,
        admin_users(email)
      `)
      .not('stripe_subscription_id', 'is', null)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      throw new Error(`Erreur récupération paiements: ${paymentsError.message}`);
    }

    const auditResults = [];
    const subscriptionCache = new Map();

    // 2. Vérifier chaque abonnement dans Stripe
    for (const payment of payments) {
      try {
        let stripeSubscription;
        
        // Cache pour éviter les appels API répétés
        if (subscriptionCache.has(payment.stripe_subscription_id)) {
          stripeSubscription = subscriptionCache.get(payment.stripe_subscription_id);
        } else {
          stripeSubscription = await stripe.subscriptions.retrieve(payment.stripe_subscription_id);
          subscriptionCache.set(payment.stripe_subscription_id, stripeSubscription);
        }

        const isActive = ['active', 'trialing'].includes(stripeSubscription.status);
        const isExpired = payment.quota_expires_at ? new Date(payment.quota_expires_at) < new Date() : false;
        const dbStatus = payment.stripe_subscription_status;
        const realStatus = stripeSubscription.status;

        // Problème détecté ?
        const hasIssue = !isActive || isExpired || (dbStatus !== realStatus);

        auditResults.push({
          admin_user_id: payment.admin_user_id,
          email: payment.admin_users?.email || 'N/A',
          payment_id: payment.id,
          subscription_id: payment.stripe_subscription_id,
          db_status: dbStatus,
          real_stripe_status: realStatus,
          photo_quota: payment.photo_quota,
          expires_at: payment.quota_expires_at,
          is_expired: isExpired,
          is_active_in_stripe: isActive,
          status_mismatch: dbStatus !== realStatus,
          has_issue: hasIssue,
          recommended_action: hasIssue ? getRecommendedAction(isActive, isExpired, dbStatus, realStatus) : 'OK'
        });

      } catch (stripeError) {
        auditResults.push({
          admin_user_id: payment.admin_user_id,
          email: payment.admin_users?.email || 'N/A',
          payment_id: payment.id,
          subscription_id: payment.stripe_subscription_id,
          error: stripeError.message,
          has_issue: true,
          recommended_action: 'STRIPE_ERROR - Vérifier manuellement'
        });
      }
    }

    // 3. Statistiques
    const totalUsers = auditResults.length;
    const usersWithIssues = auditResults.filter(r => r.has_issue).length;
    const activeSubscriptions = auditResults.filter(r => r.is_active_in_stripe).length;

    return NextResponse.json({
      summary: {
        total_users: totalUsers,
        users_with_issues: usersWithIssues,
        active_subscriptions: activeSubscriptions,
        audit_timestamp: new Date().toISOString()
      },
      results: auditResults,
      actions_needed: auditResults.filter(r => r.has_issue)
    });

  } catch (error) {
    console.error('[AUDIT] Erreur:', error);
    return NextResponse.json(
      { error: `Erreur audit: ${error.message}` },
      { status: 500 }
    );
  }
}

function getRecommendedAction(isActive, isExpired, dbStatus, realStatus) {
  if (!isActive) {
    return 'RESET_QUOTA - Abonnement inactif dans Stripe';
  }
  if (isExpired) {
    return 'UPDATE_EXPIRY - Quota expiré';
  }
  if (dbStatus !== realStatus) {
    return `UPDATE_STATUS - DB: ${dbStatus} → Stripe: ${realStatus}`;
  }
  return 'UNKNOWN_ISSUE';
}

// Endpoint pour corriger automatiquement les problèmes détectés
export async function POST(req) {
  try {
    const { action, admin_user_id, subscription_id } = await req.json();
    
    console.log('[AUDIT_FIX] Action:', action, 'User:', admin_user_id);

    switch (action) {
      case 'RESET_QUOTA':
        // Marquer l'abonnement comme inactif et expirer le quota
        const { error: resetError } = await supabase
          .from('admin_payments')
          .update({
            stripe_subscription_status: 'canceled',
            quota_expires_at: new Date().toISOString()
          })
          .eq('admin_user_id', admin_user_id)
          .eq('stripe_subscription_id', subscription_id);

        if (resetError) throw resetError;
        return NextResponse.json({ success: true, message: 'Quota reset' });

      case 'UPDATE_STATUS':
        // Récupérer le vrai statut depuis Stripe et mettre à jour
        const subscription = await stripe.subscriptions.retrieve(subscription_id);
        const { error: updateError } = await supabase
          .from('admin_payments')
          .update({
            stripe_subscription_status: subscription.status,
            quota_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('admin_user_id', admin_user_id)
          .eq('stripe_subscription_id', subscription_id);

        if (updateError) throw updateError;
        return NextResponse.json({ success: true, message: 'Statut mis à jour' });

      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
    }

  } catch (error) {
    console.error('[AUDIT_FIX] Erreur:', error);
    return NextResponse.json(
      { error: `Erreur correction: ${error.message}` },
      { status: 500 }
    );
  }
}