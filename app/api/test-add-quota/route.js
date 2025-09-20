import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  console.log('[TEST WEBHOOK] Simulation d\'achat d\'addon');
  
  try {
    const { adminUserId, addonValue = 100, packName = "Pack +100 Photos (Test)" } = await request.json();
    
    if (!adminUserId) {
      return new Response('Admin User ID requis', { status: 400 });
    }

    // 1. Insérer l'achat d'addon
    const { data: addon, error: addonError } = await supabase
      .from('addon_purchases')
      .insert([{
        admin_user_id: adminUserId,
        stripe_session_id: `cs_test_local_${Date.now()}`,
        stripe_payment_intent_id: `pi_test_local_${Date.now()}`,
        addon_type: 'photo_pack',
        addon_value: addonValue,
        addon_name: packName,
        price_paid: 9.90,
        stripe_price_id: 'price_test_local',
        status: 'completed'
      }])
      .select()
      .single();

    if (addonError) {
      console.error('[TEST WEBHOOK] Erreur insertion addon:', addonError);
      return new Response(`Erreur: ${addonError.message}`, { status: 500 });
    }

    // 2. Calculer le nouveau quota total
    const { data: allAddons, error: addonsError } = await supabase
      .from('addon_purchases')
      .select('addon_value')
      .eq('admin_user_id', adminUserId)
      .eq('status', 'completed');

    if (addonsError) {
      console.error('[TEST WEBHOOK] Erreur récupération addons:', addonsError);
    }

    const totalAddonPhotos = allAddons?.reduce((sum, a) => sum + a.addon_value, 0) || 0;

    // 3. Mettre à jour le quota dans admin_payments (si la ligne existe)
    const { data: existingPayment } = await supabase
      .from('admin_payments')
      .select('*')
      .eq('admin_user_id', adminUserId)
      .single();

    if (existingPayment) {
      const baseQuota = existingPayment.quota || 100;
      const newQuota = baseQuota + totalAddonPhotos;

      const { error: updateError } = await supabase
        .from('admin_payments')
        .update({ quota: newQuota })
        .eq('admin_user_id', adminUserId);

      if (updateError) {
        console.error('[TEST WEBHOOK] Erreur mise à jour quota:', updateError);
      }
    }

    console.log('[TEST WEBHOOK] Succès:', {
      addon,
      totalAddonPhotos,
      message: `+${addonValue} photos ajoutées`
    });

    return new Response(JSON.stringify({
      success: true,
      addon,
      totalAddonPhotos,
      message: `+${addonValue} photos ajoutées avec succès!`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[TEST WEBHOOK] Erreur:', error);
    return new Response(`Erreur serveur: ${error.message}`, { status: 500 });
  }
}