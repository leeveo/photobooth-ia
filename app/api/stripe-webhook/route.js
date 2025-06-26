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

  // Paiement initial via checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
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

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
