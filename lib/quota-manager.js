/**
 * Helper pour gérer le système de quota avancé
 * Utilise l'API quota-manager pour vérifier et consommer le quota de manière séparée
 */

export const QuotaManager = {
  /**
   * Vérifie le quota disponible pour un admin
   */
  async checkQuota(adminId) {
    try {
      // Utiliser l'API quota-manager corrigée
      const response = await fetch('/api/quota-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, action: 'check' })
      });

      if (!response.ok) {
        throw new Error('Erreur vérification quota');
      }

      return await response.json();
    } catch (error) {
      console.error('[QuotaManager] Erreur check:', error);
      throw error;
    }
  },

  /**
   * Consomme 1 quota (mensuel ou addon selon disponibilité)
   */
  async consumeQuota(adminId, sessionId, projectId) {
    try {
      console.log('[QuotaManager] Utilisation API simple pour consume');
      
      // Utiliser l'API quota-simple temporairement
      const response = await fetch('/api/quota-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminId, 
          sessionId, 
          projectId, 
          action: 'consume' 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur consommation quota');
      }

      return await response.json();
    } catch (error) {
      console.error('[QuotaManager] Erreur consume:', error);
      throw error;
    }
  },

  /**
   * Récupère l'admin ID depuis localStorage/sessionStorage
   */
  getAdminId() {
    try {
      // Essayer plusieurs méthodes pour récupérer l'admin ID
      let adminUserId = localStorage.getItem('currentAdminId') 
        || localStorage.getItem('adminUserId')
        || localStorage.getItem('admin_user_id')
        || localStorage.getItem('userId')
        || localStorage.getItem('user_id');

      // Essayer de décoder admin_session
      if (!adminUserId) {
        const adminSession = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
        if (adminSession) {
          try {
            const decodedSession = JSON.parse(atob(adminSession));
            adminUserId = decodedSession.userId || decodedSession.user_id || decodedSession.id;
          } catch (e) {
            console.warn('[QuotaManager] Erreur décodage admin_session:', e);
          }
        }
      }

      return adminUserId;
    } catch (error) {
      console.error('[QuotaManager] Erreur getAdminId:', error);
      return null;
    }
  },

  /**
   * Vérifie et affiche les alertes de quota avant une action
   * Retourne true si l'action peut continuer, false sinon
   */
  async checkAndAlertQuota(projectId = null) {
    const adminId = this.getAdminId();
    
    if (!adminId) {
      alert("Impossible de récupérer l'ID administrateur. Veuillez vous reconnecter.");
      return false;
    }

    try {
      const quotaStatus = await this.checkQuota(adminId);
      
      if (!quotaStatus.canTakePhoto) {
        if (quotaStatus.monthly.isFreePlan) {
          // Utilisateur gratuit : quota épuisé
          alert("🎉 Vos 3 photos gratuites sont épuisées ! Choisissez un plan pour continuer.");
          window.location.href = '/photobooth-ia/admin/choose-plan';
          return false;
        } else {
          // Utilisateur payant : quota épuisé
          alert("Quota épuisé. Veuillez acheter des packs addon ou renouveler votre abonnement.");
          window.location.href = '/photobooth-ia/admin/choose-plan';
          return false;
        }
      }

      // Afficher un avertissement si moins de 2 photos restantes
      if (quotaStatus.total.remaining <= 2 && quotaStatus.total.remaining > 0) {
        const message = quotaStatus.monthly.isFreePlan 
          ? `⚠️ Plus que ${quotaStatus.total.remaining} photo(s) gratuite(s) restante(s) !`
          : `⚠️ Plus que ${quotaStatus.total.remaining} photo(s) restante(s) dans votre quota.`;
        
        console.warn('[QuotaManager]', message);
      }

      return true;
    } catch (error) {
      console.error('[QuotaManager] Erreur vérification quota:', error);
      alert("Erreur lors de la vérification du quota. Veuillez réessayer.");
      return false;
    }
  },

  /**
   * Consomme le quota APRÈS une session réussie
   * À appeler après l'insertion en base de données de la session
   */
  async consumeAfterSuccess(sessionId, projectId = null) {
    const adminId = this.getAdminId();
    
    if (!adminId) {
      console.error('[QuotaManager] Admin ID non trouvé pour consommation');
      return false;
    }

    try {
      const result = await this.consumeQuota(adminId, sessionId, projectId);
      console.log('[QuotaManager] Quota consommé avec succès:', result);
      return result;
    } catch (error) {
      console.error('[QuotaManager] Erreur consommation quota:', error);
      // Ne pas faire échouer la génération d'image pour une erreur de quota
      // Logging pour investigation manuelle
      return false;
    }
  }
};

export default QuotaManager;