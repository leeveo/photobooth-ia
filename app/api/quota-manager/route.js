import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { adminId, action = 'check' } = await req.json();
    console.log(`[QUOTA_MANAGER] Action: ${action} for admin: ${adminId}`);
    
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID requis' }, { status: 400 });
    }

    if (action === 'check') {
      return await checkQuotaStatus(adminId);
    } else if (action === 'consume') {
      const { sessionId, projectId } = await req.json();
      return await consumeQuota(adminId, sessionId, projectId);
    } else {
      return NextResponse.json({ error: 'Action non supportée' }, { status: 400 });
    }

  } catch (error) {
    console.error('[QUOTA_MANAGER] Erreur:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function checkQuotaStatus(adminId) {
  console.log(`[QUOTA_MANAGER] Vérification quota pour admin: ${adminId}`);
  
  try {
    // DEBUG: D'abord, regardons tous les paiements pour cet admin
    const { data: allPayments, error: debugError } = await supabase
      .from('admin_payments')
      .select('*')
      .eq('admin_user_id', adminId)
      .order('created_at', { ascending: false });

    console.log(`[DEBUG] Tous les paiements trouvés:`, allPayments?.slice(0, 3));
    
    // 1. Récupérer le quota mensuel avec validations strictes
    const { data: paymentData } = await supabase
      .from('admin_payments')
      .select('photo_quota, photo_quota_reset_at, created_at, status, plan, stripe_subscription_status, quota_expires_at, amount')
      .eq('admin_user_id', adminId)
      .eq('status', 'succeeded') // SEULEMENT les paiements réussis
      .in('stripe_subscription_status', ['active', 'trialing']) // SEULEMENT les abonnements actifs
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log(`[DEBUG] Payment data strictement validé:`, paymentData);

    let monthlyQuota = 3; // Quota gratuit par défaut
    let quotaResetAt = null;
    let isFreePlan = true;
    let planValidationDetails = {
      hasPayment: false,
      paymentStatus: null,
      subscriptionStatus: null,
      isExpired: false
    };
    
    if (paymentData) {
      // Validations supplémentaires pour sécuriser l'accès
      const now = new Date();
      const resetDate = new Date(paymentData.photo_quota_reset_at);
      const isQuotaExpired = resetDate < now;
      
      planValidationDetails = {
        hasPayment: true,
        paymentStatus: paymentData.status,
        subscriptionStatus: paymentData.stripe_subscription_status,
        isExpired: isQuotaExpired,
        resetDate: paymentData.photo_quota_reset_at,
        amount: paymentData.amount
      };

      // VALIDATION STRICTE : Accorder le quota seulement si TOUT est valide
      if (paymentData.status === 'succeeded' && 
          ['active', 'trialing'].includes(paymentData.stripe_subscription_status) &&
          !isQuotaExpired) {
        
        monthlyQuota = paymentData.photo_quota || 0;
        quotaResetAt = paymentData.photo_quota_reset_at;
        isFreePlan = false;
        
        console.log(`[QUOTA_MANAGER] Plan validé: ${monthlyQuota} photos, reset: ${quotaResetAt}`);
      } else {
        console.log(`[QUOTA_MANAGER] Plan invalidé - Status: ${paymentData.status}, Subscription: ${paymentData.stripe_subscription_status}, Expired: ${isQuotaExpired}`);
        monthlyQuota = 3; // Retour au plan gratuit
        isFreePlan = true;
        
        // Pour les utilisateurs déchus, utiliser la date de création
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('created_at')
          .eq('id', adminId)
          .single();
        quotaResetAt = adminData?.created_at || new Date().toISOString();
      }
    } else {
      // Aucun paiement valide trouvé
      planValidationDetails.hasPayment = false;
      console.log(`[QUOTA_MANAGER] Aucun paiement valide trouvé`);
      
      // Pour les utilisateurs gratuits, utiliser la date de création
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('created_at')
        .eq('id', adminId)
        .single();
      quotaResetAt = adminData?.created_at || new Date().toISOString();
    }

    // 2. Calculer la consommation mensuelle
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id')
      .eq('created_by', adminId);
    
    const projectIds = projectsData?.map(p => p.id) || [];
    
    let monthlyConsumed = 0;
    if (projectIds.length > 0) {
      const { count } = await supabase
        .from('quota_usage')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('quota_type', 'monthly')
        .gte('consumed_at', quotaResetAt);
      
      monthlyConsumed = count || 0;
    }

    // 3. Récupérer les addons et leur utilisation
    const { data: addonPurchases } = await supabase
      .from('addon_purchases')
      .select(`
        id,
        addon_value,
        addon_name,
        created_at,
        addon_usage (
          photos_consumed,
          photos_remaining
        )
      `)
      .eq('admin_user_id', adminId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true }); // FIFO : premier acheté = premier consommé

    let totalAddonPhotos = 0;
    let totalAddonRemaining = 0;
    const addonsWithUsage = [];

    for (const addon of addonPurchases || []) {
      const usage = addon.addon_usage[0] || { photos_consumed: 0, photos_remaining: addon.addon_value };
      totalAddonPhotos += addon.addon_value;
      totalAddonRemaining += usage.photos_remaining;
      
      addonsWithUsage.push({
        id: addon.id,
        name: addon.addon_name,
        total: addon.addon_value,
        consumed: usage.photos_consumed,
        remaining: usage.photos_remaining,
        purchasedAt: addon.created_at
      });
    }

    const result = {
      // Quota mensuel
      monthly: {
        quota: monthlyQuota,
        consumed: monthlyConsumed,
        remaining: Math.max(0, monthlyQuota - monthlyConsumed),
        resetAt: quotaResetAt,
        isFreePlan,
        validation: planValidationDetails // Ajout des détails de validation
      },
      
      // Addons
      addons: {
        total: totalAddonPhotos,
        remaining: totalAddonRemaining,
        packs: addonsWithUsage
      },
      
      // Total
      total: {
        quota: monthlyQuota + totalAddonPhotos,
        consumed: monthlyConsumed + (totalAddonPhotos - totalAddonRemaining),
        remaining: Math.max(0, monthlyQuota - monthlyConsumed) + totalAddonRemaining
      },
      
      // Logique de consommation
      canTakePhoto: (Math.max(0, monthlyQuota - monthlyConsumed) + totalAddonRemaining) > 0,
      nextQuotaSource: Math.max(0, monthlyQuota - monthlyConsumed) > 0 ? 'monthly' : 'addon'
    };

    console.log(`[QUOTA_MANAGER] Résultat quota:`, result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[QUOTA_MANAGER] Erreur check:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function consumeQuota(adminId, sessionId, projectId) {
  console.log(`[QUOTA_MANAGER] Consommation quota - Admin: ${adminId}, Session: ${sessionId}`);
  
  try {
    // 1. Vérifier le quota actuel
    const checkResponse = await checkQuotaStatus(adminId);
    const quotaStatus = await checkResponse.json();
    
    if (!quotaStatus.canTakePhoto) {
      return NextResponse.json({ 
        error: 'Quota épuisé',
        quotaStatus 
      }, { status: 403 });
    }

    // 2. Déterminer quel quota consommer (mensuel en premier, puis addons FIFO)
    let quotaType = 'monthly';
    let addonPurchaseId = null;
    
    if (quotaStatus.monthly.remaining <= 0) {
      // Quota mensuel épuisé, utiliser le premier addon disponible
      quotaType = 'addon';
      const firstAvailableAddon = quotaStatus.addons.packs.find(pack => pack.remaining > 0);
      if (firstAvailableAddon) {
        addonPurchaseId = firstAvailableAddon.id;
      } else {
        return NextResponse.json({ 
          error: 'Aucun quota disponible',
          quotaStatus 
        }, { status: 403 });
      }
    }

    // 3. Enregistrer la consommation
    const { error: insertError } = await supabase
      .from('quota_usage')
      .insert({
        admin_user_id: adminId,
        session_id: sessionId,
        project_id: projectId,
        quota_type: quotaType,
        addon_purchase_id: addonPurchaseId
      });

    if (insertError) {
      console.error('[QUOTA_MANAGER] Erreur insertion quota_usage:', insertError);
      return NextResponse.json({ error: 'Erreur enregistrement consommation' }, { status: 500 });
    }

    // 4. Si c'est un addon, mettre à jour addon_usage
    if (quotaType === 'addon' && addonPurchaseId) {
      const { error: updateError } = await supabase
        .from('addon_usage')
        .update({
          photos_consumed: supabase.raw('photos_consumed + 1'),
          photos_remaining: supabase.raw('photos_remaining - 1'),
          last_consumed_at: new Date().toISOString()
        })
        .eq('addon_purchase_id', addonPurchaseId);

      if (updateError) {
        console.error('[QUOTA_MANAGER] Erreur mise à jour addon_usage:', updateError);
        // Note: On ne fait pas échouer la requête car quota_usage est déjà inséré
      }
    }

    // 5. Retourner le nouveau statut
    const updatedResponse = await checkQuotaStatus(adminId);
    const updatedStatus = await updatedResponse.json();
    
    return NextResponse.json({
      success: true,
      consumed: {
        type: quotaType,
        addonPurchaseId
      },
      quotaStatus: updatedStatus
    });

  } catch (error) {
    console.error('[QUOTA_MANAGER] Erreur consume:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}