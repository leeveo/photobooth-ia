export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    // Test de permissions et diagnostic profond
    const targetUserId = 'e414751a-43ac-4606-8cc2-f0912bc3ad1f';
    const sourceUserId = '7a77784c-7864-4fbb-8cb5-1f9b40ca1f62'; // liveshopping.aws@gmail.com
    
    // 1. Test de lecture
    const { data: testRead, error: readError } = await supabase
      .from('admin_payments')
      .select('id, admin_user_id, plan, photo_quota')
      .eq('admin_user_id', sourceUserId)
      .limit(1)
      .single();

    // 2. Test de mise à jour sur un enregistrement spécifique
    let updateTest = null;
    let updateError = null;
    
    if (testRead && !readError) {
      const testResult = await supabase
        .from('admin_payments')
        .update({ admin_user_id: targetUserId })
        .eq('id', testRead.id)
        .select('id, admin_user_id')
        .single();
        
      updateTest = testResult.data;
      updateError = testResult.error;
    }

    // 3. Vérifier si ça a marché
    const { data: verifyRead, error: verifyError } = await supabase
      .from('admin_payments')
      .select('id, admin_user_id')
      .eq('id', testRead?.id || 'none')
      .single();

    return Response.json({
      timestamp: new Date().toISOString(),
      permissions_test: {
        read_access: !readError,
        read_error: readError?.message,
        read_result: testRead ? {
          id: testRead.id,
          current_user_id: testRead.admin_user_id,
          plan: testRead.plan,
          quota: testRead.photo_quota
        } : null
      },
      update_test: {
        update_attempted: !!testRead,
        update_success: !updateError,
        update_error: updateError?.message,
        update_result: updateTest
      },
      verification: {
        verify_success: !verifyError,
        verify_error: verifyError?.message,
        final_user_id: verifyRead?.admin_user_id,
        transfer_worked: verifyRead?.admin_user_id === targetUserId
      },
      target_user_id: targetUserId,
      source_user_id: sourceUserId,
      database_config: {
        url_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        service_role_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        url_preview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
      }
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur diagnostic', 
      details: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    }, { status: 500 });
  }
}