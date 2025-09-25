import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    console.log('=== TEST TOUS LES TYPES D\'UTILISATEURS ===');
    
    // 1. Récupérer tous les admins avec leurs données
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, created_at')
      .order('created_at', { ascending: false });

    if (adminError) {
      return NextResponse.json({ error: adminError.message }, { status: 500 });
    }

    const results = [];

    for (const admin of adminUsers) {
      console.log(`\n--- Testing admin: ${admin.email} ---`);
      
      try {
        // Simuler le calcul du dashboard pour cet admin
        const [paymentResult, addonResult] = await Promise.all([
          // 1. Récupérer le quota et la date de reset du dernier paiement ACTIF
          supabase
            .from('admin_payments')
            .select('photo_quota, photo_quota_reset_at, created_at, plan, status, stripe_subscription_status')
            .eq('admin_user_id', admin.id)
            .eq('status', 'succeeded')
            .in('stripe_subscription_status', ['active', 'trialing'])
            .gte('quota_expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          
          // 2. Récupérer les achats addon
          supabase
            .from('addon_purchases')
            .select('addon_value, addon_name, created_at')
            .eq('admin_user_id', admin.id)
            .eq('status', 'completed')
        ]);

        let quota = 3; // Quota gratuit par défaut
        let resetAt = admin.created_at;
        let userType = 'Gratuit';
        let planInfo = 'Plan gratuit (3 photos)';

        if (!paymentResult.error && paymentResult.data) {
          // Utilisateur payant
          quota = paymentResult.data.photo_quota || 0;
          resetAt = paymentResult.data.created_at;
          userType = 'Payant';
          planInfo = `${paymentResult.data.plan || 'Unknown'} (${quota} photos)`;
        }

        // Calculer le total des photos addon
        const totalAddonPhotos = addonResult.data?.reduce((total, purchase) => {
          return total + (purchase.addon_value || 0);
        }, 0) || 0;

        const totalQuota = quota + totalAddonPhotos;

        // Compter les quotas consommés depuis le reset
        const { count: photosUsed } = await supabase
          .from('quota_usage')
          .select('id', { count: 'exact', head: true })
          .eq('admin_user_id', admin.id)
          .gte('consumed_at', resetAt);

        // Compter le total de photos générées (ignorer la date de reset)
        const { count: totalPhotosGenerated } = await supabase
          .from('quota_usage')
          .select('id', { count: 'exact', head: true })
          .eq('admin_user_id', admin.id);

        results.push({
          adminId: admin.id,
          email: admin.email,
          userType: userType,
          planInfo: planInfo,
          quotaCalculation: {
            quotaDeBase: quota,
            addonPhotos: totalAddonPhotos,
            quotaTotal: totalQuota,
            resetAt: resetAt,
            photosUsedInPeriod: photosUsed || 0,
            totalPhotosGenerated: totalPhotosGenerated || 0,
            quotaRestant: Math.max(0, totalQuota - (photosUsed || 0))
          },
          paymentData: paymentResult.data,
          addonData: addonResult.data || [],
          isSystemWorkingCorrectly: true
        });

      } catch (error) {
        console.error(`Erreur pour admin ${admin.email}:`, error);
        results.push({
          adminId: admin.id,
          email: admin.email,
          userType: 'Erreur',
          error: error.message,
          isSystemWorkingCorrectly: false
        });
      }
    }

    // Analyse globale
    const summary = {
      totalUsers: results.length,
      usersByType: {
        gratuit: results.filter(r => r.userType === 'Gratuit').length,
        payant: results.filter(r => r.userType === 'Payant').length,
        erreur: results.filter(r => r.userType === 'Erreur').length
      },
      usersWithPhotos: results.filter(r => r.quotaCalculation?.totalPhotosGenerated > 0).length,
      potentialIssues: results.filter(r => 
        !r.isSystemWorkingCorrectly || 
        (r.quotaCalculation && r.quotaCalculation.quotaRestant < 0)
      )
    };

    return NextResponse.json({
      summary,
      userDetails: results,
      timestamp: new Date().toISOString(),
      systemStatus: summary.potentialIssues.length === 0 ? 'HEALTHY' : 'ISSUES_DETECTED'
    });

  } catch (error) {
    console.error('Erreur globale test utilisateurs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}