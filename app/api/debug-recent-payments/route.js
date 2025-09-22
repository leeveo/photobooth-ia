export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    // 1. Chercher tous les paiements récents (dernières 24h)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentPayments, error: paymentsError } = await supabase
      .from('admin_payments')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    // 2. Chercher spécifiquement jumpwiththedevil.evhtribute@gmail.com
    const { data: userAccount, error: userError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', 'jumpwiththedevil.evhtribute@gmail.com')
      .single();

    // 3. Chercher des paiements pour cet utilisateur
    const { data: userPayments, error: userPaymentsError } = await supabase
      .from('admin_payments')
      .select('*')
      .eq('admin_email', 'jumpwiththedevil.evhtribute@gmail.com');

    // 4. Chercher des paiements par user_id
    const { data: userIdPayments, error: userIdError } = await supabase
      .from('admin_payments')
      .select('*')
      .eq('admin_user_id', userAccount?.id);

    // 5. Chercher tous les paiements pour identifier le pattern
    const { data: allPayments, error: allError } = await supabase
      .from('admin_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return Response.json({
      timestamp: new Date().toISOString(),
      user_account: userAccount,
      user_account_error: userError?.message,
      recent_payments_24h: recentPayments || [],
      payments_by_email: userPayments || [],
      payments_by_user_id: userIdPayments || [],
      all_recent_payments: allPayments || [],
      stripe_webhook_status: "À vérifier - le paiement Stripe semble réussi mais pas dans la DB",
      expected_payment: {
        customer_email: "jumpwiththedevil.evhtribute@gmail.com",
        amount: 4900,
        plan: "Plan Essentiel",
        price_id: "price_1SA8hHRBtAFMZV17URFPVdai",
        invoice_id: "in_1SAAmBRBtAFMZV17vhZjw1WB"
      }
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur diagnostic', 
      details: error.message 
    }, { status: 500 });
  }
}