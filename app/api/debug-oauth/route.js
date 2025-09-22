export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const env = process.env.NODE_ENV;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const hostname = 'localhost'; // Pour test local
    
    const config = {
      environment: env,
      base_url: baseUrl,
      google_config: {
        client_id_configured: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret_configured: !!process.env.GOOGLE_CLIENT_SECRET,
        client_id_preview: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.substring(0, 20) + '...'
      },
      redirect_uris: {
        localhost: 'http://localhost:3000/photobooth-ia/admin/auth/callback',
        production: 'https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback',
        current_should_be: hostname === 'localhost' 
          ? 'http://localhost:3000/photobooth-ia/admin/auth/callback'
          : 'https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback'
      },
      google_oauth_url: 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        redirect_uri: 'http://localhost:3000/photobooth-ia/admin/auth/callback',
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent'
      }).toString(),
      troubleshooting: {
        problem: 'Google OAuth redirect to dashboard without login',
        likely_causes: [
          'Missing localhost redirect URI in Google Cloud Console',
          'Wrong redirect_uri parameter in OAuth URL',
          'Google OAuth client configuration mismatch'
        ],
        solution: 'Add http://localhost:3000/photobooth-ia/admin/auth/callback to Google Cloud Console'
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