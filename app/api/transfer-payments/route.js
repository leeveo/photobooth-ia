export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    const { adminEmail, transferFrom } = await request.json();

    // 1. Trouver l'utilisateur cible
    const { data: targetUser, error: userError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (userError || !targetUser) {
      return Response.json({ error: 'Utilisateur cible non trouvé', details: userError?.message }, { status: 404 });
    }

    // 2. Récupérer TOUS les paiements
    const { data: paymentsToTransfer, error: paymentsError } = await supabase
      .from('admin_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      return Response.json({ error: 'Erreur recherche paiements', details: paymentsError.message }, { status: 500 });
    }

    if (!paymentsToTransfer?.length) {
      return Response.json({ 
        message: 'Aucun paiement trouvé dans la base',
        target_user: targetUser.email
      });
    }

    // 3. Transférer TOUS les paiements vers l'utilisateur cible
    const { data: updated, error: updateError } = await supabase
      .from('admin_payments')
      .update({ admin_user_id: targetUser.id })
      .gte('id', '00000000-0000-0000-0000-000000000000') // Condition pour sélectionner tous les enregistrements
      .select('id, plan, photo_quota, amount, status');

    if (updateError) {
      return Response.json({ error: 'Erreur transfert', details: updateError.message }, { status: 500 });
    }

    // 4. Calculer les totaux
    const totalQuota = updated?.reduce((sum, p) => sum + (p.photo_quota || 0), 0) || 0;
    const totalAmount = updated?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    return Response.json({
      success: true,
      message: `🎉 ${updated?.length || 0} paiements transférés vers ${targetUser.email}`,
      target_user: {
        id: targetUser.id,
        email: targetUser.email
      },
      transferred_payments: updated?.length || 0,
      total_quota: totalQuota,
      total_amount_euros: totalAmount / 100,
      paiements_transferes: updated?.map(p => ({
        plan: p.plan,
        quota: p.photo_quota,
        amount_euros: p.amount / 100,
        status: p.status
      })) || [],
      next_steps: [
        '1. Déconnectez-vous et reconnectez-vous',
        '2. Allez sur /photobooth-ia/admin/parametre',
        '3. Vérifiez que votre quota total apparaît',
        '4. Testez la génération de photos'
      ]
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
}