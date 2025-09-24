'use client';

import { useEffect } from 'react';

// Forcer le rendu dynamique
export const dynamic = 'force-dynamic';

export default function ResetPage() {
  useEffect(() => {
    console.log('🔄 Début du reset complet...');
    
    // 1. Effacer localStorage
    try {
      localStorage.clear();
      console.log('✅ localStorage effacé');
    } catch (e) {
      console.error('❌ Erreur localStorage:', e);
    }

    // 2. Effacer sessionStorage
    try {
      sessionStorage.clear();
      console.log('✅ sessionStorage effacé');
    } catch (e) {
      console.error('❌ Erreur sessionStorage:', e);
    }

    // 3. Effacer tous les cookies
    try {
      const cookies = document.cookie.split(";");
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        // Supprimer pour le domaine principal
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
        
        // Supprimer pour le sous-domaine
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.waibooth.app;`;
        
        // Supprimer pour le domaine complet
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=photobooth.waibooth.app;`;
      });
      console.log('✅ Cookies effacés');
    } catch (e) {
      console.error('❌ Erreur cookies:', e);
    }

    // 4. Nettoyer le cache du navigateur (si possible)
    try {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      console.log('✅ Cache navigateur nettoyé');
    } catch (e) {
      console.error('❌ Erreur cache:', e);
    }

    console.log('🎉 Reset complet terminé !');
    
    // Redirection après 3 secondes
    setTimeout(() => {
      console.log('🔄 Redirection vers login...');
      window.location.href = '/photobooth-ia/admin/login?reset=1&timestamp=' + Date.now();
    }, 3000);

  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-orange-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Reset Complet en Cours...
          </h1>
          <p className="text-gray-600 mb-4">
            Nettoyage de toutes les données de session
          </p>
        </div>

        <div className="space-y-3 text-left bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center text-sm">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-3"></span>
            Effacement localStorage
          </div>
          <div className="flex items-center text-sm">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-3"></span>
            Effacement sessionStorage
          </div>
          <div className="flex items-center text-sm">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-3"></span>
            Suppression des cookies
          </div>
          <div className="flex items-center text-sm">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-3"></span>
            Nettoyage du cache
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center text-sm text-gray-500">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Redirection automatique dans 3 secondes...
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button 
            onClick={() => window.location.href = '/photobooth-ia/admin/login?reset=1'}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Aller au Login Maintenant
          </button>
        </div>
      </div>
    </div>
  );
}