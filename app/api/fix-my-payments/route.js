export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    const { adminEmail } = await request.json();

    if (!adminEmail) {
      return Response.json({ error: 'Email admin requis' }, { status: 400 });
    }

    console.log('[FIX-PAYMENTS] Tentative de liaison pour:', adminEmail);

    // 1. Trouver l'utilisateur
    const { data: adminUser, error: userError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (userError || !adminUser) {
      return Response.json({ 
        error: 'Utilisateur non trouvé', 
        details: userError?.message,
        suggestion: 'Vérifiez que vous êtes bien connecté avec cet email'
      }, { status: 404 });
    }

    // 2. Compter tous les paiements
    const { count: totalPayments } = await supabase
      .from('admin_payments')
      .select('*', { count: 'exact', head: true });

    // 3. Compter les paiements déjà liés à cet utilisateur
    const { count: userPayments } = await supabase
      .from('admin_payments')
      .select('*', { count: 'exact', head: true })
      .eq('admin_user_id', adminUser.id);

    // 4. Si l'utilisateur a déjà tous les paiements, pas besoin de transfert
    if (userPayments === totalPayments) {
      return Response.json({
        success: true,
        message: `✅ Tous les paiements sont déjà liés à ${adminEmail}`,
        utilisateur: { id: adminUser.id, email: adminUser.email },
        paiements_existants: userPayments,
        total_paiements: totalPayments,
        next_steps: ['Allez sur /photobooth-ia/admin/parametre pour vérifier vos quotas']
      });
    }

    // 5. Sinon, faire le transfert FORCÉ de TOUS les paiements
    console.log(`Transfert forcé: ${totalPayments - userPayments} paiements vers ${adminEmail}`);

    // Mise à jour par batch - tous les paiements qui ne sont pas encore à lui
    const { data: updated, error: updateError } = await supabase
      .from('admin_payments')
      .update({ admin_user_id: adminUser.id })
      .neq('admin_user_id', adminUser.id)
      .select('id, plan, photo_quota, amount');

    if (updateError) {
      return Response.json({ error: 'Erreur transfert', details: updateError.message }, { status: 500 });
    }

    const totalQuota = updated?.reduce((sum, p) => sum + (p.photo_quota || 0), 0) || 0;
    const totalAmount = updated?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    return Response.json({
      success: true,
      message: `🎉 ${updated?.length || 0} paiements transférés vers ${adminEmail} !`,
      utilisateur: { id: adminUser.id, email: adminUser.email },
      paiements_avant: userPayments,
      paiements_transferes: updated?.length || 0,
      quota_total: totalQuota,
      montant_total: totalAmount / 100,
      paiements_lies: updated?.map(p => ({
        plan: p.plan,
        quota: p.photo_quota,
        amount: p.amount / 100
      })) || [],
      next_steps: [
        '1. Actualisez votre page /parametre',
        '2. Déconnectez-vous et reconnectez-vous si nécessaire',
        '3. Vérifiez que votre quota s\'affiche: ' + totalQuota + ' photos',
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