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
    const { priceId } = await req.json();

    // Récupérer l'utilisateur connecté (par exemple via session ou JWT)
    // Ici, on suppose que l'ID admin est dans un cookie ou header (à adapter selon ton auth)
    // const adminId = ...;

    // TODO: Récupérer l'email de l'utilisateur connecté
    // const email = ...;

    // Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // TODO: remplacer par l'email de l'utilisateur connecté
      // customer_email: email,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/photobooth-ia/admin/choose-plan?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/photobooth-ia/admin/choose-plan?canceled=1`,
      // metadata: { adminId },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
