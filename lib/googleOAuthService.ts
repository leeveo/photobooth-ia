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
    console.log("🌍 Environment:", process.env.NODE_ENV);
    console.log("🏠 Current origin:", typeof window !== 'undefined' ? window.location.origin : 'server-side');
    
    try {
      const payload = {
        code,
        state,
        redirect_uri: this.getRedirectUri()
      };
      
      console.log("📤 Payload envoyé:", payload);
      
      // Construire l'URL complète pour éviter les problèmes de relative path
      const apiUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/api/auth/google`
        : '/api/auth/google';
      
      console.log("📡 API URL utilisée:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Erreur raw response:", errorText);
        
        // Tenter de parser le JSON d'erreur
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: 'Erreur non-JSON', raw: errorText };
        }
        
        console.error("❌ Erreur échange token:", errorData);
        throw new Error(errorData.error || 'Erreur lors de l\'échange du code');
      }

      const data = await response.json();
      console.log("✅ Token échangé avec succès");
      
      return data;
      
    } catch (error: any) {
      console.error("💥 Erreur lors de l'échange du code:", error);
      console.error("💥 Error type:", typeof error);
      console.error("💥 Error name:", error.name);
      console.error("💥 Error message:", error.message);
      
      // Si c'est une erreur de réseau, essayons de donner plus d'informations
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.error("🌐 Erreur réseau détectée - vérifiez:");
        console.error("  1. La route API /api/auth/google est-elle accessible?");
        console.error("  2. Y a-t-il des problèmes de CORS?");
        console.error("  3. Les variables d'environnement sont-elles configurées?");
        console.error("  4. La fonction serverless démarre-t-elle correctement?");
        
        // Améliorer le message d'erreur
        throw new Error(`Erreur de connexion au serveur d'authentification. Détails: ${error.message}`);
      }
      
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