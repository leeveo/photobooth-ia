import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Nouvelle convention Next.js app router
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  const sig = request.headers.get('stripe-signature');
  const buf = Buffer.from(await request.arrayBuffer());

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Utilitaire pour obtenir le quota selon le plan
  function getQuotaFromPriceId(priceId) {
    if (priceId === 'price_1RdtbBIgKYOzHnxEwrDVPJdI') return 100;
    if (priceId === 'price_1RdtbYIgKYOzHnxE7NSZjxCP') return 500;
    if (priceId === 'price_xxx3') return 5000;
    return 0;
  }

  // Gérer l'événement d'abonnement créé ou payé
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const subscriptionId = session.subscription;

    // Récupérer la subscription Stripe pour obtenir le priceId
    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    } catch (e) {
      return new Response(`Stripe subscription fetch error: ${e.message}`, { status: 500 });
    }
    const priceId = subscription.items.data[0].price.id;
    const planName = subscription.items.data[0].price.nickname || subscription.items.data[0].price.id;
    const quota = getQuotaFromPriceId(priceId);

    // Mettre à jour l'utilisateur dans Supabase
    const { data: user } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .single();

    if (user) {
      await supabase
        .from('admin_users')
        .update({
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscriptionId,
          plan: planName,
          photo_quota: quota,
          photo_quota_reset_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }
  }

  // Tu peux aussi gérer d'autres événements Stripe ici (ex: abonnement annulé, etc.)

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
