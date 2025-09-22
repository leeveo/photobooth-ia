export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST() {
  try {
    // Votre ID exact
    const yourUserId = 'e414751a-43ac-4606-8cc2-f0912bc3ad1f';
    
    console.log('🎯 Transfert FORCÉ vers:', yourUserId);

    // Transfert du premier paiement pour test
    const { data: testPayment, error: testError } = await supabase
      .from('admin_payments')
      .select('id, admin_user_id, plan, photo_quota')
      .limit(1)
      .single();

    if (testError || !testPayment) {
      return Response.json({ error: 'Aucun paiement trouvé pour test' }, { status: 404 });
    }

    console.log('📝 Paiement test avant:', testPayment);

    // Mise à jour de CE paiement spécifique
    const { data: updated, error: updateError } = await supabase
      .from('admin_payments')
      .update({ admin_user_id: yourUserId })
      .eq('id', testPayment.id)
      .select()
      .single();

    if (updateError) {
      return Response.json({ error: 'Erreur mise à jour', details: updateError.message }, { status: 500 });
    }

    console.log('✅ Paiement test après:', updated);

    return Response.json({
      success: true,
      message: '🎉 Test transfert réussi !',
      avant: {
        payment_id: testPayment.id,
        ancien_user_id: testPayment.admin_user_id,
        plan: testPayment.plan,
        quota: testPayment.photo_quota
      },
      apres: {
        payment_id: updated.id,
        nouveau_user_id: updated.admin_user_id,
        plan: updated.plan,
        quota: updated.photo_quota
      },
      verification: {
        transfert_reussi: updated.admin_user_id === yourUserId,
        votre_user_id: yourUserId
      },
      next_step: 'Si ce test fonctionne, on fera le transfert complet !'
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
}