import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// Utilise la clé service role côté serveur
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { priceId, adminId, adminEmail } = body;
    console.log('[API] create-checkout-session called with:', { priceId, adminId, adminEmail });

    // Vérifie que le priceId est bien présent et n'est pas un placeholder
    if (!priceId) {
      console.error('[API] No priceId provided');
      return NextResponse.json({ error: 'Aucun priceId fourni.' }, { status: 400 });
    }

    if (priceId.includes('TO_REPLACE')) {
      console.error('[API] PriceId is a placeholder:', priceId);
      return NextResponse.json({ error: 'Configuration Stripe incomplète. Price ID non configuré.' }, { status: 400 });
    }

    // Vérifier les variables d'environnement Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[API] STRIPE_SECRET_KEY not configured');
      return NextResponse.json({ error: 'Configuration Stripe manquante.' }, { status: 500 });
    }

    // Si adminId est fourni mais pas d'email, récupérer l'email depuis la base
    let customerEmail = adminEmail;
    
    if (adminId && !customerEmail) {
      console.log('[API] Fetching admin email for ID:', adminId);
      const { data: adminUser, error: userError } = await supabase
        .from('admin_users')
        .select('email')
        .eq('id', adminId)
        .single();
      
      if (!userError && adminUser) {
        customerEmail = adminUser.email;
        console.log('[API] Found admin email:', customerEmail);
      }
    }

    // Créer la session Stripe Checkout
    let session;
    try {
      const sessionConfig = {
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/photobooth-ia/admin/choose-plan?success=1`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/photobooth-ia/admin/choose-plan?canceled=1`,
        metadata: {
          admin_user_id: adminId || 'unknown',
          price_id: priceId
        }
      };

      // Ajouter l'email si disponible
      if (customerEmail) {
        sessionConfig.customer_email = customerEmail;
        console.log('[API] Setting customer_email:', customerEmail);
      }

      session = await stripe.checkout.sessions.create(sessionConfig);
      console.log('[API] Stripe session created:', session.id);
    } catch (stripeErr) {
      console.error('[API] Stripe error:', stripeErr);
      return NextResponse.json({ error: stripeErr.message }, { status: 500 });
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('[API] General error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
