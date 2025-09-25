/**
 * Service Google OAuth - Version simplifiée et robuste
 * Remplace l'ancienne implémentation complexe par une version simple
 */

export class GoogleOAuthService {
  private static getBaseUrl(): string {
    // En développement
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    
    // Utiliser la variable d'environnement si disponible
    if (process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE) {
      return process.env.NEXT_PUBLIC_OAUTH_REDIRECT_BASE;
    }
    
    // Fallback
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }

  static getRedirectUri(): string {
    const base = this.getBaseUrl();
    return `${base}/photobooth-ia/admin/auth/callback`;
  }

  /**
   * Démarre le flow OAuth en redirigeant vers l'API d'autorisation
   */
  static startOAuthFlow(): void {
    console.log("🚀 Démarrage du flow OAuth Google");
    
    // Redirection vers notre API d'autorisation
    const authUrl = '/api/auth/google/authorize';
    console.log("� Redirection vers:", authUrl);
    
    if (typeof window !== 'undefined') {
      window.location.href = authUrl;
    }
  }

  /**
   * Échange un code d'autorisation pour un token et les données utilisateur
   */
  static async exchangeCodeForToken(code: string, state?: string): Promise<any> {
    console.log("🔐 Échange du code pour un token");
    
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          state,
          redirect_uri: this.getRedirectUri()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Erreur échange token:", errorData);
        throw new Error(errorData.error || 'Erreur lors de l\'échange du code');
      }

      const data = await response.json();
      console.log("✅ Token échangé avec succès");
      
      return data;
      
    } catch (error) {
      console.error("💥 Erreur lors de l'échange du code:", error);
      throw error;
    }
  }

  /**
   * Teste la configuration OAuth
   */
  static async testConfiguration(): Promise<any> {
    try {
      const response = await fetch('/api/auth/google');
      return await response.json();
    } catch (error) {
      console.error("❌ Erreur test configuration:", error);
      throw error;
    }
  }
}