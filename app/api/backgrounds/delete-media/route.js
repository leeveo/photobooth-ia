import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  console.log('🚀 [API] Delete media endpoint called');
  
  try {
    // Log request details
    console.log('🚀 [API] Request method:', request.method);
    console.log('🚀 [API] Request URL:', request.url);
    console.log('🚀 [API] Request headers:', Object.fromEntries(request.headers.entries()));
    
    const { backgroundId, mediaType } = await request.json();
    
    console.log('🚀 [API] Delete media API called with:', { backgroundId, mediaType });
    
    if (!backgroundId) {
      console.error('❌ Missing backgroundId');
      return NextResponse.json({ 
        error: 'Background ID is required' 
      }, { status: 400 });
    }

    if (!mediaType) {
      console.error('❌ Missing mediaType');
      return NextResponse.json({ 
        error: 'Media type is required' 
      }, { status: 400 });
    }

    // Validate mediaType
    const validMediaTypes = ['image_url', 'image_url_vertical', 'video_url', 'video_url_vertical'];
    if (!validMediaTypes.includes(mediaType)) {
      console.error('❌ Invalid mediaType:', mediaType);
      return NextResponse.json({ 
        error: 'Invalid media type' 
      }, { status: 400 });
    }

    // Create Supabase client with server-side cookies
    const cookieStore = cookies();
    console.log('🍪 [API] Available cookies:', cookieStore.getAll().map(c => c.name));
    
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    console.log('🔧 [API] Supabase client created');

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

    // First, verify the background exists
    const { data: background, error: fetchError } = await supabase
      .from('backgrounds')
      .select('id, name, project_id')
      .eq('id', backgroundId)
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
        error: 'Background not found' 
      }, { status: 404 });
    }

    console.log('✅ Background found and verified:', background);

    // Update the background to set the media field to null
    const updateData = { [mediaType]: null };
    console.log('🎬 Update data:', updateData);

    const { data: updatedData, error: updateError } = await supabase
      .from('backgrounds')
      .update(updateData)
      .eq('id', backgroundId)
      .select();

    console.log('🎬 Update operation result:', { updatedData, updateError: updateError?.message });

    if (updateError) {
      console.error('❌ Error updating background:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update background',
        details: updateError.message
      }, { status: 500 });
    }

    if (!updatedData || updatedData.length === 0) {
      console.error('❌ No records updated');
      return NextResponse.json({ 
        error: 'No records were updated' 
      }, { status: 500 });
    }

    console.log('✅ Background media updated successfully:', updatedData);

    const mediaNames = {
      'image_url': 'image horizontale',
      'image_url_vertical': 'image verticale',
      'video_url': 'vidéo horizontale',
      'video_url_vertical': 'vidéo verticale'
    };

    return NextResponse.json({ 
      success: true,
      message: `${mediaNames[mediaType]} supprimée avec succès`,
      updatedBackground: updatedData[0]
    });

  } catch (error) {
    console.error('💥 Unexpected error in delete media API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
