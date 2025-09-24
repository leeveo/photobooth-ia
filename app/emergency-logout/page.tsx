'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Forcer le rendu dynamique
export const dynamic = 'force-dynamic';

export default function EmergencyLogoutPage() {
  useEffect(() => {
    console.log('🚨 Mode urgence - Reset immédiat');
    
    // Reset immédiat sans délai
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      document.cookie.split(";").forEach(cookie => {
        const name = cookie.split("=")[0].trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.waibooth.app;`;
      });
      
      console.log('✅ Reset urgence terminé');
    } catch (e) {
      console.error('❌ Erreur reset urgence:', e);
    }
  }, []);

  const forceLogout = () => {
    // Triple nettoyage
    localStorage.clear();
    sessionStorage.clear();
    
    // Supprimer TOUS les cookies possibles
    const cookiesToDelete = [
      'admin_session',
      'admin_token', 
      'admin_email',
      'user_session',
      'session_token',
      'auth_token',
      'supabase-auth-token',
      'sb-gyohqmahwntkmebayeej-auth-token'
    ];
    
    cookiesToDelete.forEach(cookieName => {
      document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
      document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.waibooth.app;`;
      document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=photobooth.waibooth.app;`;
    });
    
    // Redirection forcée
    window.location.replace('/photobooth-ia/admin/login?emergency=1&t=' + Date.now());
  };

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-red-800 mb-2">
            🚨 Reset d'Urgence
          </h1>
          
          <p className="text-gray-600 mb-6">
            Cette page force la déconnexion en supprimant toutes les données de session
          </p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={forceLogout}
            className="w-full bg-red-600 text-white py-4 px-6 rounded-lg hover:bg-red-700 transition-colors font-bold text-lg"
          >
            🔥 FORCER LA DÉCONNEXION
          </button>

          <Link 
            href="/photobooth-ia/admin/login"
            className="block w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors text-center"
          >
            Retour au Login
          </Link>
        </div>

        <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="font-bold text-yellow-800 mb-2">⚠️ Instructions manuelles :</h3>
          <p className="text-sm text-yellow-700 mb-3">
            Si les boutons ne marchent pas, ouvrez la console (F12) et collez :
          </p>
          <code className="block bg-black text-green-400 p-3 rounded text-xs overflow-x-auto">
            localStorage.clear(); sessionStorage.clear(); 
            document.cookie.split(";").forEach(c =&gt; &#123;
              const n = c.split("=")[0].trim();
              document.cookie = n + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
            &#125;);
            window.location.href = "/photobooth-ia/admin/login";
          </code>
        </div>
      </div>
    </div>
  );
}