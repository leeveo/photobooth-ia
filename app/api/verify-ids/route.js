export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    // Les IDs qu'on utilise
    const sourceUserIds = [
      '7a77784c-7864-4fbb-8cb5-1f9b40ca1f62', // liveshopping.aws@gmail.com
      'bb70d283-b02e-4e22-9d06-a705952b366b', // tcrochet@mobilactif.fr  
      '8fdfef23-8fdf-4268-81bc-c3b9141254ff'  // marcmenu707@gmail.com
    ];
    
    const results = {};
    
    // Vérifier chaque ID un par un
    for (const userId of sourceUserIds) {
      // Compter les paiements pour cet ID
      const { count, error: countError } = await supabase
        .from('admin_payments')
        .select('*', { count: 'exact', head: true })
        .eq('admin_user_id', userId);

      // Récupérer quelques paiements pour cet ID  
      const { data: payments, error: paymentsError } = await supabase
        .from('admin_payments')
        .select('id, admin_user_id, plan, photo_quota')
        .eq('admin_user_id', userId)
        .limit(3);

      // Vérifier l'utilisateur
      const { data: user, error: userError } = await supabase
        .from('admin_users')
        .select('id, email')
        .eq('id', userId)
        .single();

      results[userId] = {
        user_exists: !userError,
        user_email: user?.email || 'INTROUVABLE',
        user_error: userError?.message,
        payments_count: count || 0,
        payments_count_error: countError?.message,
        sample_payments: payments || [],
        payments_sample_error: paymentsError?.message
      };
    }

    return Response.json({
      timestamp: new Date().toISOString(),
      ids_verification: results,
      summary: {
        total_source_ids_tested: sourceUserIds.length,
        ids_with_users: Object.values(results).filter(r => r.user_exists).length,
        ids_with_payments: Object.values(results).filter(r => r.payments_count > 0).length
      },
      debug_info: {
        database_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40) + '...',
        service_role_key_length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
      }
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur diagnostic IDs', 
      details: error.message 
    }, { status: 500 });
  }
}