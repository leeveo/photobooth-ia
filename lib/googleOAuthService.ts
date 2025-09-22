// Configuration Google OAuth directe (sans Supabase Auth)
// Remplace l'utilisation de supabase.auth.signInWithOAuth

export class GoogleOAuthService {
  private static GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  private static REDIRECT_URI_LOCAL = 'http://localhost:3000/photobooth-ia/admin/auth/callback'; // HTTP temporaire
  private static REDIRECT_URI_PROD = 'https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback';

  static getRedirectUri(): string {
    return window.location.hostname === 'localhost' 
      ? this.REDIRECT_URI_LOCAL 
      : this.REDIRECT_URI_PROD;
  }

  static startOAuthFlow(): void {
    const params = new URLSearchParams({
      client_id: this.GOOGLE_CLIENT_ID || '',
      redirect_uri: this.getRedirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
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