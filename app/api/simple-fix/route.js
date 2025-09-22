export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST() {
  try {
    // 1. Trouver le premier utilisateur (le plus récent)
    const { data: user } = await supabase
      .from('admin_users')
      .select('id, email')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!user) {
      return Response.json({ error: 'Aucun utilisateur trouvé' }, { status: 404 });
    }

    // 2. Compter les paiements orphelins (sans admin_user_id)
    const { count: orphanCount } = await supabase
      .from('admin_payments')
      .select('*', { count: 'exact', head: true })
      .is('admin_user_id', null);

    // 3. Faire la mise à jour en une seule requête
    const { data: updated, error: updateError } = await supabase
      .from('admin_payments')
      .update({
        admin_user_id: user.id
      })
      .is('admin_user_id', null)
      .select('id, plan, photo_quota, amount');

    if (updateError) {
      return Response.json({ error: 'Erreur mise à jour', details: updateError.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: `✅ ${updated?.length || 0} paiements liés avec succès !`,
      utilisateur: user.email,
      paiements_orphelins_avant: orphanCount,
      paiements_repares: updated?.length || 0,
      quota_total: updated?.reduce((sum, p) => sum + (p.photo_quota || 0), 0) || 0,
      montant_total: updated?.reduce((sum, p) => sum + (p.amount || 0), 0) / 100 || 0,
      action_requise: "Allez sur /photobooth-ia/admin/parametre pour vérifier"
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
}