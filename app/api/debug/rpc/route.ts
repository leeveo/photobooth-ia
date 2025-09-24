import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '../../../../lib/supabaseClient';

export async function GET() {
  try {
    const supabase = createSupabaseClient();
    
    // Tester la fonction RPC
    const { data: testData, error: testError } = await supabase.rpc('handle_custom_google_oauth', {
      google_user_id: 'test_user_123',
      google_email: 'test@example.com', 
      google_name: 'Test User',
      access_token: 'test_token'
    });

    return NextResponse.json({
      rpc_function_exists: !testError,
      test_data: testData,
      test_error: testError?.message,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

  } catch (error) {
    console.error('Debug RPC error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}