/**
 * Utilitaires pour la gestion des sessions dans l'application
 */

/**
 * Décode un token base64 en JSON
 * @param {string} token - Le token potentiellement encodé en base64
 * @returns {Object|null} - L'objet JSON décodé ou null en cas d'erreur
 */
export const decodeBase64Json = (token) => {
  try {
    // Vérifier si c'est un token base64 (commence généralement par "eyJ")
    if (token && typeof token === 'string' && token.startsWith('eyJ')) {
      // Décoder le base64 en texte
      const decodedString = typeof window !== 'undefined' ? window.atob(token) : Buffer.from(token, 'base64').toString();
      // Parser le JSON décodé
      return JSON.parse(decodedString);
    } else {
      // Si ce n'est pas un token base64, essayer de parser directement
      return JSON.parse(token);
    }
  } catch (error) {
    console.error('Erreur lors du décodage du token:', error);
    return null;
  }
};

/**
 * Récupère la session admin depuis le stockage local
 * @returns {Object|null} - Les données de session ou null
 */
export const getAdminSession = () => {
  try {
    if (typeof window === 'undefined') return null;
    
    // Essayer localStorage d'abord
    let sessionData = localStorage.getItem('admin_session');
    
    // Si pas dans localStorage, essayer sessionStorage
    if (!sessionData) {
      sessionData = sessionStorage.getItem('admin_session');
    }
    
    // Si pas dans sessionStorage, essayer les cookies
    if (!sessionData && document.cookie) {
      const cookies = document.cookie.split(';').map(c => c.trim());
      const sessionCookie = cookies.find(c => c.startsWith('admin_session='));
      if (sessionCookie) {
        sessionData = sessionCookie.split('=')[1];
      }
    }
    
    if (!sessionData) return null;
    
    // Décoder et retourner
    return decodeBase64Json(sessionData);
  } catch (error) {
    console.error('Erreur lors de la récupération de la session admin:', error);
    return null;
  }
};

/**
 * Stocke la session admin dans tous les emplacements de stockage
 * @param {Object} sessionData - Les données de session à stocker
 */
export const setAdminSession = (sessionData) => {
  try {
    if (typeof window === 'undefined') return;
    
    // Convertir en JSON puis encoder en base64
    const jsonString = JSON.stringify(sessionData);
    const encodedSession = btoa(jsonString);
    
    // Stocker dans localStorage, sessionStorage et cookie
    localStorage.setItem('admin_session', encodedSession);
    sessionStorage.setItem('admin_session', encodedSession);
   document.cookie = `admin_session=${encodedSession}; path=/; max-age=86400; SameSite=Lax; domain=.waibooth.app`;
    return true;
  } catch (error) {
    console.error('Erreur lors du stockage de la session admin:', error);
    return false;
  }
};

/**
 * Efface la session admin de tous les emplacements de stockage
 */
export const clearAdminSession = () => {
  try {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('admin_session');
    sessionStorage.removeItem('admin_session');
    document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de la session admin:', error);
    return false;
  }
};
