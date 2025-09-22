import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Nouvelle convention Next.js app router
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function getQuotaFromPriceId(priceId) {
  // Nouveaux Price IDs (mode test)
  if (priceId === 'price_1SA8gYRBtAFMZV17dLua6okj') return 100;    // Plan Start
  if (priceId === 'price_1SA8hHRBtAFMZV17URFPVdai') return 400;    // Plan Essentiel
  if (priceId === 'price_1SA8hiRBtAFMZV17KoZsrsaR') return 1000;   // Plan Pro
  if (priceId === 'price_1SA8hvRBtAFMZV17K5BcWUaR') return 1500;   // Plan Premium
  
  // Anciens Price IDs (compatibilité)
  if (priceId === 'price_1RdtbBIgKYOzHnxEwrDVPJdI') return 100;
  if (priceId === 'price_1RdtbYIgKYOzHnxE7NSZjxCP') return 500;
  if (priceId === 'price_xxx3') return 5000;
  
  return 0;
}

function getAddonQuotaFromPriceId(priceId) {
  // Nouveaux Price IDs des addons (mode test)
  if (priceId === 'price_1SA8joRBtAFMZV17iyiQb2lX') return 100;    // Pack +100 Photos
  if (priceId === 'price_1SA8kMRBtAFMZV17ltt0C0Lk') return 500;    // Pack +500 Photos
  if (priceId === 'price_1SA8kxRBtAFMZV172WkrMQEq') return 1000;   // Pack +1000 Photos
  
  // Anciens Price IDs des addons (compatibilité)
  if (priceId === 'price_1S9K5gIgKYOzHnxE8pKcberV') return 100;
  if (priceId === 'price_1S9K9SIgKYOzHnxE8IozRMRi') return 500;
  if (priceId === 'price_1S9KAqIgKYOzHnxE9IA5m0fJ') return 1000;
  
  return 0;
}

