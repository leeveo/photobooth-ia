import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { backgroundId, projectId } = await request.json();
    
    console.log('🚀 Delete background API called with:', { backgroundId, projectId });
    
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

    // Create Supabase client with server-side cookies
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    console.log('🔧 Supabase client created');

    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('🔐 Session check result:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      sessionError: sessionError?.message 
    });
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return NextResponse.json({ 
        error: 'Session error',
        details: sessionError.message
      }, { status: 401 });
    }

    if (!session) {
      console.error('❌ No session found');
      return NextResponse.json({ 
        error: 'User not authenticated' 
      }, { status: 401 });
    }

    console.log('✅ User authenticated:', session.user.id);

    // First, verify the background exists and belongs to the project
    const { data: background, error: fetchError } = await supabase
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
      console.error('❌ Background not found or no permission');
      return NextResponse.json({ 
        error: 'Background not found or you do not have permission to delete it' 
      }, { status: 404 });
    }

    console.log('✅ Background found and verified:', background);

    // Delete the background
    const { data: deletedData, error: deleteError } = await supabase
      .from('backgrounds')
      .delete()
      .eq('id', backgroundId)
      .eq('project_id', projectId)
      .select();

    console.log('🗑️ Delete operation result:', { deletedData, deleteError: deleteError?.message });

    if (deleteError) {
      console.error('❌ Error deleting background:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete background',
        details: deleteError.message
      }, { status: 500 });
    }

    if (!deletedData || deletedData.length === 0) {
      console.error('❌ No records deleted');
      return NextResponse.json({ 
        error: 'No records were deleted' 
      }, { status: 500 });
    }

    console.log('✅ Background deleted successfully:', deletedData);

    return NextResponse.json({ 
      success: true,
      message: `Background "${background.name}" deleted successfully`,
      deletedBackground: deletedData[0]
    });

  } catch (error) {
    console.error('💥 Unexpected error in delete background API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
