export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST() {
  try {
    // 1. IDs exacts depuis l'analyse
    const sourceUserIds = [
      '7a77784c-7864-4fbb-8cb5-1f9b40ca1f62', // liveshopping.aws@gmail.com - 3600 photos
      'bb70d283-b02e-4e22-9d06-a705952b366b', // tcrochet@mobilactif.fr - 3100 photos  
      '8fdfef23-8fdf-4268-81bc-c3b9141254ff'  // marcmenu707@gmail.com - 1600 photos
    ];
    
    const targetUserId = 'e414751a-43ac-4606-8cc2-f0912bc3ad1f'; // waibooth.app2@gmail.com
    
    console.log('🔄 TRANSFERT FORCÉ FINAL');
    console.log('Sources:', sourceUserIds);
    console.log('Cible:', targetUserId);

    let totalTransferred = 0;
    const allUpdates = [];

    // 2. Transférer depuis chaque utilisateur un par un
    for (let i = 0; i < sourceUserIds.length; i++) {
      const sourceId = sourceUserIds[i];
      
      try {
        // Récupérer les paiements de cette source
        const { data: paymentsToMove, error: fetchError } = await supabase
          .from('admin_payments')
          .select('id, plan, photo_quota, amount')
          .eq('admin_user_id', sourceId);

        if (fetchError) {
          console.error(`Erreur fetch ${sourceId}:`, fetchError.message);
          continue;
        }

        if (!paymentsToMove?.length) {
          console.log(`Aucun paiement pour ${sourceId}`);
          continue;
        }

        console.log(`Transfert de ${paymentsToMove.length} paiements depuis ${sourceId}`);

        // Mettre à jour un par un pour éviter les erreurs de batch
        for (const payment of paymentsToMove) {
          const { data: updated, error: updateError } = await supabase
            .from('admin_payments')
            .update({ admin_user_id: targetUserId })
            .eq('id', payment.id)
            .select('id, plan, photo_quota, amount')
            .single();

          if (!updateError && updated) {
            allUpdates.push(updated);
            totalTransferred++;
            console.log(`✅ Transféré paiement ${payment.id}`);
          } else {
            console.error(`❌ Erreur transfert ${payment.id}:`, updateError?.message);
          }
        }

      } catch (sourceError) {
        console.error(`Erreur générale source ${sourceId}:`, sourceError.message);
      }
    }

    // 3. Calculer les totaux
    const totalQuota = allUpdates.reduce((sum, p) => sum + (p.photo_quota || 0), 0);
    const totalAmount = allUpdates.reduce((sum, p) => sum + (p.amount || 0), 0);

    console.log(`Transfert terminé: ${totalTransferred} paiements, ${totalQuota} photos`);

    return Response.json({
      success: totalTransferred > 0,
      message: totalTransferred > 0 
        ? `🎉 SUCCÈS ! ${totalTransferred} paiements transférés vers waibooth.app2@gmail.com`
        : '❌ Aucun paiement n\'a pu être transféré',
      details: {
        paiements_transferes: totalTransferred,
        quota_total: totalQuota,
        montant_total_euros: totalAmount / 100,
        sources_utilisees: [
          'liveshopping.aws@gmail.com',
          'tcrochet@mobilactif.fr', 
          'marcmenu707@gmail.com'
        ]
      },
      paiements_detailles: allUpdates.map(p => ({
        plan: p.plan,
        quota: p.photo_quota,
        amount_euros: p.amount / 100
      })),
      instructions_finales: totalTransferred > 0 ? [
        '🔄 1. Déconnectez-vous complètement',
        '🔑 2. Reconnectez-vous avec waibooth.app2@gmail.com',
        '📄 3. Allez sur /photobooth-ia/admin/parametre',
        '✅ 4. Vérifiez votre quota: ' + totalQuota + ' photos',
        '🎨 5. Testez la génération de photos'
      ] : [
        '🔍 Vérifiez les logs de la console',
        '💾 Vérifiez que la base Supabase est accessible',
        '🔄 Réessayez avec une approche différente'
      ]
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur critique', 
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}