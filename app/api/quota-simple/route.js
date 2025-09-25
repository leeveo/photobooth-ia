import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    console.log(`[QUOTA_SIMPLE] === DÉBUT REQUÊTE SIMPLE ===`);
    
    const body = await req.json();
    console.log(`[QUOTA_SIMPLE] Body reçu:`, JSON.stringify(body, null, 2));
    
    const { adminId, action = 'check', sessionId, projectId } = body;
    
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID requis' }, { status: 400 });
    }

    if (action === 'consume') {
      console.log(`[QUOTA_SIMPLE] === CONSUME SIMPLE ===`);
      
      // Vérifier que la session existe
      if (!sessionId) {
        return NextResponse.json({ error: 'Session ID requis pour consume' }, { status: 400 });
      }
      
      const { data: existingSession, error: sessionCheckError } = await supabase
        .from('sessions')
        .select('id, created_by, project_id')
        .eq('id', sessionId)
        .single();
      
      console.log(`[QUOTA_SIMPLE] Session check:`, { existingSession, sessionCheckError });
      
      if (!existingSession) {
        return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
      }
      
      if (existingSession.created_by !== adminId) {
        return NextResponse.json({ error: 'Session non autorisée' }, { status: 403 });
      }
      
      // Insérer directement dans quota_usage
      const insertData = {
        admin_user_id: adminId,
        session_id: sessionId,
        project_id: existingSession.project_id || projectId || null,
        quota_type: 'monthly',
        addon_purchase_id: null,
        consumed_at: new Date().toISOString()
      };
      
      console.log(`[QUOTA_SIMPLE] Insertion quota_usage:`, insertData);
      
      const { data: quotaInsert, error: quotaError } = await supabase
        .from('quota_usage')
        .insert(insertData)
        .select();
        
      console.log(`[QUOTA_SIMPLE] Résultat insertion:`, { quotaInsert, quotaError });
      
      if (quotaError) {
        console.error('[QUOTA_SIMPLE] Erreur insertion quota_usage:', quotaError);
        return NextResponse.json({ 
          error: 'Erreur insertion quota_usage', 
          details: quotaError 
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        consumed: {
          type: 'monthly',
          sessionId: sessionId,
          quotaRecord: quotaInsert[0]
        }
      });
    }

    return NextResponse.json({ error: 'Action non supportée' }, { status: 400 });

  } catch (error) {
    console.error('[QUOTA_SIMPLE] ERREUR GLOBALE:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}