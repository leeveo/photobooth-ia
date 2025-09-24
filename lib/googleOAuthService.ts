// Configuration Google OAuth directe (sans Supabase Auth)
// Remplace l'utilisation de supabase.auth.signInWithOAuth

export class GoogleOAuthService {
  private static GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  private static OAUTH_REDIRECT_BASE = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE;

  static getRedirectUri(): string {
    // Utiliser la variable d'environnement pour plus de fiabilité
    const base = this.OAUTH_REDIRECT_BASE || window.location.origin;
    return `${base}/photobooth-ia/admin/auth/callback`;
  }

  static startOAuthFlow(): void {
    const redirectUri = this.getRedirectUri();
    console.log("🔗 OAuth redirect URI:", redirectUri);
    
    const params = new URLSearchParams({
      client_id: this.GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    console.log("🚀 Redirection vers Google OAuth:", authUrl);
    window.location.href = authUrl;
  }

  static async exchangeCodeForToken(code: string): Promise<any> {
    const response = await fetch('/api/auth/google-oauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: this.getRedirectUri()
      })
    });

    if (!response.ok) {
      throw new Error('Erreur lors de l\'échange du code');
    }

    return response.json();
  }
}