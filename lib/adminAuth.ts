import { createSupabaseClient } from '/lib/supabaseClient';

interface SessionData {
  userId: string;
  user_id?: string;
  email: string;
  company_name?: string;
  logged_in: boolean;
  login_method: string;
  login_time: string;
  google_id?: string;
}

export class AdminAuthManager {
  private supabase;

  constructor() {
    this.supabase = createSupabaseClient();
  }

  async getValidSession(): Promise<SessionData | null> {
    try {
      console.log("🔍 AdminAuthManager: Vérification de la session...");
      
      // 1. Vérifier session locale d'abord
      const localSession = this.getLocalSession();
      if (localSession) {
        console.log("✅ Session locale valide trouvée");
        return localSession;
      }

      // 2. Vérifier session OAuth Supabase
      const oauthSession = await this.checkOAuthSession();
      if (oauthSession) {
        console.log("✅ Session OAuth convertie en session admin");
        return oauthSession;
      }

      console.log("❌ Aucune session valide trouvée");
      return null;
    } catch (error) {
      console.error("❌ Erreur lors de la vérification de session:", error);
      return null;
    }
  }

  private getLocalSession(): SessionData | null {
    try {
      const sessionStr = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
      
      if (!sessionStr) {
        return null;
      }

      let decodedSession = sessionStr;
      try {
        decodedSession = atob(sessionStr);
      } catch (e) {
        // Déjà décodé
      }
      
      const sessionData = JSON.parse(decodedSession) as SessionData;
      
      // Support legacy
      if (!sessionData.user_id && sessionData.userId) {
        sessionData.user_id = sessionData.userId;
      }
      
      if (!sessionData.user_id) {
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error("Erreur décodage session locale:", error);
      return null;
    }
  }

  private async checkOAuthSession(): Promise<SessionData | null> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error || !session?.user) {
        return null;
      }

      console.log("🔑 Session OAuth Supabase trouvée, conversion en session admin...");
      
      // Appeler la fonction RPC pour gérer l'utilisateur OAuth
      const { data: adminData, error: adminError } = await this.supabase.rpc(
        'handle_google_admin_auth',
        { 
          google_id: session.user.id,
          admin_email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || '',
          first_name: session.user.user_metadata?.given_name || '',
          last_name: session.user.user_metadata?.family_name || ''
        }
      );
      
      if (adminError || !adminData?.success) {
        console.error("❌ Erreur conversion OAuth:", adminError);
        return null;
      }
      
      // Créer la session admin
      const sessionData: SessionData = {
        userId: adminData.user_id,
        user_id: adminData.user_id,
        email: adminData.email,
        company_name: adminData.company_name || '',
        logged_in: true,
        login_method: 'google',
        login_time: new Date().toISOString(),
        google_id: session.user.id
      };
      
      // Stocker la session
      this.saveSession(sessionData);
      
      return sessionData;
    } catch (error) {
      console.error("Erreur vérification OAuth:", error);
      return null;
    }
  }

  private saveSession(sessionData: SessionData) {
    const encodedSession = btoa(JSON.stringify(sessionData));
    localStorage.setItem('admin_session', encodedSession);
    sessionStorage.setItem('admin_session', encodedSession);
    
    // Cookie pour la compatibilité
    document.cookie = `admin_session=${encodedSession}; path=/; max-age=86400; SameSite=Lax`;
    
    console.log("💾 Session admin sauvegardée");
  }

  async logout(): Promise<void> {
    try {
      console.log("🚪 Déconnexion en cours...");
      
      // Récupérer les infos de session pour savoir le type
      const session = this.getLocalSession();
      
      // Si c'est une session Google, déconnecter de Supabase aussi
      if (session?.login_method === 'google') {
        console.log("🔓 Déconnexion Google OAuth...");
        await this.supabase.auth.signOut();
      }
      
      // Nettoyer les données locales
      localStorage.removeItem('admin_session');
      sessionStorage.removeItem('admin_session');
      localStorage.removeItem('last_registered_email');
      sessionStorage.removeItem('last_registered_email');
      
      // Nettoyer le cookie
      document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      console.log("✅ Déconnexion terminée");
    } catch (error) {
      console.error("❌ Erreur lors de la déconnexion:", error);
    }
  }
}

// Export d'une instance singleton
export const adminAuth = new AdminAuthManager();