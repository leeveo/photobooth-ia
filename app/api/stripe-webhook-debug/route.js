export async function POST(request) {
  console.log('[DEBUG WEBHOOK] Stripe webhook endpoint called');
  
  try {
    // Simplement retourner OK sans traitement
    console.log('[DEBUG WEBHOOK] Returning OK');
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[DEBUG WEBHOOK] Error:', error);
    return new Response('Error', { status: 500 });
  }
}

export async function GET(request) {
  return new Response('Webhook debug endpoint is working', { status: 200 });
}