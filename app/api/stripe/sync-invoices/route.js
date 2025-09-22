import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return Response.json({ error: 'User ID required' }, { status: 400 });
    }

    // Récupérer tous les paiements de l'utilisateur
    const { data: payments, error: paymentsError } = await supabase
      .from('admin_payments')
      .select('*')
      .eq('admin_user_id', userId)
      .not('stripe_payment_id', 'is', null);

    if (paymentsError) {
      return Response.json({ error: 'Erreur récupération paiements: ' + paymentsError.message }, { status: 500 });
    }

    if (!payments || payments.length === 0) {
      return Response.json({ error: 'Aucun paiement Stripe trouvé' }, { status: 404 });
    }

    let updatedCount = 0;
    let errors = [];

    // Pour chaque paiement, récupérer la facture depuis Stripe
    for (const payment of payments) {
      try {
        if (payment.stripe_payment_id) {
          // Récupérer le payment intent depuis Stripe
          const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripe_payment_id);
          
          if (paymentIntent.invoice) {
            // Récupérer la facture
            const invoice = await stripe.invoices.retrieve(paymentIntent.invoice);
            
            // Mettre à jour le paiement avec les infos de facture
            const { error } = await supabase
              .from('admin_payments')
              .update({
                invoice_url: invoice.hosted_invoice_url,
                invoice_pdf: invoice.invoice_pdf,
                invoice_number: invoice.number,
                stripe_invoice_id: invoice.id
              })
              .eq('id', payment.id);

            if (!error) {
              updatedCount++;
            } else {
              errors.push(`Erreur mise à jour paiement ${payment.id}: ${error.message}`);
            }
          }
        }
      } catch (stripeError) {
        errors.push(`Erreur Stripe pour paiement ${payment.id}: ${stripeError.message}`);
      }
    }

    return Response.json({ 
      success: true, 
      message: `${updatedCount} factures synchronisées`,
      paymentsChecked: payments.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Erreur synchronisation factures:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}