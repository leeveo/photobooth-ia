export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST() {
  try {
    // IDs des utilisateurs qui ont actuellement des paiements (depuis l'analyse)
    const sourceUserIds = [
      '7a77784c-7864-4fbb-8cb5-1f9b40ca1f62', // liveshopping.aws@gmail.com
      'bb70d283-b02e-4e22-9d06-a705952b366b', // tcrochet@mobilactif.fr  
      '8fdfef23-8fdf-4268-81bc-c3b9141254ff'  // marcmenu707@gmail.com
    ];
    
    // ID cible (waibooth.app2@gmail.com)
    const targetUserId = 'e414751a-43ac-4606-8cc2-f0912bc3ad1f';
    
    console.log('🔄 Transfert depuis:', sourceUserIds, 'vers:', targetUserId);

    let totalTransferred = 0;
    const results = [];

    // Transférer depuis chaque utilisateur source
    for (const sourceId of sourceUserIds) {
      const { data: transferred, error } = await supabase
        .from('admin_payments')
        .update({ admin_user_id: targetUserId })
        .eq('admin_user_id', sourceId)
        .select('id, plan, photo_quota, amount');

      if (!error && transferred?.length > 0) {
        totalTransferred += transferred.length;
        results.push(...transferred);
        console.log(`✅ Transféré ${transferred.length} paiements depuis ${sourceId}`);
      }
    }

    // Calculer les totaux
    const totalQuota = results.reduce((sum, p) => sum + (p.photo_quota || 0), 0);
    const totalAmount = results.reduce((sum, p) => sum + (p.amount || 0), 0);

    return Response.json({
      success: true,
      message: `🎉 ${totalTransferred} paiements transférés vers waibooth.app2@gmail.com !`,
      details: {
        paiements_transferes: totalTransferred,
        quota_total: totalQuota,
        montant_total_euros: totalAmount / 100,
        from_users: [
          'liveshopping.aws@gmail.com',
          'tcrochet@mobilactif.fr', 
          'marcmenu707@gmail.com'
        ],
        to_user: 'waibooth.app2@gmail.com'
      },
      paiements: results.map(p => ({
        plan: p.plan,
        quota: p.photo_quota,
        amount_euros: p.amount / 100
      })),
      next_steps: [
        '1. 🔄 Déconnectez-vous et reconnectez-vous',
        '2. 📄 Allez sur /photobooth-ia/admin/parametre', 
        '3. ✅ Vérifiez votre quota total: ' + totalQuota + ' photos',
        '4. 🎨 Testez la génération de photos'
      ]
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
}