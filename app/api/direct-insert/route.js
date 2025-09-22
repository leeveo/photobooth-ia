export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    // Utiliser l'API Supabase REST directement avec fetch
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const paymentData = {
      admin_user_id: 'e5a63185-cbcc-476f-83dc-6526e58c68c9',
      admin_email: 'jumpwiththedevil.evhtribute@gmail.com',
      stripe_customer_id: 'cus_T6NXAX6Fyh8STh',
      stripe_subscription_id: 'sub_1SAAmDRBtAFMZV17LDGzco4x',
      plan: 'price_1SA8hHRBtAFMZV17URFPVdai',
      photo_quota: 400,
      photo_quota_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 4900,
      status: 'succeeded',
      stripe_payment_id: 'pi_3SAAmBRBtAFMZV171J8VpUCz',
      images_included: 400,
      stripe_subscription_status: 'active',
      quota_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      stripe_invoice_id: 'in_1SAAmBRBtAFMZV17vhZjw1WB',
      invoice_number: 'BFC33A55-0004'
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/admin_payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json({ 
        error: 'Erreur Supabase', 
        details: result,
        status: response.status
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "🎉 Paiement inséré avec succès !",
      payment: result[0],
      instructions: [
        "✅ 1. Déconnectez-vous complètement",
        "✅ 2. Reconnectez-vous avec jumpwiththedevil.evhtribute@gmail.com",
        "✅ 3. Allez sur /photobooth-ia/admin/parametre",
        "✅ 4. Votre Plan Essentiel (400 photos) devrait apparaître !",
        "✅ 5. Pour les futurs paiements, configurez Stripe CLI (voir stripe-webhook-setup.md)"
      ]
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur générale', 
      details: error.message 
    }, { status: 500 });
  }
}