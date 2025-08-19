import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role (bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // This bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request) {
  try {
    const { backgroundId, projectId, adminSessionData } = await request.json();
    
    console.log('🚀 Admin delete background API called:', { backgroundId, projectId, adminId: adminSessionData?.user_id });
    
    if (!backgroundId) {
      console.error('❌ Missing backgroundId');
      return NextResponse.json({ 
        error: 'Background ID is required' 
      }, { status: 400 });
    }

    if (!projectId) {
      console.error('❌ Missing projectId');
      return NextResponse.json({ 
        error: 'Project ID is required' 
      }, { status: 400 });
    }

    if (!adminSessionData?.user_id) {
      console.error('❌ Missing admin session data');
      return NextResponse.json({ 
        error: 'Admin authentication required' 
      }, { status: 401 });
    }

    console.log('🔐 Admin user authenticated:', adminSessionData.user_id);

    // Verify the background exists and belongs to the project
    const { data: background, error: fetchError } = await supabaseAdmin
      .from('backgrounds')
      .select('id, name, project_id')
      .eq('id', backgroundId)
      .eq('project_id', projectId)
      .single();

    console.log('🔍 Background lookup result:', { background, fetchError: fetchError?.message });

    if (fetchError) {
      console.error('❌ Error fetching background:', fetchError);
      return NextResponse.json({ 
        error: 'Background not found',
        details: fetchError.message
      }, { status: 404 });
    }

    if (!background) {
      console.error('❌ Background not found');
      return NextResponse.json({ 
        error: 'Background not found or you do not have permission to delete it' 
      }, { status: 404 });
    }

    console.log('✅ Background found and verified:', background);

    // Try different deletion methods
    let deletionResult = null;
    let deletionMethod = '';

    // Method 1: Direct delete with admin privileges
    console.log('🔧 Method 1: Direct deletion with admin privileges...');
    const { data: deletedData, error: deleteError } = await supabaseAdmin
      .from('backgrounds')
      .delete()
      .eq('id', backgroundId)
      .eq('project_id', projectId)
      .select();

    if (!deleteError && deletedData && deletedData.length > 0) {
      console.log('✅ Background deleted via direct method:', deletedData);
      deletionResult = deletedData[0];
      deletionMethod = 'direct deletion';
    } else {
      console.warn('⚠️ Direct method failed:', deleteError?.message);
      
      // Method 2: Soft delete (set is_active = false)
      console.log('🔧 Method 2: Soft delete (set is_active = false)...');
      const { data: softDeleteData, error: softDeleteError } = await supabaseAdmin
        .from('backgrounds')
        .update({ is_active: false })
        .eq('id', backgroundId)
        .eq('project_id', projectId)
        .select();
        
      if (!softDeleteError && softDeleteData && softDeleteData.length > 0) {
        console.log('✅ Background soft-deleted:', softDeleteData);
        deletionResult = softDeleteData[0];
        deletionMethod = 'soft deletion';
      } else {
        console.error('❌ Soft delete also failed:', softDeleteError?.message);
        return NextResponse.json({ 
          error: 'Failed to delete background',
          details: `Direct delete error: ${deleteError?.message}, Soft delete error: ${softDeleteError?.message}`
        }, { status: 500 });
      }
    }

    if (!deletionResult) {
      return NextResponse.json({ 
        error: 'No records were deleted' 
      }, { status: 500 });
    }

    console.log('✅ Background deleted successfully via', deletionMethod, ':', deletionResult);

    return NextResponse.json({ 
      success: true,
      message: `Background "${background.name}" deleted successfully via ${deletionMethod}`,
      deletedBackground: deletionResult,
      method: deletionMethod
    });

  } catch (error) {
    console.error('💥 Unexpected error in admin delete background API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
