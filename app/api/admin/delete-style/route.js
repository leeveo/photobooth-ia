import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { styleId } = await request.json();
    
    if (!styleId) {
      return Response.json({
        success: false,
        error: 'Style ID is required'
      }, { status: 400 });
    }

    // Use the service role client to bypass RLS
    const supabase = createRouteHandlerClient({ cookies }, {
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    });
    
    // Get style details first to handle storage paths
    const { data: styleData, error: fetchError } = await supabase
      .from('styles')
      .select('*')
      .eq('id', styleId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching style details:', fetchError);
      return Response.json({
        success: false,
        error: 'Style not found or already deleted'
      }, { status: 404 });
    }
    
    // Delete the style from database
    const { error: deleteError } = await supabase
      .from('styles')
      .delete()
      .eq('id', styleId);
      
    if (deleteError) {
      console.error('Database deletion error:', deleteError);
      return Response.json({
        success: false,
        error: `Database deletion error: ${deleteError.message}`
      }, { status: 500 });
    }
    
    // Try to delete the image from storage if applicable
    let storageResult = { success: true };
    if (styleData.storage_path) {
      try {
        const { error: storageError } = await supabase.storage
          .from('styles')
          .remove([styleData.storage_path]);
          
        if (storageError) {
          console.error('Storage deletion error:', storageError);
          storageResult = {
            success: false,
            error: storageError.message
          };
        }
      } catch (storageError) {
        console.error('Storage deletion exception:', storageError);
        storageResult = {
          success: false,
          error: storageError.message
        };
      }
    }
    
    return Response.json({
      success: true,
      message: 'Style deleted successfully',
      storageResult
    });
    
  } catch (error) {
    console.error('Error in delete style API:', error);
    return Response.json({
      success: false,
      error: error.message || 'An unknown error occurred'
    }, { status: 500 });
  }
}
