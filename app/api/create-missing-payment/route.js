export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    const { 
      customerEmail = "jumpwiththedevil.evhtribute@gmail.com",
      amount = 4900,
      priceId = "price_1SA8hHRBtAFMZV17URFPVdai",
      invoiceId = "in_1SAAmBRBtAFMZV17vhZjw1WB"
    } = await request.json();

    console.log("🔄 Création manuelle du paiement Stripe manqué");

    // 1. Récupérer l'utilisateur
    const { data: adminUser, error: userError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', customerEmail)
      .single();

    if (userError || !adminUser) {
      return Response.json({ 
        error: `Utilisateur non trouvé: ${customerEmail}`, 
        details: userError?.message 
      }, { status: 404 });
    }

    console.log("👤 Utilisateur trouvé:", adminUser.email, "ID:", adminUser.id);

    // 2. Déterminer le quota selon le Price ID
    function getQuotaFromPriceId(priceId) {
      if (priceId === 'price_1SA8gYRBtAFMZV17dLua6okj') return 100;    // Plan Start
      if (priceId === 'price_1SA8hHRBtAFMZV17URFPVdai') return 400;    // Plan Essentiel
      if (priceId === 'price_1SA8hiRBtAFMZV17KoZsrsaR') return 1000;   // Plan Pro
      if (priceId === 'price_1SA8hvRBtAFMZV17K5BcWUaR') return 1500;   // Plan Premium
      return 0;
    }

    function getPlanNameFromPriceId(priceId) {
      if (priceId === 'price_1SA8gYRBtAFMZV17dLua6okj') return 'Plan Start';
      if (priceId === 'price_1SA8hHRBtAFMZV17URFPVdai') return 'Plan Essentiel';
      if (priceId === 'price_1SA8hiRBtAFMZV17KoZsrsaR') return 'Plan Pro';
      if (priceId === 'price_1SA8hvRBtAFMZV17K5BcWUaR') return 'Plan Premium';
      return 'Plan Inconnu';
    }

    const photoQuota = getQuotaFromPriceId(priceId);
    const planName = getPlanNameFromPriceId(priceId);

    console.log("📊 Quota calculé:", photoQuota, "photos pour", planName);

    // 3. Créer l'entrée de paiement
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);

    const paymentData = {
      admin_user_id: adminUser.id,
      admin_email: customerEmail,
      stripe_customer_id: `manual_fix_${Date.now()}`,
      stripe_subscription_id: `manual_sub_${Date.now()}`,
      plan: priceId,
      photo_quota: photoQuota,
      photo_quota_reset_at: resetDate.toISOString(),
      amount: amount,
      status: 'succeeded',
      stripe_payment_id: `manual_payment_${invoiceId}`,
      images_included: photoQuota,
      stripe_subscription_status: 'active',
      quota_expires_at: resetDate.toISOString(),
      stripe_invoice_id: invoiceId,
      invoice_number: `MANUAL-${Date.now()}`
    };

    console.log("💾 Données paiement à insérer:", paymentData);

    // 4. Insérer dans admin_payments
    const { data: insertedPayment, error: insertError } = await supabase
      .from('admin_payments')
      .insert(paymentData)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Erreur insertion:", insertError);
      return Response.json({ 
        error: 'Erreur lors de la création du paiement', 
        details: insertError.message 
      }, { status: 500 });
    }

    console.log("✅ Paiement créé avec succès:", insertedPayment.id);

    // 5. Vérification finale
    const { data: verification, error: verError } = await supabase
      .from('admin_payments')
      .select('*')
      .eq('admin_user_id', adminUser.id);

    return Response.json({
      success: true,
      message: `✅ Paiement créé manuellement pour ${customerEmail}`,
      payment_created: {
        id: insertedPayment.id,
        plan: planName,
        quota: photoQuota,
        amount_euros: amount / 100,
        expires_at: resetDate.toISOString()
      },
      user_info: {
        email: adminUser.email,
        user_id: adminUser.id,
        total_payments_now: verification?.length || 0
      },
      next_steps: [
        "✅ 1. Déconnectez-vous complètement",
        "✅ 2. Reconnectez-vous avec " + customerEmail,
        "✅ 3. Allez sur /photobooth-ia/admin/parametre",
        "✅ 4. Votre quota devrait maintenant apparaître : " + photoQuota + " photos",
        "✅ 5. Testez la génération d'images"
      ]
    });

  } catch (error) {
    console.error('Erreur création paiement manuel:', error);
    return Response.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
}