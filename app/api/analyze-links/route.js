export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    // 1. Tous les utilisateurs avec leurs emails
    const { data: users, error: usersError } = await supabase
      .from('admin_users')
      .select('id, email, created_at')
      .order('created_at', { ascending: false });

    // 2. Tous les paiements avec leurs user_id
    const { data: payments, error: paymentsError } = await supabase
      .from('admin_payments')
      .select('id, admin_user_id, plan, photo_quota, amount, status, created_at')
      .order('created_at', { ascending: false });

    if (usersError || paymentsError) {
      return Response.json({ 
        error: 'Erreur requête', 
        usersError: usersError?.message,
        paymentsError: paymentsError?.message
      }, { status: 500 });
    }

    // 3. Analyser les liens
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user.email;
    });

    const paymentsWithEmails = payments.map(payment => ({
      ...payment,
      user_email: userMap[payment.admin_user_id] || 'UTILISATEUR_INEXISTANT',
      is_orphan: !payment.admin_user_id,
      user_exists: !!userMap[payment.admin_user_id]
    }));

    const orphanPayments = paymentsWithEmails.filter(p => p.is_orphan);
    const linkedPayments = paymentsWithEmails.filter(p => !p.is_orphan && p.user_exists);
    const brokenPayments = paymentsWithEmails.filter(p => !p.is_orphan && !p.user_exists);

    return Response.json({
      timestamp: new Date().toISOString(),
      summary: {
        total_users: users.length,
        total_payments: payments.length,
        orphan_payments: orphanPayments.length,
        linked_payments: linkedPayments.length,
        broken_payments: brokenPayments.length
      },
      users: users,
      payments_by_status: {
        orphan: orphanPayments,
        linked: linkedPayments,
        broken: brokenPayments
      },
      quota_by_user: Object.entries(
        linkedPayments.reduce((acc, p) => {
          const email = p.user_email;
          if (!acc[email]) acc[email] = { quota: 0, payments: 0, amount: 0 };
          acc[email].quota += p.photo_quota || 0;
          acc[email].payments += 1;
          acc[email].amount += p.amount || 0;
          return acc;
        }, {})
      ).map(([email, data]) => ({ email, ...data }))
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
}