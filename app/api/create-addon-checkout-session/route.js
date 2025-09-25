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
  console.log('🔧 API create-addon-checkout-session appelée');
  
  try {
    const body = await req.json();
    const { priceId, addonType, addonValue, addonName, adminId } = body;
    console.log('📝 Paramètres reçus:', { priceId, addonType, addonValue, addonName, adminId });

    if (!priceId || !addonType || !addonValue || !addonName || !adminId) {
      console.error('❌ Paramètres manquants');
      return NextResponse.json(
        { error: 'Paramètres manquants pour l\'achat d\'addon' },
        { status: 400 }
      );
    }

    // Vérifier que le priceId n'est pas un placeholder
    if (priceId.includes('TO_REPLACE')) {
      console.error('❌ PriceId is a placeholder:', priceId);
      return NextResponse.json(
        { error: 'Configuration Stripe incomplète. Price ID addon non configuré.' },
        { status: 400 }
      );
    }

    // Vérifier les variables d'environnement Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return NextResponse.json({ error: 'Configuration Stripe manquante.' }, { status: 500 });
    }

    console.log('� Création session Stripe...');
    // Créer la session Stripe pour l'addon (même structure que l'API qui fonctionne)
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment', // Paiement unique, pas d'abonnement
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://photobooth.waibooth.app'}/photobooth-ia/admin/success?pack_name=${encodeURIComponent(addonName)}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://photobooth.waibooth.app'}/photobooth-ia/admin/choose-plan?addon_canceled=true`,
        metadata: {
          addon_type: addonType,
          addon_value: addonValue.toString(),
          addon_name: addonName,
          admin_user_id: adminId,
          purchase_type: 'addon' // Pour différencier des abonnements classiques
        },
      });
      console.log('✅ Session Stripe créée:', session.id);
    } catch (stripeErr) {
      console.error('💥 Erreur Stripe:', stripeErr);
      return NextResponse.json({ error: stripeErr.message }, { status: 500 });
    }

    return NextResponse.json({ sessionId: session.id });
    
  } catch (error) {
    console.error('💥 Erreur générale:', error);
    return NextResponse.json(
      { error: `Erreur lors de la création de la session de paiement: ${error.message}` },
      { status: 500 }
    );
  }
}