import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req, { params }) {
  try {
    const { sessionId } = params;
    console.log(`[DEBUG_SESSION] Checking session: ${sessionId}`);
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }
    
    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    console.log(`[DEBUG_SESSION] Session data:`, { session, sessionError });
    
    if (sessionError) {
      return NextResponse.json({ 
        error: 'Session not found', 
        details: sessionError 
      }, { status: 404 });
    }
    
    // Check if there's any quota usage for this session
    const { data: quotaUsage, error: quotaError } = await supabase
      .from('quota_usage')
      .select('*')
      .eq('session_id', sessionId);
    
    console.log(`[DEBUG_SESSION] Quota usage:`, { quotaUsage, quotaError });
    
    return NextResponse.json({
      session: session,
      quotaUsage: quotaUsage || [],
      quotaError: quotaError
    });
    
  } catch (error) {
    console.error('[DEBUG_SESSION] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}