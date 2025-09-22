export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    const { adminEmail } = await request.json();

    if (!adminEmail) {
      return Response.json({ error: 'Email requis' }, { status: 400 });
    }

    console.log('🔧 SOLUTION SIMPLE - Transfert vers:', adminEmail);

    // 1. Votre utilisateur
    const { data: targetUser, error: userError } = await supabase
      .from('admin_users')
      .select('id, email')
      .eq('email', adminEmail)
      .single();

    if (userError || !targetUser) {
      return Response.json({ 
        error: 'Utilisateur non trouvé pour: ' + adminEmail,
        suggestion: 'Vérifiez votre email de connexion'
      }, { status: 404 });
    }

    // 2. SOLUTION SIMPLE: Prendre TOUS les paiements et les donner à votre utilisateur
    console.log('Transfert de TOUS les paiements vers:', targetUser.id);

    // Récupérer d'abord tous les paiements
    const { data: allPayments, error: fetchError } = await supabase
      .from('admin_payments')
      .select('*');

    if (fetchError) {
      return Response.json({ error: 'Erreur lecture', details: fetchError.message }, { status: 500 });
    }

    console.log(`Trouvé ${allPayments?.length || 0} paiements au total`);

    // Les transférer un par un pour éviter les erreurs
    let transferred = 0;
    const results = [];

    for (const payment of allPayments || []) {
      if (payment.admin_user_id !== targetUser.id) {
        const { data: updated, error: updateError } = await supabase
          .from('admin_payments')
          .update({ admin_user_id: targetUser.id })
          .eq('id', payment.id)
          .select('plan, photo_quota, amount')
          .single();

        if (!updateError && updated) {
          transferred++;
          results.push(updated);
          console.log(`✅ Transféré paiement ${payment.id}`);
        }
      }
    }

    const totalQuota = results.reduce((sum, p) => sum + (p.photo_quota || 0), 0);
    const totalAmount = results.reduce((sum, p) => sum + (p.amount || 0), 0);

    return Response.json({
      success: true,
      message: `🎉 ${transferred} paiements transférés vers ${adminEmail}`,
      details: {
        utilisateur: targetUser.email,
        paiements_transferes: transferred,
        quota_total: totalQuota,
        montant_total: totalAmount / 100
      },
      next_steps: [
        '1. Déconnectez-vous et reconnectez-vous',
        '2. Allez sur /photobooth-ia/admin/parametre', 
        '3. Vérifiez votre quota: ' + totalQuota + ' photos'
      ]
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur simple', 
      details: error.message 
    }, { status: 500 });
  }
}