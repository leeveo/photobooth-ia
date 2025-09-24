import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Marquer comme dynamique pour éviter l'erreur de rendu statique
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || 'waibooth.app2@gmail.com';

  try {
    // Vérifier l'utilisateur dans admin_users
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single();

    if (adminError && adminError.code !== 'PGRST116') {
      throw adminError;
    }

    // Vérifier le quota dans admin_quotas
    let quotaData = null;
    if (adminUser) {
      const { data: quota, error: quotaError } = await supabase
        .from('admin_quotas')
        .select('*')
        .eq('admin_id', adminUser.id)
        .single();

      if (quotaError && quotaError.code !== 'PGRST116') {
        throw quotaError;
      }
      quotaData = quota;
    }

    // Vérifier l'historique des paiements
    const { data: payments, error: paymentsError } = await supabase
      .from('admin_payments')
      .select('*')
      .eq('admin_email', email)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      throw paymentsError;
    }

    return Response.json({
      email,
      adminUser,
      quotaData,
      payments,
      success: true
    });

  } catch (error) {
    console.error('Debug user error:', error);
    return Response.json({
      email,
      error: error.message,
      success: false
    });
  }
}