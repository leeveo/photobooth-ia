import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Erreur d\'authentification:', authError);
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    // Vérifier la structure de la table
    const { data: columns, error: columnsError } = await supabase.rpc(
      'get_table_columns',
      { tablename: 'layout_templates' }
    );
    
    if (columnsError) {
      return NextResponse.json({ 
        error: `Erreur lors de la vérification des colonnes: ${columnsError.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      columns: columns,
      has_project_id: columns.some(col => col.column_name === 'project_id')
    });
    
  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ 
      error: `Erreur serveur: ${error.message}` 
    }, { status: 500 });
  }
}
