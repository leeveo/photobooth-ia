import { buffer } from 'micro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gérer l'événement d'abonnement créé ou payé
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // Récupérer l'email ou metadata pour retrouver l'utilisateur
    const email = session.customer_email;
    const subscriptionId = session.subscription;

    // Trouver l'utilisateur dans Supabase et mettre à jour son abonnement
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

  res.json({ received: true });
}
