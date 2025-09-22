export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    // 1. Trouver waibooth.app2@gmail.com
    const { data: user, error: userError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', 'waibooth.app2@gmail.com')
      .single();

    // 2. Voir ses paiements actuels  
    const { data: userPayments, error: paymentsError } = await supabase
      .from('admin_payments')
      .select('*')
      .eq('admin_user_id', user?.id || 'none');

    // 3. Voir tous les paiements avec leurs user_id
    const { data: allPayments, error: allError } = await supabase
      .from('admin_payments')
      .select('id, admin_user_id, plan, photo_quota')
      .order('created_at', { ascending: false });

    return Response.json({
      target_user: user,
      user_error: userError?.message,
      current_payments_for_user: userPayments?.length || 0,
      payments_error: paymentsError?.message,
      all_payments_sample: allPayments?.slice(0, 10).map(p => ({
        id: p.id,
        admin_user_id: p.admin_user_id,
        plan: p.plan,
        quota: p.photo_quota
      })),
      total_payments: allPayments?.length,
      user_id_found: user?.id,
      test_query_results: {
        user_exists: !!user,
        user_has_payments: userPayments?.length > 0
      }
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur debug', 
      details: error.message 
    }, { status: 500 });
  }
}