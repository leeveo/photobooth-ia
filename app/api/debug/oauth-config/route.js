export async function GET(request) {
  const url = new URL(request.url);
  const hostname = url.hostname;
  
  // Même logique que GoogleOAuthService
  const redirectUri = hostname === 'localhost' 
    ? 'http://localhost:3000/photobooth-ia/admin/auth/callback'
    : 'https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback';
    
  return Response.json({
    hostname,
    redirectUri,
    fullUrl: url.toString(),
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'Défini' : 'Non défini'
  });
}