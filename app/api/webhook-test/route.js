export const dynamic = "force-dynamic";

export async function POST(request) {
  const timestamp = new Date().toISOString();
  console.log(`[WEBHOOK-TEST] ${timestamp} - Webhook appelé !`);
  
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    
    console.log('[WEBHOOK-TEST] Headers reçus:', headers);
    console.log('[WEBHOOK-TEST] Body length:', body.length);
    
    // Essayer de parser le body
    let event = null;
    try {
      event = JSON.parse(body);
      console.log('[WEBHOOK-TEST] Event type:', event.type);
      console.log('[WEBHOOK-TEST] Event ID:', event.id);
    } catch (parseError) {
      console.log('[WEBHOOK-TEST] Body parse error:', parseError.message);
    }
    
    // Retourner une réponse avec logs
    return new Response(JSON.stringify({
      received: true,
      timestamp,
      event_type: event?.type || 'unknown',
      event_id: event?.id || 'unknown',
      body_length: body.length,
      headers_received: Object.keys(headers).length
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[WEBHOOK-TEST] Error:', error.message);
    return new Response(JSON.stringify({
      error: error.message,
      timestamp
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}