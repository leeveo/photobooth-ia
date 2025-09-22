export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    console.log("🔄 Début du transfert forcé des paiements");

    // 1. Récupérer TOUS les paiements existants
    const { data: allPayments, error: paymentsError } = await supabase
      .from('admin_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      return Response.json({ 
        error: 'Erreur lors de la récupération des paiements', 
        details: paymentsError.message 
      }, { status: 500 });
    }

    console.log("📊 Paiements trouvés:", allPayments?.length || 0);

    if (!allPayments?.length) {
      return Response.json({ 
        message: 'Aucun paiement trouvé dans la base de données',
        total_payments: 0
      });
    }

    // 2. Trouver l'utilisateur cible (waibooth.app2@gmail.com)
    const { data: targetUser, error: userError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', 'waibooth.app2@gmail.com')
      .single();

    if (userError || !targetUser) {
      return Response.json({ 
        error: 'Utilisateur cible waibooth.app2@gmail.com non trouvé', 
        details: userError?.message 
      }, { status: 404 });
    }

    console.log("👤 Utilisateur cible trouvé:", targetUser.email, "ID:", targetUser.id);

    // 3. Transférer TOUS les paiements vers waibooth.app2@gmail.com
    const { data: updatedPayments, error: updateError } = await supabase
      .from('admin_payments')
      .update({ 
        admin_user_id: targetUser.id,
        admin_email: 'waibooth.app2@gmail.com',
        transferred_at: new Date().toISOString(),
        transferred_from: 'force_transfer_api'
      })
      .in('id', allPayments.map(p => p.id))
      .select('*');

    if (updateError) {
      return Response.json({ 
        error: 'Erreur lors du transfert', 
        details: updateError.message 
      }, { status: 500 });
    }

    console.log("✅ Paiements transférés:", updatedPayments?.length || 0);

    // 4. Calculer les totaux
    const totalQuota = updatedPayments?.reduce((sum, p) => sum + (p.photo_quota || 0), 0) || 0;
    const totalAmount = updatedPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // 5. Vérification finale
    const { data: verificationPayments, error: verificationError } = await supabase
      .from('admin_payments')
      .select('*')
      .eq('admin_user_id', targetUser.id);

    return Response.json({
      success: true,
      message: `🎉 TRANSFERT FORCÉ RÉUSSI ! ${updatedPayments?.length || 0} paiements transférés`,
      target_user: {
        id: targetUser.id,
        email: targetUser.email,
        user_id: targetUser.user_id
      },
      transfer_details: {
        payments_transferred: updatedPayments?.length || 0,
        total_quota_transferred: totalQuota,
        total_amount_euros: totalAmount / 100,
        verification_payments_count: verificationPayments?.length || 0
      },
      quota_breakdown: updatedPayments?.map(p => ({
        id: p.id,
        plan: p.plan,
        quota: p.photo_quota,
        amount_euros: p.amount / 100,
        status: p.status,
        created_at: p.created_at
      })) || [],
      next_steps: [
        '✅ 1. Déconnectez-vous complètement',
        '✅ 2. Reconnectez-vous avec waibooth.app2@gmail.com', 
        '✅ 3. Allez sur /photobooth-ia/admin/parametre',
        '✅ 4. Vérifiez votre quota total: ' + totalQuota + ' photos',
        '✅ 5. Testez la génération de photos'
      ]
    });

  } catch (error) {
    console.error('Erreur transfert forcé:', error);
    return Response.json({ 
      error: 'Erreur serveur lors du transfert forcé', 
      details: error.message 
    }, { status: 500 });
  }
}