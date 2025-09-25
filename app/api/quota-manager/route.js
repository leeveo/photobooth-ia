import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    console.log(`[QUOTA_MANAGER] === DÉBUT REQUÊTE ===`);
    
    // ✅ FIX: Lire toutes les données du body en une seule fois
    const body = await req.json();
    console.log(`[QUOTA_MANAGER] Body reçu:`, JSON.stringify(body, null, 2));
    
    const { adminId, action = 'check', sessionId, projectId } = body;
    console.log(`[QUOTA_MANAGER] Action: ${action} for admin: ${adminId}, sessionId: ${sessionId}, projectId: ${projectId}`);
    
    if (!adminId) {
      console.log(`[QUOTA_MANAGER] ERROR: Admin ID manquant`);
      return NextResponse.json({ error: 'Admin ID requis' }, { status: 400 });
    }

    if (action === 'check') {
      console.log(`[QUOTA_MANAGER] Appel checkQuotaStatus...`);
      return await checkQuotaStatus(adminId);
    } else if (action === 'consume') {
      console.log(`[QUOTA_MANAGER] Appel consumeQuota...`);
      return await consumeQuota(adminId, sessionId, projectId);
    } else {
      console.log(`[QUOTA_MANAGER] ERROR: Action non supportée: ${action}`);
      return NextResponse.json({ error: 'Action non supportée' }, { status: 400 });
    }

  } catch (error) {
    console.error('[QUOTA_MANAGER] ERREUR GLOBALE:', error);
    console.error('[QUOTA_MANAGER] Stack trace:', error.stack);
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

    // 2. Calculer la consommation mensuelle - FIX: Utiliser admin_user_id au lieu de project_id
    console.log(`[QUOTA_MANAGER] Calcul consommation avec resetAt: ${quotaResetAt}`);
    
    const { count, error: countError } = await supabase
      .from('quota_usage')
      .select('id', { count: 'exact', head: true })
      .eq('admin_user_id', adminId) // ✅ FIX: Utiliser admin_user_id directement
      .gte('consumed_at', quotaResetAt);
    
    if (countError) {
      console.error('[QUOTA_MANAGER] Erreur comptage quota:', countError);
    }
    
    const monthlyConsumed = count || 0;
    console.log(`[QUOTA_MANAGER] Photos consommées trouvées: ${monthlyConsumed}`);

    // 3. Récupérer les addons - SIMPLIFIÉ pour correspondre au dashboard
    const { data: addonPurchases } = await supabase
      .from('addon_purchases')
      .select('addon_value')
      .eq('admin_user_id', adminId)
      .eq('status', 'completed');

    const totalAddonPhotos = addonPurchases?.reduce((total, purchase) => {
      return total + (purchase.addon_value || 0);
    }, 0) || 0;
    
    console.log(`[QUOTA_MANAGER] Addons calculés: ${totalAddonPhotos} photos`);

    // Calculer les quotas
    const totalQuota = monthlyQuota + totalAddonPhotos;
    const remaining = Math.max(0, totalQuota - monthlyConsumed);
    
    console.log(`[QUOTA_MANAGER] Calculs finaux: ${monthlyQuota} (mensuel) + ${totalAddonPhotos} (addons) = ${totalQuota} total, ${monthlyConsumed} consommé, ${remaining} restant`);

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
        remaining: Math.max(0, remaining - Math.max(0, monthlyQuota - monthlyConsumed)), // Ce qui reste des addons
        packs: [] // Simplifié
      },
      
      // Total
      total: {
        quota: totalQuota,
        consumed: monthlyConsumed,
        remaining: remaining
      },
      
      // Logique de consommation
      canTakePhoto: remaining > 0,
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
  console.log(`[QUOTA_MANAGER] === DÉBUT CONSUME_QUOTA ===`);
  console.log(`[QUOTA_MANAGER] Params - Admin: ${adminId}, Session: ${sessionId}, Project: ${projectId}`);
  
  try {
    // 1. Vérifier le quota actuel
    console.log(`[QUOTA_MANAGER] 1. Vérification quota actuel...`);
    const checkResponse = await checkQuotaStatus(adminId);
    console.log(`[QUOTA_MANAGER] checkResponse status:`, checkResponse.status);
    
    const quotaStatus = await checkResponse.json();
    console.log(`[QUOTA_MANAGER] quotaStatus:`, JSON.stringify(quotaStatus, null, 2));
    
    if (!quotaStatus.canTakePhoto) {
      console.log(`[QUOTA_MANAGER] ERROR: Quota épuisé`);
      return NextResponse.json({ 
        error: 'Quota épuisé',
        quotaStatus 
      }, { status: 403 });
    }

    // 2. Déterminer quel quota consommer (mensuel en premier, puis addons FIFO)
    console.log(`[QUOTA_MANAGER] 2. Détermination type de quota...`);
    let quotaType = 'monthly';
    let addonPurchaseId = null;
    
    console.log(`[QUOTA_MANAGER] Monthly remaining: ${quotaStatus.monthly?.remaining}`);
    
    if (quotaStatus.monthly?.remaining <= 0) {
      // Quota mensuel épuisé, utiliser le premier addon disponible
      console.log(`[QUOTA_MANAGER] Quota mensuel épuisé, recherche addon...`);
      quotaType = 'addon';
      const firstAvailableAddon = quotaStatus.addons?.packs?.find(pack => pack.remaining > 0);
      if (firstAvailableAddon) {
        addonPurchaseId = firstAvailableAddon.id;
        console.log(`[QUOTA_MANAGER] Addon trouvé: ${addonPurchaseId}`);
      } else {
        console.log(`[QUOTA_MANAGER] ERROR: Aucun addon disponible`);
        return NextResponse.json({ 
          error: 'Aucun quota disponible',
          quotaStatus 
        }, { status: 403 });
      }
    }

    console.log(`[QUOTA_MANAGER] Type quota sélectionné: ${quotaType}, addonId: ${addonPurchaseId}`);

    // 3. Enregistrer la consommation - VERSION FONCTIONNELLE
    console.log(`[QUOTA_MANAGER] 3. Création session et insertion quota_usage...`);
    
    try {
      // 1. Créer d'abord une session valide avec UUID
      let actualSessionId;
      
      // Valider que le sessionId est un UUID valide sinon en générer un nouveau
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      if (sessionId && uuidRegex.test(sessionId)) {
        actualSessionId = sessionId;
        console.log(`[QUOTA_MANAGER] UUID valide fourni: ${actualSessionId}`);
      } else {
        actualSessionId = crypto.randomUUID();
        console.log(`[QUOTA_MANAGER] UUID généré (invalide ou manquant): ${actualSessionId}`);
      }
      
      // Valider si le projectId existe (si fourni) pour les nouvelles sessions seulement
      let validProjectId = null;
      if (projectId) {
        const { data: projectExists } = await supabase
          .from('projects')
          .select('id')
          .eq('id', projectId)
          .eq('created_by', adminId)
          .single();
          
        if (projectExists) {
          validProjectId = projectId;
          console.log(`[QUOTA_MANAGER] Projet valide trouvé: ${projectId}`);
        } else {
          console.log(`[QUOTA_MANAGER] Projet inexistant ou non autorisé: ${projectId}, utilisation de null`);
        }
      }
      
      // Vérifier si une session existe déjà avec cet UUID
      let sessionResult;
      
      const { data: existingSession, error: existingSessionError } = await supabase
        .from('sessions')
        .select('id, created_by, project_id')
        .eq('id', actualSessionId)
        .single();
      
      if (existingSession) {
        console.log(`[QUOTA_MANAGER] Session existante trouvée: ${actualSessionId}`);
        
        // Vérifier que cette session appartient bien à cet admin
        if (existingSession.created_by === adminId) {
          sessionResult = existingSession;
          // Mettre à jour le validProjectId avec celui de la session existante si disponible
          validProjectId = existingSession.project_id || validProjectId;
          console.log(`[QUOTA_MANAGER] Réutilisation session existante avec projet: ${validProjectId}`);
        } else {
          console.error(`[QUOTA_MANAGER] Session ${actualSessionId} appartient à un autre admin: ${existingSession.created_by}`);
          return NextResponse.json({ error: 'Session non autorisée' }, { status: 403 });
        }
      } else {
        console.log(`[QUOTA_MANAGER] Création nouvelle session: ${actualSessionId}`);
        
        // Créer session dans la table sessions avec les vrais champs
        const { data: newSession, error: sessionError } = await supabase
          .from('sessions')
          .insert({
            id: actualSessionId,
            user_email: 'quota-consumption@photobooth.ai',
            project_id: validProjectId, // Utiliser le projectId validé ou null
            created_by: adminId,
            result_image_url: 'quota-consumption-tracking',
            is_success: true,
            processing_time_ms: 0,
            ai_source: 'quota_system',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (sessionError) {
          console.error('[QUOTA_MANAGER] Erreur création session:', sessionError);
          return NextResponse.json({ error: 'Erreur création session pour quota' }, { status: 500 });
        }
        
        sessionResult = newSession;
      }
      
      console.log(`[QUOTA_MANAGER] Session utilisée:`, { sessionResult });
      
      // 2. Maintenant insérer dans quota_usage
      const insertData = {
        admin_user_id: adminId,
        session_id: actualSessionId,
        project_id: validProjectId, // Utiliser le projectId validé ou null
        quota_type: quotaType,
        addon_purchase_id: addonPurchaseId,
        consumed_at: new Date().toISOString()
      };
      
      console.log(`[QUOTA_MANAGER] Insertion quota_usage:`, JSON.stringify(insertData, null, 2));
      
      const { data: quotaInsertResult, error: insertError } = await supabase
        .from('quota_usage')
        .insert(insertData)
        .select();

      if (insertError) {
        console.error('[QUOTA_MANAGER] Erreur insertion quota_usage:', insertError);
        return NextResponse.json({ error: 'Erreur enregistrement consommation' }, { status: 500 });
      }
      
      console.log(`[QUOTA_MANAGER] Quota inséré avec succès:`, quotaInsertResult);

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
          addonPurchaseId,
          sessionId: actualSessionId
        },
        quotaStatus: updatedStatus
      });
      
    } catch (insertException) {
      console.error('[QUOTA_MANAGER] Exception insertion complète:', insertException);
      return NextResponse.json({ 
        error: 'Erreur lors de la consommation quota', 
        details: insertException.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[QUOTA_MANAGER] Erreur globale consume:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}