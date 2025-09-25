import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    console.log(`[QUOTA_DEBUG] === REQUÊTE DEBUG ===`);
    
    const body = await req.json();
    console.log(`[QUOTA_DEBUG] Body:`, JSON.stringify(body, null, 2));
    
    const { adminId, action } = body;
    
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID requis' }, { status: 400 });
    }

    if (action === 'check_quota_usage') {
      console.log(`[QUOTA_DEBUG] Vérification quota_usage pour admin: ${adminId}`);
      
      // Récupérer tous les enregistrements quota_usage pour cet admin
      const { data: quotaUsage, error: quotaError } = await supabase
        .from('quota_usage')
        .select('*')
        .eq('admin_user_id', adminId)
        .order('consumed_at', { ascending: false });
      
      console.log(`[QUOTA_DEBUG] Quota usage:`, { quotaUsage, quotaError });
      
      if (quotaError) {
        return NextResponse.json({ 
          error: 'Erreur lors de la récupération quota_usage', 
          details: quotaError 
        }, { status: 500 });
      }
      
      return NextResponse.json({
        adminId: adminId,
        totalUsage: quotaUsage?.length || 0,
        usageRecords: quotaUsage || [],
        success: true
      });
    }

    if (action === 'simulate_dashboard_calc') {
      console.log(`[QUOTA_DEBUG] Simulation calcul dashboard pour admin: ${adminId}`);
      
      // Simuler le calcul comme dans le dashboard
      try {
        // 1. Récupérer le quota de base et la date de reset
        const { data: lastPayment } = await supabase
          .from('admin_payments')
          .select('photo_quota, photo_quota_reset_at')
          .eq('admin_user_id', adminId)
          .order('photo_quota_reset_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        let quota = 3; // Par défaut
        let resetAt = new Date().toISOString();
        
        if (lastPayment) {
          quota = lastPayment.photo_quota || 0;
          resetAt = lastPayment.photo_quota_reset_at;
        } else {
          // Utilisateur gratuit - récupérer date création compte
          const { data: adminData } = await supabase
            .from('admin_users')
            .select('created_at')
            .eq('id', adminId)
            .single();
          
          if (adminData) {
            resetAt = adminData.created_at;
          }
        }

        // 2. Compter les quotas utilisés depuis le reset
        const { count } = await supabase
          .from('quota_usage')
          .select('id', { count: 'exact', head: true })
          .eq('admin_user_id', adminId)
          .gte('consumed_at', resetAt);
        
        const used = count || 0;

        return NextResponse.json({
          adminId: adminId,
          calculation: {
            baseQuota: quota,
            resetAt: resetAt,
            usedQuota: used,
            remainingQuota: Math.max(0, quota - used)
          },
          success: true
        });
        
      } catch (error) {
        console.error('[QUOTA_DEBUG] Erreur simulation dashboard:', error);
        return NextResponse.json({ 
          error: 'Erreur simulation dashboard', 
          details: error.message 
        }, { status: 500 });
      }
    }
    
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID requis' }, { status: 400 });
    }

    console.log(`[QUOTA_DEBUG] Variables d'environnement:`);
    console.log(`[QUOTA_DEBUG] SUPABASE_URL:`, process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : 'MANQUANT');
    console.log(`[QUOTA_DEBUG] SUPABASE_KEY:`, process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'MANQUANT');

    // Test de connexion Supabase
    console.log(`[QUOTA_DEBUG] Test connexion Supabase...`);
    
    try {
      const { data: testConnection, error: connectionError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', adminId)
        .single();
      
      console.log(`[QUOTA_DEBUG] Test connexion:`, { testConnection, connectionError });
      
      if (connectionError) {
        return NextResponse.json({ 
          error: 'Erreur connexion Supabase', 
          details: connectionError 
        }, { status: 500 });
      }
      
      if (!testConnection) {
        return NextResponse.json({ 
          error: 'Admin ID non trouvé dans la base', 
          adminId: adminId 
        }, { status: 404 });
      }
      
    } catch (dbError) {
      console.error(`[QUOTA_DEBUG] Erreur DB:`, dbError);
      return NextResponse.json({ 
        error: 'Erreur base de données', 
        details: dbError.message 
      }, { status: 500 });
    }

    if (action === 'check-sessions') {
      console.log(`[QUOTA_DEBUG] Vérification structure table sessions...`);
      
      try {
        // Vérifier la structure de la table sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .limit(1);
        
        console.log(`[QUOTA_DEBUG] Structure sessions:`, { sessionsData, sessionsError });
        
        if (sessionsError) {
          return NextResponse.json({ 
            error: 'Erreur lecture sessions', 
            details: sessionsError 
          }, { status: 500 });
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Structure sessions OK',
          sampleData: sessionsData,
          columns: sessionsData?.[0] ? Object.keys(sessionsData[0]) : []
        });
        
      } catch (exception) {
        console.error(`[QUOTA_DEBUG] Exception sessions:`, exception);
        return NextResponse.json({ 
          error: 'Exception lecture sessions', 
          details: exception.message 
        }, { status: 500 });
      }
    }

    if (action === 'test-insert') {
      console.log(`[QUOTA_DEBUG] Test insertion avec session valide...`);
      
      try {
        // 1. Créer d'abord une session valide avec UUID
        const sessionId = crypto.randomUUID(); // Générer un vrai UUID
        console.log(`[QUOTA_DEBUG] Création session UUID: ${sessionId}`);
        
        // Essayer avec les vrais champs de la table sessions
        const { data: sessionResult, error: sessionError } = await supabase
          .from('sessions')
          .insert({
            id: sessionId,
            user_email: 'quota-test@example.com',
            project_id: null, // ou un projet valide si nécessaire
            created_by: adminId, // utiliser created_by au lieu de admin_user_id
            result_image_url: 'quota-test-session',
            is_success: true,
            processing_time_ms: 0,
            ai_source: 'test',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        console.log(`[QUOTA_DEBUG] Résultat session:`, { sessionResult, sessionError });
        
        if (sessionError) {
          return NextResponse.json({ 
            error: 'Erreur création session', 
            details: sessionError 
          }, { status: 500 });
        }
        
        // 2. Maintenant insérer dans quota_usage avec session_id valide
        const { data: insertResult, error: insertError } = await supabase
          .from('quota_usage')
          .insert({
            admin_user_id: adminId,
            session_id: sessionId,
            quota_type: 'monthly',
            consumed_at: new Date().toISOString()
          })
          .select();
        
        console.log(`[QUOTA_DEBUG] Résultat insertion:`, { insertResult, insertError });
        
        if (insertError) {
          return NextResponse.json({ 
            error: 'Erreur insertion quota_usage', 
            details: insertError 
          }, { status: 500 });
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Insertion réussie avec session',
          sessionResult,
          insertResult 
        });
        
      } catch (insertException) {
        console.error(`[QUOTA_DEBUG] Exception insertion:`, insertException);
        return NextResponse.json({ 
          error: 'Exception lors de l\'insertion', 
          details: insertException.message 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Debug API fonctionne',
      adminId: adminId 
    });

  } catch (error) {
    console.error('[QUOTA_DEBUG] ERREUR GLOBALE:', error);
    console.error('[QUOTA_DEBUG] Stack:', error.stack);
    return NextResponse.json({ 
      error: 'Erreur globale', 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}