export async function POST(request) {
  console.log('[WEBHOOK] Stripe webhook endpoint called');
  console.log('[WEBHOOK] Environment:', process.env.NODE_ENV);
  console.log('[WEBHOOK] Request headers:', Object.fromEntries(request.headers.entries()));
  
  // Pour développement local : bypasser la vérification de signature
  const isLocal = process.env.NODE_ENV === 'development';
  console.log('[WEBHOOK] Is local environment:', isLocal);
  
  let event;
  try {
    if (isLocal) {
      // Mode développement : parse directement le JSON
      const body = await request.text();
      event = JSON.parse(body);
      console.log('[WEBHOOK] Event received (dev mode):', event.type);
    } else {
      // Mode production : vérification de signature normale
      const sig = request.headers.get('stripe-signature');
      console.log('[WEBHOOK] Stripe signature present:', !!sig);
      const buf = Buffer.from(await request.arrayBuffer());
      console.log('[WEBHOOK] Body length:', buf.length);
      event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
      console.log('[WEBHOOK] Event received (prod mode):', event.type, 'Event ID:', event.id);
    }
  } catch (err) {
    console.error('[WEBHOOK] Error processing event:', err.message);
    console.error('[WEBHOOK] Error stack:', err.stack);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Paiement initial via checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email || (session.customer_details && session.customer_details.email);
    
    // Vérifier si c'est un achat d'addon
    if (session.metadata && session.metadata.purchase_type === 'addon') {
      console.log('[WEBHOOK] Processing addon purchase for session:', session.id);
      console.log('[WEBHOOK] Session metadata:', session.metadata);
      
      const adminUserId = session.metadata.admin_user_id;
      const addonType = session.metadata.addon_type;
      const addonValue = parseInt(session.metadata.addon_value);
      const addonName = session.metadata.addon_name;
      const pricePaid = (session.amount_total || 0) / 100; // Convertir centimes en euros
      
      console.log('[WEBHOOK] Addon details:', {
        adminUserId,
        addonType,
        addonValue,
        addonName,
        pricePaid
      });

      if (!adminUserId) {
        console.error('[WEBHOOK] Missing admin_user_id in metadata');
        return new Response('Missing admin_user_id in metadata', { status: 400 });
      }

      // Insérer l'achat d'addon
      console.log('[WEBHOOK] Inserting addon purchase into database...');
      const { data: insertData, error: addonError } = await supabase
        .from('addon_purchases')
        .insert([{
          admin_user_id: adminUserId,
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent,
          addon_type: addonType,
          addon_value: addonValue,
          addon_name: addonName,
          price_paid: pricePaid,
          stripe_price_id: session.metadata.stripe_price_id || '',
          status: 'completed'
        }])
        .select(); // Ajouter select() pour récupérer les données insérées

      if (addonError) {
        console.error('[WEBHOOK] Error inserting addon purchase:', addonError);
        return new Response(`Error inserting addon purchase: ${addonError.message}`, { status: 500 });
      }

      console.log('[WEBHOOK] Addon purchase inserted successfully:', insertData);
      console.log('[WEBHOOK] Pack:', addonName, 'for user:', adminUserId, 'photos:', addonValue);
      console.log('[WEBHOOK] Note: Quota will be calculated dynamically by dashboard (base + addons)');
      return new Response(JSON.stringify({ received: true, addon_inserted: insertData }), { status: 200 });
    }

    // Traitement normal des abonnements
    const subscriptionId = session.subscription;
    console.log('[WEBHOOK] checkout.session.completed for email:', email, 'subscription:', subscriptionId);

    if (!email || !subscriptionId) {
      console.error('[WEBHOOK] Missing email or subscriptionId in session:', session);
      return new Response('Missing email or subscriptionId', { status: 400 });
    }

    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log('[WEBHOOK] Subscription retrieved:', subscription.id);
    } catch (e) {
      console.error('[WEBHOOK] Stripe subscription fetch error:', e.message);
      return new Response(`Stripe subscription fetch error: ${e.message}`, { status: 500 });
    }

    const priceId = subscription.items.data[0].price.id;
    const planName = subscription.items.data[0].price.nickname || subscription.items.data[0].price.id;
    const quota = getQuotaFromPriceId(priceId);

    // Récupérer l'utilisateur par email
    const { data: user, error: userError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.error('[WEBHOOK] User not found or error:', userError);
      return new Response('User not found', { status: 404 });
    }

    // Insérer le paiement initial dans admin_payments
    const { error: paymentError } = await supabase
      .from('admin_payments')
      .insert([{
        admin_user_id: user.id,
        stripe_customer_id: session.customer,
        stripe_subscription_id: subscriptionId,
        plan: planName,
        photo_quota: quota,
        photo_quota_reset_at: new Date().toISOString(),
        amount: subscription.items.data[0].price.unit_amount || 0,
        status: 'succeeded',
        stripe_payment_id: session.payment_intent || null,
        images_included: quota,
        stripe_subscription_status: subscription.status, // SÉCURISÉ: statut réel Stripe
        quota_expires_at: new Date(subscription.current_period_end * 1000).toISOString(), // Date d'expiration
        created_at: new Date().toISOString()
      }]);

    if (paymentError) {
      console.error('[WEBHOOK] Error inserting payment:', paymentError);
      return new Response('Error inserting payment', { status: 500 });
    }

    console.log('[WEBHOOK] Payment inserted successfully for user:', user.id);
  }

  // Paiements récurrents via invoice.paid
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;
    const amount = invoice.amount_paid;
    const status = invoice.status;
    const stripePaymentId = invoice.payment_intent || null;
    const createdAt = new Date(invoice.created * 1000).toISOString();

    // Récupérer l'utilisateur par customerId
    const { data: paymentUser, error: paymentUserError } = await supabase
      .from('admin_payments')
      .select('admin_user_id')
      .eq('stripe_customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (paymentUserError || !paymentUser) {
      console.error('[WEBHOOK] invoice.paid: No user found for customerId', customerId, paymentUserError);
      return new Response('No user found for this customer', { status: 404 });
    }

    // Récupérer le plan et quota du dernier paiement
    const { data: lastPayment } = await supabase
      .from('admin_payments')
      .select('plan, photo_quota, images_included')
      .eq('admin_user_id', paymentUser.admin_user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Insérer le paiement récurrent
    const { error: recurringPaymentError } = await supabase
      .from('admin_payments')
      .insert([{
        admin_user_id: paymentUser.admin_user_id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan: lastPayment?.plan || null,
        photo_quota: lastPayment?.photo_quota || null,
        photo_quota_reset_at: createdAt,
        amount: amount || 0,
        status: status,
        stripe_payment_id: stripePaymentId,
        images_included: lastPayment?.images_included || null,
        created_at: createdAt
      }]);

    if (recurringPaymentError) {
      console.error('[WEBHOOK] Error inserting recurring payment:', recurringPaymentError);
      return new Response('Error inserting recurring payment', { status: 500 });
    }

    console.log('[WEBHOOK] Recurring payment inserted for user:', paymentUser.admin_user_id);
  }

  // SÉCURITÉ: Gestion des abonnements suspendus/annulés
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    console.log('[WEBHOOK] Subscription status changed:', subscription.status, 'for subscription:', subscription.id);

    // Mettre à jour le statut de l'abonnement dans admin_payments
    const { error: updateError } = await supabase
      .from('admin_payments')
      .update({ 
        stripe_subscription_status: subscription.status,
        quota_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (updateError) {
      console.error('[WEBHOOK] Error updating subscription status:', updateError);
    } else {
      console.log('[WEBHOOK] Subscription status updated to:', subscription.status);
    }
  }

  // SÉCURITÉ: Gestion des abonnements supprimés
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    console.log('[WEBHOOK] Subscription deleted:', subscription.id);

    // Marquer l'abonnement comme annulé
    const { error: deleteError } = await supabase
      .from('admin_payments')
      .update({ 
        stripe_subscription_status: 'canceled',
        quota_expires_at: new Date().toISOString() // Expire immédiatement
      })
      .eq('stripe_subscription_id', subscription.id);

    if (deleteError) {
      console.error('[WEBHOOK] Error marking subscription as deleted:', deleteError);
    } else {
      console.log('[WEBHOOK] Subscription marked as canceled');
    }
  }

  // SÉCURITÉ: Gestion des paiements échoués
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    console.log('[WEBHOOK] Payment failed for subscription:', subscriptionId);

    // Marquer le paiement comme échoué
    const { error: failedError } = await supabase
      .from('admin_payments')
      .insert([{
        stripe_subscription_id: subscriptionId,
        status: 'failed',
        amount: invoice.amount_due || 0,
        stripe_payment_id: invoice.payment_intent || null,
        stripe_subscription_status: 'past_due',
        created_at: new Date().toISOString()
      }]);

    if (failedError) {
      console.error('[WEBHOOK] Error recording failed payment:', failedError);
    } else {
      console.log('[WEBHOOK] Failed payment recorded');
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
