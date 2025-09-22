import { createClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request) {
  try {
    const { action, adminEmail } = await request.json();

    if (action === 'fix_google_oauth_payments') {
      // 1. Trouver les paiements sans email (orphelins)
      const { data: orphanPayments, error: orphanError } = await supabase
        .from('admin_payments')
        .select('*')
        .or('admin_email.is.null,admin_email.eq.')
        .order('created_at', { ascending: false });

      if (orphanError) {
        return Response.json({ error: 'Erreur récupération paiements orphelins', details: orphanError.message }, { status: 500 });
      }

      // 2. Trouver l'utilisateur avec l'email fourni
      const { data: adminUser, error: userError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', adminEmail)
        .single();

      if (userError || !adminUser) {
        return Response.json({ error: 'Utilisateur non trouvé avec cet email', details: userError?.message }, { status: 404 });
      }

      // 3. Lier les paiements orphelins à cet utilisateur
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
          email: adminUser.email,
          created_at: adminUser.created_at
        }
      });
    }

    if (action === 'list_google_users') {
      // Lister les utilisateurs qui se sont connectés via Google
      const { data: googleUsers, error: googleError } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (googleError) {
        return Response.json({ error: 'Erreur récupération utilisateurs', details: googleError.message }, { status: 500 });
      }

      // Lister les paiements orphelins
      const { data: orphanPayments, error: orphanError } = await supabase
        .from('admin_payments')
        .select('*')
        .or('admin_email.is.null,admin_email.eq.')
        .order('created_at', { ascending: false });

      return Response.json({
        utilisateurs_google: googleUsers.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at
        })),
        paiements_orphelins: orphanPayments?.map(p => ({
          id: p.id,
          plan: p.plan,
          quota: p.photo_quota,
          amount: p.amount,
          stripe_customer_id: p.stripe_customer_id,
          created_at: p.created_at
        })) || [],
        total_users: googleUsers.length,
        total_orphans: orphanPayments?.length || 0
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