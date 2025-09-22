import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    // Lister toutes les tables de la base
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) {
      // Alternative : essayer de lister les tables d'une autre façon
      console.log('Trying alternative method...');
      
      // Tester quelques tables courantes
      const tablesToTest = [
        'admin_users',
        'admin_quotas', 
        'admin_payments',
        'projects',
        'users',
        'quotas',
        'payments'
      ];
      
      const tableStatus = {};
      
      for (const table of tablesToTest) {
        try {
          const { error: testError } = await supabase
            .from(table)
            .select('*')
            .limit(1);
            
          tableStatus[table] = testError ? `Error: ${testError.message}` : 'Exists';
        } catch (e) {
          tableStatus[table] = `Error: ${e.message}`;
        }
      }
      
      return Response.json({
        method: 'alternative',
        tableStatus,
        error: error?.message
      });
    }

    return Response.json({
      method: 'information_schema',
      tables: tables?.map(t => t.table_name) || [],
      count: tables?.length || 0
    });

  } catch (error) {
    console.error('List tables error:', error);
    return Response.json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}