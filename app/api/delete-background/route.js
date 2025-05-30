import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase with admin privileges to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { backgroundId } = await request.json();
    
    if (!backgroundId) {
      return NextResponse.json({
        success: false,
        message: 'Background ID is required'
      }, { status: 400 });
    }
    
    console.log('Deleting background with ID:', backgroundId);
    
    // Get background data first to potentially delete the file as well
    const { data: background, error: fetchError } = await supabase
      .from('backgrounds')
      .select('*')
      .eq('id', backgroundId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching background:', fetchError);
      return NextResponse.json({
        success: false,
        message: `Error fetching background: ${fetchError.message}`
      }, { status: 500 });
    }
    
    // Delete from database
    const { error: deleteError } = await supabase
      .from('backgrounds')
      .delete()
      .eq('id', backgroundId);
    
    if (deleteError) {
      console.error('Error deleting background from database:', deleteError);
      return NextResponse.json({
        success: false,
        message: `Database error: ${deleteError.message}`
      }, { status: 500 });
    }
    
    // Attempt to delete the file if storage_path exists
    if (background.storage_path) {
      try {
        const { error: storageError } = await supabase.storage
          .from('backgrounds')
          .remove([background.storage_path]);
          
        if (storageError) {
          console.warn('Error removing background file:', storageError);
          // Continue even if file deletion failed
        }
      } catch (storageEx) {
        console.warn('Exception removing background file:', storageEx);
        // Continue even if file deletion failed
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Background deleted successfully'
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({
      success: false,
      message: `Server error: ${error.message}`
    }, { status: 500 });
  }
}
