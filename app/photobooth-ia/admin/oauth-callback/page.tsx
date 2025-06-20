'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState('Connexion en cours...');

  useEffect(() => {
    // Récupérer les paramètres d'URL si présents (pour l'OAuth)
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    
    if (error) {
      console.error(`Erreur d'authentification: ${error} - ${errorDescription}`);
      setStatusMessage(`Erreur: ${errorDescription || error}`);
      setTimeout(() => router.push('/photobooth-ia/admin/login'), 2000);
      return;
    }
    
    // Fonction pour vérifier si une session existe
    const checkSession = () => {
      try {
        // Vérifier les différentes sources possibles de session
        const localStorageSession = localStorage.getItem('admin_session');
        const sessionStorageSession = sessionStorage.getItem('admin_session');
        const cookies = document.cookie.split(';').map(c => c.trim());
        const cookieSession = cookies.find(c => c.startsWith('admin_session='));
        
        console.log('Sessions trouvées:', {
          localStorage: !!localStorageSession,
          sessionStorage: !!sessionStorageSession,
          cookie: !!cookieSession
        });
        
        if (localStorageSession || sessionStorageSession || cookieSession) {
          // Assurer la synchronisation entre les différents stockages
          if (localStorageSession) {
            sessionStorage.setItem('admin_session', localStorageSession);
            document.cookie = `admin_session=${encodedSession}; path=/; max-age=86400; SameSite=Lax; domain=.waibooth.app`;
          } else if (sessionStorageSession) {
            localStorage.setItem('admin_session', sessionStorageSession);
            document.cookie = `admin_session=${sessionStorageSession}; path=/; max-age=86400; SameSite=Lax; domain=.waibooth.app`;
          } else if (cookieSession) {
            const sessionValue = cookieSession.split('=')[1];
            localStorage.setItem('admin_session', sessionValue);
            sessionStorage.setItem('admin_session', sessionValue);
          }
          
          setStatusMessage('Session trouvée! Redirection...');
          
          // Check if there's a returnUrl parameter
          const urlParams = new URLSearchParams(window.location.search);
          const returnUrl = urlParams.get('returnUrl');
          if (returnUrl) {
            window.location.href = returnUrl;
          } else {
            window.location.href = '/photobooth-ia/admin/dashboard';
          }
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('Erreur lors de la vérification de session:', error);
        return false;
      }
    };
    
    // Vérifier immédiatement
    if (!checkSession()) {
      // Si pas de session, rediriger vers login après 2 secondes
      setStatusMessage('Aucune session trouvée, redirection vers la page de connexion...');
      setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get('returnUrl');
        // Redirect to login page with returnUrl if it exists
        if (returnUrl) {
          window.location.href = `/photobooth-ia/admin/login?returnUrl=${encodeURIComponent(returnUrl)}`;
        } else {
          window.location.href = '/photobooth-ia/admin/login';
        }
      }, 2000);
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white bg-gradient-to-br from-indigo-900 to-purple-900">
      <div className="animate-pulse mb-6">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      </div>
      <p className="text-lg">{statusMessage}</p>
    </div>
  );
}
