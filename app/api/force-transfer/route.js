export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST() {
  try {
    // ID de waibooth.app2@gmail.com (récupéré depuis l'analyse)
    const targetUserId = 'e414751a-43ac-4606-8cc2-f0912bc3ad1f';
    
    console.log('🔄 Transfert vers:', targetUserId);

    // Mise à jour directe de TOUS les paiements
    const { data, error } = await supabase
      .rpc('update_all_payments', { target_user_id: targetUserId });

    if (error) {
      // Si la fonction n'existe pas, on fait une mise à jour SQL directe
      const { data: updateResult, error: updateError } = await supabase
        .from('admin_payments')
        .update({ admin_user_id: targetUserId })
        .neq('admin_user_id', 'ffffffff-ffff-ffff-ffff-ffffffffffff') // Condition qui matche tout
        .select();

      if (updateError) {
        return Response.json({ error: 'Erreur mise à jour', details: updateError.message }, { status: 500 });
      }

      return Response.json({
        success: true,
        message: `✅ ${updateResult?.length || 0} paiements transférés !`,
        details: updateResult?.length > 0 ? 'Tous les paiements ont été liés à waibooth.app2@gmail.com' : 'Aucun paiement à transférer',
        target_user: 'waibooth.app2@gmail.com',
        transferred_count: updateResult?.length || 0,
        action_requise: 'Allez maintenant sur /photobooth-ia/admin/parametre'
      });
    }

    return Response.json({
      success: true,
      message: 'Transfert effectué via fonction RPC',
      data
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
}