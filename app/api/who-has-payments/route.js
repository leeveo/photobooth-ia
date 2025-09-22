export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    // 1. Lister TOUS les utilisateurs et leurs paiements
    const { data: users, error: usersError } = await supabase
      .from('admin_users')
      .select('id, email, created_at, last_login')
      .order('created_at', { ascending: false });

    const { data: payments, error: paymentsError } = await supabase
      .from('admin_payments')
      .select('id, admin_user_id, plan, photo_quota, amount, status, created_at')
      .order('created_at', { ascending: false });

    if (usersError || paymentsError) {
      return Response.json({ 
        error: 'Erreur requête', 
        details: { usersError: usersError?.message, paymentsError: paymentsError?.message }
      }, { status: 500 });
    }

    // 2. Associer les paiements aux utilisateurs
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = {
        ...user,
        payments: [],
        total_quota: 0,
        total_amount: 0
      };
    });

    payments.forEach(payment => {
      if (userMap[payment.admin_user_id]) {
        userMap[payment.admin_user_id].payments.push(payment);
        userMap[payment.admin_user_id].total_quota += payment.photo_quota || 0;
        userMap[payment.admin_user_id].total_amount += payment.amount || 0;
      }
    });

    // 3. Convertir en tableau et trier par quota
    const userStats = Object.values(userMap).map(user => ({
      email: user.email,
      id: user.id,
      created_at: user.created_at,
      last_login: user.last_login,
      payments_count: user.payments.length,
      total_quota: user.total_quota,
      total_amount_euros: user.total_amount / 100,
      has_payments: user.payments.length > 0
    })).sort((a, b) => b.total_quota - a.total_quota);

    return Response.json({
      timestamp: new Date().toISOString(),
      summary: {
        total_users: users.length,
        total_payments: payments.length,
        users_with_payments: userStats.filter(u => u.has_payments).length,
        users_without_payments: userStats.filter(u => !u.has_payments).length
      },
      users_with_payments: userStats.filter(u => u.has_payments),
      users_without_payments: userStats.filter(u => !u.has_payments),
      your_accounts: userStats.filter(u => 
        u.email.includes('waibooth') || 
        u.email.includes('bpcmetavers') || 
        u.email.includes('leeveo')
      ),
      recommended_action: 'Identifiez quel email vous utilisez réellement, puis forcez le transfert'
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
}