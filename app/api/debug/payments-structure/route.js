import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    // Récupérer quelques lignes d'admin_payments pour voir la structure
    const { data: payments, error } = await supabase
      .from('admin_payments')
      .select('*')
      .limit(3);

    if (error) {
      return Response.json({ error: error.message });
    }

    // Récupérer la structure des colonnes
    const columns = payments.length > 0 ? Object.keys(payments[0]) : [];

    return Response.json({
      sample_payments: payments,
      columns: columns,
      total_count: payments.length
    });

  } catch (error) {
    return Response.json({ error: error.message });
  }
}