export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST() {
  try {
    console.log('🔧 AUTO-RÉPARATION DES PAIEMENTS');
    
    // 1. Trouver tous les utilisateurs
    const { data: users, error: usersError } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError || !users.length) {
      return Response.json({ error: 'Aucun utilisateur trouvé', details: usersError?.message }, { status: 404 });
    }

    // 2. Trouver les paiements orphelins
    const { data: orphanPayments, error: orphanError } = await supabase
      .from('admin_payments')
      .select('*')
      .or('admin_email.is.null,admin_email.eq.')
      .order('created_at', { ascending: false });

    if (orphanError) {
      return Response.json({ error: 'Erreur recherche paiements', details: orphanError.message }, { status: 500 });
    }

    if (!orphanPayments?.length) {
      return Response.json({ 
        message: 'Aucun paiement orphelin trouvé',
        users_available: users.map(u => u.email)
      });
    }

    // 3. Utiliser le premier utilisateur (le plus récent) pour lier tous les paiements
    const targetUser = users[0];
    const updates = [];

    console.log(`Liaison de ${orphanPayments.length} paiements à ${targetUser.email}`);

    for (const payment of orphanPayments) {
      const { data: updated, error: updateError } = await supabase
        .from('admin_payments')
        .update({
          admin_email: targetUser.email,
          admin_user_id: targetUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)
        .select()
        .single();

      if (!updateError && updated) {
        updates.push(updated);
        console.log(`✅ Paiement ${payment.id} lié à ${targetUser.email}`);
      } else {
        console.error(`❌ Erreur liaison paiement ${payment.id}:`, updateError?.message);
      }
    }

    return Response.json({
      success: true,
      message: `🎉 Auto-réparation terminée ! ${updates.length} paiements liés.`,
      utilisateur_cible: {
        id: targetUser.id,
        email: targetUser.email
      },
      paiements_repares: updates.map(p => ({
        id: p.id,
        plan: p.plan,
        quota: p.photo_quota,
        amount: p.amount / 100,
        created_at: p.created_at
      })),
      next_steps: [
        '1. Actualisez votre page /parametre',
        '2. Reconnectez-vous si nécessaire',
        '3. Vérifiez que votre quota apparaît',
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