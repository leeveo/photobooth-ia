export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    // 1. Examiner la structure de admin_payments
    const { data: payments, error: paymentsError } = await supabase
      .from('admin_payments')
      .select('*')
      .limit(1);

    if (paymentsError) {
      return Response.json({ 
        error: 'Erreur admin_payments', 
        details: paymentsError.message 
      }, { status: 500 });
    }

    // 2. Examiner la structure de admin_users
    const { data: users, error: usersError } = await supabase
      .from('admin_users')
      .select('*')
      .limit(1);

    if (usersError) {
      return Response.json({ 
        error: 'Erreur admin_users', 
        details: usersError.message 
      }, { status: 500 });
    }

    // 3. Compter tous les enregistrements
    const { count: paymentsCount } = await supabase
      .from('admin_payments')
      .select('*', { count: 'exact', head: true });

    const { count: usersCount } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true });

    return Response.json({
      timestamp: new Date().toISOString(),
      tables: {
        admin_payments: {
          count: paymentsCount,
          structure: payments?.[0] ? Object.keys(payments[0]) : [],
          sample: payments?.[0] || null
        },
        admin_users: {
          count: usersCount,
          structure: users?.[0] ? Object.keys(users[0]) : [],
          sample: users?.[0] || null
        }
      }
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur diagnostic structure', 
      details: error.message 
    }, { status: 500 });
  }
}