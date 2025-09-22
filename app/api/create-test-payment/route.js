export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    const { adminEmail } = await request.json();

    console.log('🔧 CRÉATION MANUELLE D\'UN PAIEMENT TEST');

    // 1. Votre utilisateur
    const { data: user, error: userError } = await supabase
      .from('admin_users')
      .select('id, email')
      .eq('email', adminEmail || 'waibooth.app2@gmail.com')
      .single();

    if (userError || !user) {
      return Response.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // 2. Créer un paiement test manuellement
    const testPayment = {
      admin_user_id: user.id,
      stripe_customer_id: 'cus_test_manual',
      stripe_subscription_id: 'sub_test_manual',
      plan: 'price_1SA8gYRBtAFMZV17dLua6okj', // Plan Start 19€
      photo_quota: 100,
      photo_quota_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 jours
      amount: 1900, // 19€
      status: 'succeeded',
      stripe_payment_id: 'pi_test_manual',
      images_included: 100,
      stripe_subscription_status: 'active',
      created_at: new Date().toISOString()
    };

    const { data: created, error: createError } = await supabase
      .from('admin_payments')
      .insert([testPayment])
      .select()
      .single();

    if (createError) {
      return Response.json({ 
        error: 'Erreur création paiement test', 
        details: createError.message 
      }, { status: 500 });
    }

    // 3. Vérifier que ça a marché
    const { count: userPaymentCount } = await supabase
      .from('admin_payments')
      .select('*', { count: 'exact', head: true })
      .eq('admin_user_id', user.id);

    return Response.json({
      success: true,
      message: `✅ Paiement test créé pour ${user.email}`,
      details: {
        utilisateur: user.email,
        paiement_cree: {
          plan: 'Start (19€)',
          quota: 100,
          status: 'succeeded'
        },
        total_paiements_utilisateur: userPaymentCount
      },
      test_payment_id: created.id,
      next_steps: [
        '1. Allez sur /photobooth-ia/admin/parametre',
        '2. Vous devriez voir 100 photos disponibles',
        '3. Si ça marche, le problème était juste les transferts'
      ]
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur création manuelle', 
      details: error.message 
    }, { status: 500 });
  }
}