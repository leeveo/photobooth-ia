export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

// BONNES CREDENTIALS de votre .env.local
const supabase = createClient(
  'https://gyohqmahwntkmebayeej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b2hxbWFod250a21lYmF5ZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDg5NDksImV4cCI6MjA2MjYyNDk0OX0.Pfjtro2esmKm1xKdCtgxnagpdOS7oS9JGhuf31aX8_M'
);

export async function POST() {
  try {
    console.log('🚀 TRANSFERT FINAL AVEC BONNES CREDENTIALS !');
    
    // IDs corrects
    const targetUserId = 'e414751a-43ac-4606-8cc2-f0912bc3ad1f'; // waibooth.app2@gmail.com
    const sourceUserIds = [
      '7a77784c-7864-4fbb-8cb5-1f9b40ca1f62', // liveshopping.aws@gmail.com
      'bb70d283-b02e-4e22-9d06-a705952b366b', // tcrochet@mobilactif.fr  
      '8fdfef23-8fdf-4268-81bc-c3b9141254ff'  // marcmenu707@gmail.com
    ];

    let totalTransferred = 0;
    const allResults = [];

    // Transfert depuis chaque utilisateur
    for (const sourceId of sourceUserIds) {
      console.log(`\n🔄 Transfert depuis ${sourceId}`);
      
      const { data: updated, error: updateError } = await supabase
        .from('admin_payments')
        .update({ admin_user_id: targetUserId })
        .eq('admin_user_id', sourceId)
        .select('id, plan, photo_quota, amount, created_at');

      if (updateError) {
        console.error(`❌ Erreur ${sourceId}:`, updateError.message);
        continue;
      }

      if (updated && updated.length > 0) {
        console.log(`✅ ${updated.length} paiements transférés depuis ${sourceId}`);
        totalTransferred += updated.length;
        allResults.push(...updated);
      }
    }

    // Vérification finale
    const { count: finalCount } = await supabase
      .from('admin_payments')
      .select('*', { count: 'exact', head: true })
      .eq('admin_user_id', targetUserId);

    const totalQuota = allResults.reduce((sum, p) => sum + (p.photo_quota || 0), 0);
    const totalAmount = allResults.reduce((sum, p) => sum + (p.amount || 0), 0);

    console.log(`\n🎉 RÉSULTAT: ${totalTransferred} paiements, quota final: ${totalQuota}`);

    return Response.json({
      success: totalTransferred > 0,
      message: totalTransferred > 0 
        ? `🎉 VICTOIRE ! ${totalTransferred} paiements transférés !`
        : '❌ Aucun transfert',
      details: {
        paiements_transferes: totalTransferred,
        quota_total: totalQuota,
        montant_total_euros: totalAmount / 100,
        verification_finale: `${finalCount} paiements liés à waibooth.app2@gmail.com`
      },
      paiements: allResults.map(p => ({
        plan: p.plan,
        quota: p.photo_quota,
        amount_euros: p.amount / 100,
        date: p.created_at
      })),
      instructions_finales: totalTransferred > 0 ? [
        '🎯 MAINTENANT:',
        '1. 🔄 Déconnectez-vous COMPLÈTEMENT de votre application',
        '2. 🔑 Reconnectez-vous avec waibooth.app2@gmail.com',
        '3. 📄 Allez sur /photobooth-ia/admin/parametre',
        '4. ✅ Vous devriez voir: ' + totalQuota + ' photos disponibles',
        '5. 💰 Montant total des plans: ' + (totalAmount/100) + '€',
        '6. 🎨 Testez la génération de photos !'
      ] : ['Vérifiez les logs pour comprendre pourquoi ça n\'a pas marché']
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur transfert final', 
      details: error.message 
    }, { status: 500 });
  }
}