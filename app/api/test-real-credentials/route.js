export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

// UTILISER LES BONNES VALEURS depuis .env.local
const supabase = createClient(
  'https://gyohqmahwntkmebayeej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b2hxbWFod250a21lYmF5ZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDg5NDksImV4cCI6MjA2MjYyNDk0OX0.Pfjtro2esmKm1xKdCtgxnagpdOS7oS9JGhuf31aX8_M'
);

export async function POST() {
  try {
    console.log('🔧 TRANSFERT AVEC BONNES CREDENTIALS');
    
    // 1. Test de permissions avec la vraie clé anon
    const { data: testRead, error: readError } = await supabase
      .from('admin_payments')
      .select('id, admin_user_id')
      .limit(1)
      .single();

    if (readError) {
      return Response.json({
        error: 'Problème de lecture',
        details: readError.message,
        suggestion: 'La clé anon ne permet peut-être que la lecture'
      }, { status: 403 });
    }

    // 2. Test d'écriture
    const { data: testWrite, error: writeError } = await supabase
      .from('admin_payments')
      .update({ admin_user_id: testRead.admin_user_id }) // Mise à jour avec la même valeur
      .eq('id', testRead.id)
      .select();

    if (writeError) {
      return Response.json({
        error: 'Permissions insuffisantes',
        details: writeError.message,
        solution: 'Il faut une VRAIE service_role_key, pas la clé anon',
        current_key_type: 'anon (lecture seule)',
        needed_key_type: 'service_role (lecture/écriture)'
      }, { status: 403 });
    }

    return Response.json({
      success: true,
      message: 'Test de permissions réussi',
      details: 'La clé anon permet étonnamment l\'écriture',
      next_step: 'Essayer le transfert réel'
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur test permissions', 
      details: error.message 
    }, { status: 500 });
  }
}