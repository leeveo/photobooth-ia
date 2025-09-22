'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '/lib/supabaseClient';

export default function LogoutPage() {
  const router = useRouter();
  const [loggedOut, setLoggedOut] = useState(false);
  const [status, setStatus] = useState('Déconnexion en cours...');
  const supabase = createSupabaseClient();

  useEffect(() => {
    const performLogout = async () => {
      try {
        setStatus('Déconnexion de la session...');
        
        // Récupérer les informations de session pour déterminer le type de connexion
        const adminSession = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
        let sessionData = null;
        
        if (adminSession) {
          try {
            sessionData = JSON.parse(atob(adminSession));
          } catch (e) {
            console.error("Erreur de décodage de la session:", e);
          }
        }

        // Si c'est une session Google OAuth, déconnecter aussi de Supabase Auth
        if (sessionData?.login_method === 'google') {
          setStatus('Déconnexion de Google...');
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error("Erreur lors de la déconnexion Google:", error);
          }
        }

        setStatus('Nettoyage des données de session...');
        
        // Supprimer les données de session
        localStorage.removeItem('admin_session');
        sessionStorage.removeItem('admin_session');
        
        // Supprimer le cookie
        document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        // Nettoyer d'autres données potentielles
        localStorage.removeItem('last_registered_email');
        sessionStorage.removeItem('last_registered_email');
        
        setStatus('Déconnexion terminée. Redirection...');
        setLoggedOut(true);
      } catch (error) {
        console.error("Erreur lors de la déconnexion:", error);
        setStatus('Erreur de déconnexion. Redirection...');
        // Rediriger même en cas d'erreur
        setLoggedOut(true);
      }
    };

    performLogout();
  }, [supabase]);

  // Redirection une fois la déconnexion terminée
  useEffect(() => {
    if (loggedOut) {
      setTimeout(() => {
        router.push('/photobooth-ia/admin/login');
      }, 1500);
    }
  }, [loggedOut, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
      <div className="text-center max-w-md">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-8">
          {/* Spinner de chargement */}
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-6"></div>
          
          <h1 className="text-3xl font-bold mb-4">Déconnexion</h1>
          <p className="text-white/80 mb-4">{status}</p>
          <p className="text-white/60 text-sm">
            Vous allez être redirigé vers la page de connexion.
          </p>
        </div>
      </div>
    </div>
  );
}
