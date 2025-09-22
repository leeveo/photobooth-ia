import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST() {
  try {
    console.log('[MIGRATION] Début de la migration des addons...');

    // 1. Vérifier les addons existants à migrer
    const { data: addonsToMigrate, error: checkError } = await supabase
      .from('addon_purchases')
      .select(`
        id,
        admin_user_id,
        addon_value,
        addon_name,
        status,
        created_at
      `)
      .eq('status', 'completed');

    if (checkError) {
      throw new Error('Erreur vérification addons: ' + checkError.message);
    }

    console.log(`[MIGRATION] ${addonsToMigrate.length} addons à migrer`);

    // 2. Vérifier lesquels sont déjà migrés
    const { data: existingUsage } = await supabase
      .from('addon_usage')
      .select('addon_purchase_id');

    const existingIds = new Set(existingUsage?.map(u => u.addon_purchase_id) || []);
    const newAddons = addonsToMigrate.filter(addon => !existingIds.has(addon.id));

    console.log(`[MIGRATION] ${newAddons.length} nouveaux addons à migrer`);

    if (newAddons.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tous les addons sont déjà migrés',
        migratedCount: 0,
        totalAddons: addonsToMigrate.length
      });
    }

    // 3. Migrer les nouveaux addons
    const usageRecords = newAddons.map(addon => ({
      addon_purchase_id: addon.id,
      admin_user_id: addon.admin_user_id,
      photos_consumed: 0,
      photos_remaining: addon.addon_value,
      last_consumed_at: null  // Correspond à la colonne dans la table
    }));

    const { data: insertedRecords, error: insertError } = await supabase
      .from('addon_usage')
      .insert(usageRecords)
      .select();

    if (insertError) {
      throw new Error('Erreur insertion: ' + insertError.message);
    }

    console.log(`[MIGRATION] ${insertedRecords.length} addons migrés avec succès`);

    // 4. Vérification finale
    const { count: finalCount } = await supabase
      .from('addon_usage')
      .select('id', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: `Migration réussie : ${insertedRecords.length} addons migrés`,
      migratedCount: insertedRecords.length,
      totalAddons: addonsToMigrate.length,
      totalAddonUsageRecords: finalCount,
      migratedAddons: insertedRecords.map(r => ({
        addon_purchase_id: r.addon_purchase_id,
        admin_user_id: r.admin_user_id,
        photos_remaining: r.photos_remaining
      }))
    });

  } catch (error) {
    console.error('[MIGRATION] Erreur:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}