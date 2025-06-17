'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Supprimer les données de session
        localStorage.removeItem('admin_session');
        sessionStorage.removeItem('admin_session');
        
        // Supprimer le cookie
        document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        setLoggedOut(true);
      } catch (error) {
        console.error("Erreur lors de la déconnexion:", error);
        // Rediriger même en cas d'erreur
        setLoggedOut(true);
      }
    };

    performLogout();
  }, []);

  // Redirection une fois la déconnexion terminée
  useEffect(() => {
    if (loggedOut) {
      router.push('/photobooth-ia/admin/login');
    }
  }, [loggedOut, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Déconnexion en cours...</h1>
        <p>Vous allez être redirigé vers la page de connexion.</p>
      </div>
    </div>
  );
}
