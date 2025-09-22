export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST() {
  try {
    console.log('🚀 TRANSFERT FINAL CORRIGÉ - Version .select() sans .single()');
    
    // IDs exacts
    const targetUserId = 'e414751a-43ac-4606-8cc2-f0912bc3ad1f'; // waibooth.app2@gmail.com
    const sourceUserIds = [
      '7a77784c-7864-4fbb-8cb5-1f9b40ca1f62', // liveshopping.aws@gmail.com
      'bb70d283-b02e-4e22-9d06-a705952b366b', // tcrochet@mobilactif.fr  
      '8fdfef23-8fdf-4268-81bc-c3b9141254ff'  // marcmenu707@gmail.com
    ];

    let totalTransferred = 0;
    const results = [];

    // Transférer depuis chaque source
    for (const sourceId of sourceUserIds) {
      console.log(`\n🔄 Transfert depuis ${sourceId}`);
      
      // CORRECTION: Enlever .single() qui causait l'erreur
      const { data: updated, error: updateError } = await supabase
        .from('admin_payments')
        .update({ admin_user_id: targetUserId })
        .eq('admin_user_id', sourceId)
        .select('id, plan, photo_quota, amount'); // PAS de .single() !

      if (updateError) {
        console.error(`❌ Erreur pour ${sourceId}:`, updateError.message);
        continue;
      }

      if (updated && updated.length > 0) {
        console.log(`✅ ${updated.length} paiements transférés depuis ${sourceId}`);
        totalTransferred += updated.length;
        results.push(...updated);
      } else {
        console.log(`ℹ️ Aucun paiement trouvé pour ${sourceId}`);
      }
    }

    // Calculer les totaux
    const totalQuota = results.reduce((sum, p) => sum + (p.photo_quota || 0), 0);
    const totalAmount = results.reduce((sum, p) => sum + (p.amount || 0), 0);

    console.log(`\n🎉 RÉSULTAT FINAL: ${totalTransferred} paiements, ${totalQuota} photos`);

    return Response.json({
      success: totalTransferred > 0,
      message: totalTransferred > 0 
        ? `🎉 VICTOIRE ! ${totalTransferred} paiements transférés !`
        : '❌ Aucun transfert effectué',
      details: {
        paiements_transferes: totalTransferred,
        quota_total: totalQuota,
        montant_total_euros: totalAmount / 100,
        avant: 'Paiements répartis entre 3 utilisateurs',
        apres: `Tous les paiements maintenant sur waibooth.app2@gmail.com`
      },
      paiements: results.map(p => ({
        plan: p.plan,
        quota: p.photo_quota,
        amount_euros: p.amount / 100
      })),
      next_steps: totalTransferred > 0 ? [
        '🔄 1. Déconnectez-vous COMPLÈTEMENT',
        '🔑 2. Reconnectez-vous avec waibooth.app2@gmail.com',  
        '📄 3. Allez sur /photobooth-ia/admin/parametre',
        '✅ 4. Votre quota devrait être: ' + totalQuota + ' photos',
        '💰 5. Montant total: ' + (totalAmount/100) + '€'
      ] : ['Contactez le support technique']
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
}