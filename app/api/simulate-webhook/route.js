export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function getQuotaFromPriceId(priceId) {
  if (priceId === 'price_1SA8gYRBtAFMZV17dLua6okj') return 100;    // Plan Start
  if (priceId === 'price_1SA8hHRBtAFMZV17URFPVdai') return 400;    // Plan Essentiel
  if (priceId === 'price_1SA8hiRBtAFMZV17KoZsrsaR') return 1000;   // Plan Pro
  if (priceId === 'price_1SA8hvRBtAFMZV17K5BcWUaR') return 1500;   // Plan Premium
  return 0;
}

export async function POST(request) {
  try {
    console.log("🎯 Simulation de l'événement webhook Stripe");

    // Événement checkout.session.completed simulé avec vos données exactes
    const simulatedEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_simulation',
          object: 'checkout.session',
          customer_email: 'jumpwiththedevil.evhtribute@gmail.com',
          customer_details: {
            email: 'jumpwiththedevil.evhtribute@gmail.com'
          },
          amount_total: 4900, // 49€ en centimes
          currency: 'eur',
          payment_intent: 'pi_3SAAmBRBtAFMZV171J8VpUCz',
          subscription: 'sub_1SAAmDRBtAFMZV17LDGzco4x',
          line_items: {
            data: [{
              price: {
                id: 'price_1SA8hHRBtAFMZV17URFPVdai'
              }
            }]
          },
          metadata: {}
        }
      }
    };

    const session = simulatedEvent.data.object;
    const email = session.customer_email;
    const priceId = 'price_1SA8hHRBtAFMZV17URFPVdai';
    const photoQuota = getQuotaFromPriceId(priceId);

    console.log(`[WEBHOOK-SIM] Processing checkout.session.completed for ${email}`);
    console.log(`[WEBHOOK-SIM] Price ID: ${priceId}, Quota: ${photoQuota}`);

    // 1. Trouver l'utilisateur
    const { data: adminUser, error: userError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !adminUser) {
      console.error('[WEBHOOK-SIM] Admin user not found:', email);
      return Response.json({ 
        error: `Admin user not found: ${email}`, 
        details: userError?.message 
      }, { status: 404 });
    }

    console.log(`[WEBHOOK-SIM] Found admin user: ${adminUser.email} (ID: ${adminUser.id})`);

    // 2. Créer le paiement
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);

    const paymentData = {
      admin_user_id: adminUser.id,
      admin_email: email,
      stripe_customer_id: 'cus_T6NXAX6Fyh8STh',
      stripe_subscription_id: session.subscription || '',
      plan: priceId,
      photo_quota: photoQuota,
      photo_quota_reset_at: resetDate.toISOString(),
      amount: session.amount_total,
      status: 'succeeded',
      stripe_payment_id: session.payment_intent,
      images_included: photoQuota,
      stripe_subscription_status: 'active',
      quota_expires_at: resetDate.toISOString(),
      stripe_invoice_id: 'in_1SAAmBRBtAFMZV17vhZjw1WB',
      invoice_number: 'BFC33A55-0004'
    };

    console.log('[WEBHOOK-SIM] Inserting payment data:', paymentData);

    const { data: insertedPayment, error: insertError } = await supabase
      .from('admin_payments')
      .insert(paymentData)
      .select()
      .single();

    if (insertError) {
      console.error('[WEBHOOK-SIM] Error inserting payment:', insertError);
      return Response.json({ 
        error: 'Error inserting payment', 
        details: insertError.message,
        code: insertError.code 
      }, { status: 500 });
    }

    console.log('[WEBHOOK-SIM] ✅ Payment inserted successfully');

    // 3. Vérification
    const { data: userPayments, error: verifyError } = await supabase
      .from('admin_payments')
      .select('*')
      .eq('admin_user_id', adminUser.id);

    return Response.json({
      success: true,
      message: "🎉 Webhook simulé avec succès !",
      webhook_simulation: {
        event_type: 'checkout.session.completed',
        customer_email: email,
        amount: session.amount_total / 100,
        price_id: priceId
      },
      payment_created: {
        id: insertedPayment.id,
        plan: 'Plan Essentiel',
        quota: photoQuota,
        amount_euros: session.amount_total / 100,
        expires_at: resetDate.toISOString()
      },
      user_verification: {
        email: adminUser.email,
        user_id: adminUser.id,
        total_payments: userPayments?.length || 0,
        total_quota: userPayments?.reduce((sum, p) => sum + (p.photo_quota || 0), 0) || 0
      },
      next_steps: [
        "✅ 1. Déconnectez-vous complètement",
        "✅ 2. Reconnectez-vous avec jumpwiththedevil.evhtribute@gmail.com",
        "✅ 3. Allez sur /photobooth-ia/admin/parametre",
        "✅ 4. Votre quota devrait apparaître : " + photoQuota + " photos",
        "✅ 5. Pour les futurs paiements, configurez Stripe CLI (voir stripe-webhook-setup.md)"
      ]
    });

  } catch (error) {
    console.error('[WEBHOOK-SIM] Global error:', error);
    return Response.json({ 
      error: 'Webhook simulation failed', 
      details: error.message 
    }, { status: 500 });
  }
}