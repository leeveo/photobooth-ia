import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    // Vérifier s'il y a une table pour les logs webhook
    const { data: webhookLogs, error: logError } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Même si la table n'existe pas, on continue
    
    // Vérifier les derniers paiements
    const { data: recentPayments, error: paymentsError } = await supabase
      .from('admin_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (paymentsError) {
      console.error('Payments error:', paymentsError);
    }

    // Vérifier les derniers utilisateurs créés
    const { data: recentUsers, error: usersError } = await supabase
      .from('admin_users')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (usersError) {
      console.error('Users error:', usersError);
    }

    return Response.json({
      webhookLogs: webhookLogs || [],
      recentPayments: recentPayments || [],
      recentUsers: recentUsers || [],
      logError: logError?.message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug webhook error:', error);
    return Response.json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}