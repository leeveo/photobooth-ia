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

  // Gérer l'événement d'abonnement créé ou payé
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const subscriptionId = session.subscription;

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
          plan: session.display_items?.[0]?.plan?.nickname || null,
        })
        .eq('id', user.id);
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
