export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const env = process.env.NODE_ENV;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    const config = {
      environment: env,
      base_url: baseUrl,
      oauth_redirect_base: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE,
      google_config: {
        client_id_configured: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret_configured: !!process.env.GOOGLE_CLIENT_SECRET,
        client_id_preview: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.substring(0, 30) + '...',
        client_id_full: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID // Pour debug uniquement
      },
      expected_redirect_uris: {
        local: 'http://localhost:3000/photobooth-ia/admin/auth/callback',
        production: 'https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback'
      },
      current_redirect_uri: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE 
        ? `${process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE}/photobooth-ia/admin/auth/callback`
        : 'VARIABLE_NOT_SET',
      troubleshooting: {
        problem: 'OAuth works local but not in production',
        likely_cause: 'NEXT_PUBLIC_OAUTH_REDIRECT_BASE variable not set correctly on Vercel',
        solution: 'Set NEXT_PUBLIC_OAUTH_REDIRECT_BASE=https://photobooth.waibooth.app on Vercel'
      }
    };

    return Response.json(config);

  } catch (error) {
    return Response.json({ 
      error: 'Diagnostic failed', 
      details: error.message 
    }, { status: 500 });
  }
}