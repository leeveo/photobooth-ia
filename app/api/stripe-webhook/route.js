import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Nouvelle convention Next.js app router
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function getQuotaFromPriceId(priceId) {
  if (priceId === 'price_1RdtbBIgKYOzHnxEwrDVPJdI') return 100;
  if (priceId === 'price_1RdtbYIgKYOzHnxE7NSZjxCP') return 500;
  if (priceId === 'price_xxx3') return 5000;
  return 0;
}

export async function POST(request) {
  console.log('[WEBHOOK] Stripe webhook endpoint called');
  const sig = request.headers.get('stripe-signature');
  const buf = Buffer.from(await request.arrayBuffer());

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('[WEBHOOK] Event received:', event.type);
  } catch (err) {
    console.error('[WEBHOOK] Signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Gérer l'événement d'abonnement créé ou payé
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // Correction ici : récupère l'email depuis customer_details si besoin
    const email = session.customer_email || (session.customer_details && session.customer_details.email);
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

    // Log pour debug
    console.log('[WEBHOOK] priceId:', priceId, 'planName:', planName, 'quota:', quota);

    // Mettre à jour l'utilisateur dans Supabase
    const { data: user, error: userError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.error('[WEBHOOK] User not found or error:', userError);
      return new Response('User not found', { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('admin_users')
      .update({
        stripe_customer_id: session.customer,
        stripe_subscription_id: subscriptionId,
        plan: planName,
        photo_quota: quota,
        photo_quota_reset_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[WEBHOOK] Error updating user:', updateError);
      return new Response('Error updating user', { status: 500 });
    }

    console.log('[WEBHOOK] User updated successfully:', user.id);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
