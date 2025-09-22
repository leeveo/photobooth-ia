import { createClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    const { action, adminEmail, forceLink } = await request.json();

    if (action === 'fix_orphan_payments') {
      // 1. Trouver les paiements sans email
      const { data: orphanPayments, error: orphanError } = await supabase
        .from('admin_payments')
        .select('*')
        .or('admin_email.is.null,admin_email.eq.')
        .order('created_at', { ascending: false });

      if (orphanError) {
        return Response.json({ error: 'Erreur récupération paiements orphelins', details: orphanError.message }, { status: 500 });
      }

      if (!orphanPayments?.length) {
        return Response.json({ message: 'Aucun paiement orphelin trouvé', orphan_count: 0 });
      }

      // 2. Si un email admin est fourni, lier les paiements à cet utilisateur
      if (adminEmail) {
        const { data: adminUser, error: userError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', adminEmail)
          .single();

        if (userError || !adminUser) {
          return Response.json({ error: 'Utilisateur non trouvé avec cet email', email: adminEmail }, { status: 404 });
        }

        // Lier tous les paiements orphelins à cet utilisateur
        const fixedPayments = [];
        
        for (const payment of orphanPayments) {
          const { data: updatedPayment, error: updateError } = await supabase
            .from('admin_payments')
            .update({
              admin_email: adminEmail,
              admin_user_id: adminUser.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.id)
            .select()
            .single();

          if (!updateError) {
            fixedPayments.push(updatedPayment);
          }
        }

        return Response.json({
          success: true,
          message: `${fixedPayments.length} paiements liés à ${adminEmail}`,
          paiements_corriges: fixedPayments.map(p => ({
            id: p.id,
            plan: p.plan,
            quota: p.photo_quota,
            amount: p.amount,
            created_at: p.created_at
          })),
          utilisateur: {
            id: adminUser.id,
            email: adminUser.email
          }
        });
      }

      // 3. Sinon, juste retourner la liste des paiements orphelins
      return Response.json({
        orphan_payments: orphanPayments.map(p => ({
          id: p.id,
          plan: p.plan,
          quota: p.photo_quota,
          amount: p.amount,
          stripe_customer_id: p.stripe_customer_id,
          created_at: p.created_at
        })),
        orphan_count: orphanPayments.length,
        suggestion: 'Passez adminEmail pour lier ces paiements à un utilisateur'
      });
    }

    return Response.json({ error: 'Action non reconnue' }, { status: 400 });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
}