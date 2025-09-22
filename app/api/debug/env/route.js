export async function GET() {
  return Response.json({
    hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    // Ne jamais exposer les vraies valeurs en production !
    googleClientIdPreview: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.substring(0, 10) + '...',
  });
}