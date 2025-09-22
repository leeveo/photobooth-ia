export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    console.log("🚀 Création directe du paiement Plan Essentiel");

    // Données exactes de votre paiement Stripe
    const userEmail = "jumpwiththedevil.evhtribute@gmail.com";
    const userId = "e5a63185-cbcc-476f-83dc-6526e58c68c9";
    const amount = 4900; // 49€ en centimes
    const priceId = "price_1SA8hHRBtAFMZV17URFPVdai";
    const invoiceId = "in_1SAAmBRBtAFMZV17vhZjw1WB";
    const photoQuota = 400; // Plan Essentiel = 400 photos

    // Calcul des dates
    const now = new Date();
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);

    // Données du paiement
    const paymentData = {
      admin_user_id: userId,
      admin_email: userEmail,
      stripe_customer_id: "cus_T6NXAX6Fyh8STh", // De votre log Stripe
      stripe_subscription_id: "sub_1SAAmDRBtAFMZV17LDGzco4x", // De votre log Stripe
      plan: priceId,
      photo_quota: photoQuota,
      photo_quota_reset_at: resetDate.toISOString(),
      amount: amount,
      status: 'succeeded',
      stripe_payment_id: "pi_3SAAmBRBtAFMZV171J8VpUCz", // Payment Intent de votre log
      images_included: photoQuota,
      stripe_subscription_status: 'active',
      quota_expires_at: resetDate.toISOString(),
      stripe_invoice_id: invoiceId,
      invoice_number: "BFC33A55-0004", // De votre log Stripe
      created_at: now.toISOString()
    };

    console.log("💾 Insertion du paiement:", paymentData);

    // Insertion dans admin_payments
    const { data: newPayment, error: insertError } = await supabase
      .from('admin_payments')
      .insert(paymentData)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Erreur insertion:", insertError);
      return Response.json({ 
        error: 'Erreur insertion paiement', 
        details: insertError.message,
        code: insertError.code
      }, { status: 500 });
    }

    console.log("✅ Paiement créé:", newPayment.id);

    // Vérification finale
    const { data: userPayments, error: verifyError } = await supabase
      .from('admin_payments')
      .select('*')
      .eq('admin_user_id', userId);

    return Response.json({
      success: true,
      message: "🎉 PAIEMENT CRÉÉ AVEC SUCCÈS !",
      payment_details: {
        id: newPayment.id,
        plan: "Plan Essentiel",
        quota: photoQuota,
        amount_euros: amount / 100,
        expires_at: resetDate.toISOString(),
        status: "active"
      },
      user_info: {
        email: userEmail,
        user_id: userId,
        total_payments: userPayments?.length || 0,
        total_quota: userPayments?.reduce((sum, p) => sum + (p.photo_quota || 0), 0) || 0
      },
      instructions: [
        "✅ 1. Déconnectez-vous complètement de votre compte",
        "✅ 2. Reconnectez-vous avec jumpwiththedevil.evhtribute@gmail.com",
        "✅ 3. Allez sur /photobooth-ia/admin/parametre",
        "✅ 4. Vous devriez voir votre quota : " + photoQuota + " photos",
        "✅ 5. Testez la génération d'une image"
      ]
    });

  } catch (error) {
    console.error('Erreur globale:', error);
    return Response.json({ 
      error: 'Erreur serveur', 
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}