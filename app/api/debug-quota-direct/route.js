import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  const adminId = '7a77784c-7864-4fbb-8cb5-1f9b40ca1f62';

  try {
    console.log('=== DEBUG QUOTA DIRECT ===');
    
    // 1. Récupérer le dernier paiement
    const { data: paymentData, error: paymentError } = await supabase
      .from('admin_payments')
      .select('photo_quota, photo_quota_reset_at, created_at, stripe_subscription_status, status, quota_expires_at')
      .eq('admin_user_id', adminId)
      .eq('status', 'succeeded')
      .in('stripe_subscription_status', ['active', 'trialing'])
      .gte('quota_expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log('Payment data:', paymentData, paymentError);

    // 2. Récupérer admin création
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('created_at')
      .eq('id', adminId)
      .single();

    console.log('Admin data:', adminData, adminError);

    // 3. Déterminer quota et resetAt
    let quota = 3;
    let resetAt = adminData?.created_at || new Date().toISOString();

    if (paymentData) {
      quota = paymentData.photo_quota || 0;
      resetAt = paymentData.photo_quota_reset_at || resetAt;
    }

    console.log('Quota de base:', quota);
    console.log('Reset à:', resetAt);

    // 4. Récupérer addons
    const { data: addonData } = await supabase
      .from('addon_purchases')
      .select('addon_value, created_at')
      .eq('admin_user_id', adminId)
      .eq('status', 'completed');

    const addonPhotos = addonData?.reduce((total, purchase) => {
      return total + (purchase.addon_value || 0);
    }, 0) || 0;

    console.log('Photos addon:', addonPhotos);

    const totalQuota = quota + addonPhotos;
    console.log('Quota total:', totalQuota);

    // 5. Compter quota_usage depuis resetAt
    const { count, error: usageError } = await supabase
      .from('quota_usage')
      .select('id', { count: 'exact', head: true })
      .eq('admin_user_id', adminId)
      .gte('consumed_at', resetAt);

    console.log('Quota usage count:', count, usageError);

    // 6. Récupérer tous les enregistrements quota_usage pour analyser
    const { data: usageRecords } = await supabase
      .from('quota_usage')
      .select('*')
      .eq('admin_user_id', adminId)
      .order('consumed_at', { ascending: false });

    console.log('All quota usage records:', usageRecords);

    // 7. Compter TOUS les quota_usage (ignorer la date de reset)
    const { count: totalUsageCount } = await supabase
      .from('quota_usage')
      .select('id', { count: 'exact', head: true })
      .eq('admin_user_id', adminId);

    const debug = {
      adminId: adminId,
      paymentData: paymentData,
      paymentError: paymentError,
      adminCreatedAt: adminData?.created_at,
      quotaDeBase: quota,
      addonPhotos: addonPhotos,
      quotaTotal: totalQuota,
      resetAt: resetAt,
      photosUtiliseesDepsReset: count || 0,
      totalPhotosUtilisees: totalUsageCount || 0,
      photosRestantes: totalQuota - (count || 0),
      usageRecords: usageRecords?.slice(0, 10), // Limiter pour l'affichage
      allUsageRecords: usageRecords,
      dateActuelle: new Date().toISOString()
    };

    return NextResponse.json(debug, { status: 200 });

  } catch (error) {
    console.error('Erreur debug quota:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}