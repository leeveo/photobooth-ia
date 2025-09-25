/**
 * Utilitaires de diagnostic pour OAuth en production
 */

export class ProductionDiagnostic {
  
  /**
   * Test complet du système OAuth
   */
  static async runDiagnostics(): Promise<any> {
    console.log("🔬 Démarrage des diagnostics de production");
    
    const results: {
      timestamp: string;
      environment: any;
      apiHealthCheck: any;
      googleOAuthConfig: any;
      networkConnectivity: any;
      errors: Array<{type: string; message: string; stack?: string}>;
    } = {
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentInfo(),
      apiHealthCheck: null,
      googleOAuthConfig: null,
      networkConnectivity: null,
      errors: [],
    };
    
    try {
      // 1. Test de santé de l'API
      console.log("📡 Test de santé de l'API...");
      results.apiHealthCheck = await this.testApiHealth();
      
      // 2. Test de la configuration OAuth
      console.log("🔐 Test de configuration OAuth...");
      results.googleOAuthConfig = await this.testGoogleOAuthConfig();
      
      // 3. Test de connectivité réseau
      console.log("🌐 Test de connectivité réseau...");
      results.networkConnectivity = await this.testNetworkConnectivity();
      
    } catch (error: any) {
      console.error("❌ Erreur durant les diagnostics:", error);
      results.errors.push({
        type: 'diagnostic_error',
        message: error.message,
        stack: error.stack,
      });
    }
    
    console.log("📋 Résultats des diagnostics:", results);
    return results;
  }
  
  /**
   * Informations sur l'environnement
   */
  static getEnvironmentInfo(): any {
    return {
      isClient: typeof window !== 'undefined',
      userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : 'server-side',
      origin: typeof window !== 'undefined' ? window.location?.origin : 'server-side',
      protocol: typeof window !== 'undefined' ? window.location?.protocol : 'server-side',
      host: typeof window !== 'undefined' ? window.location?.host : 'server-side',
    };
  }
  
  /**
   * Test de santé de l'API
   */
  static async testApiHealth(): Promise<any> {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        type: error.name,
      };
    }
  }
  
  /**
   * Test de configuration OAuth
   */
  static async testGoogleOAuthConfig(): Promise<any> {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return await response.json();
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        type: error.name,
      };
    }
  }
  
  /**
   * Test de connectivité réseau basique
   */
  static async testNetworkConnectivity(): Promise<any> {
    const tests = [];
    
    // Test POST simple
    try {
      const postResponse = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'connectivity' })
      });
      
      tests.push({
        name: 'POST_health',
        success: postResponse.ok,
        status: postResponse.status,
        data: postResponse.ok ? await postResponse.json() : await postResponse.text()
      });
      
    } catch (error: any) {
      tests.push({
        name: 'POST_health',
        success: false,
        error: error.message,
        type: error.name,
      });
    }
    
    return { tests };
  }
  
  /**
   * Test spécifique de l'échange OAuth
   */
  static async testOAuthExchange(code: string, state?: string): Promise<any> {
    console.log("🧪 Test d'échange OAuth avec diagnostics complets");
    
    try {
      // Préparation de la requête
      const payload = {
        code: code,
        state: state,
        redirect_uri: typeof window !== 'undefined' 
          ? `${window.location.origin}/photobooth-ia/admin/auth/callback`
          : 'http://localhost:3000/photobooth-ia/admin/auth/callback'
      };
      
      console.log("🔬 Payload de test:", payload);
      
      // Tentative d'échange
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log("🔬 Réponse reçue:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔬 Erreur détaillée:", errorText);
        
        return {
          success: false,
          status: response.status,
          error: errorText,
          diagnostics: await this.runDiagnostics()
        };
      }
      
      const data = await response.json();
      console.log("🔬 Données OAuth reçues:", data);
      
      return {
        success: true,
        data: data
      };
      
    } catch (error: any) {
      console.error("🔬 Erreur lors du test OAuth:", error);
      
      return {
        success: false,
        error: error.message,
        type: error.name,
        diagnostics: await this.runDiagnostics()
      };
    }
  }
}