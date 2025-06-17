import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';

export function useSharedAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        // Vérifier le token dans les cookies
        const token = Cookies.get('shared_auth_token');
        
        if (!token) {
          // Rediriger vers la connexion de l'app principale
          window.location.href = `${process.env.NEXT_PUBLIC_BASE_URL}/photobooth-ia/admin/login?redirect=${encodeURIComponent(window.location.href)}`;
          return;
        }
        
        // Valider le token avec l'API
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/validate-shared-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        
        if (!response.ok) {
          // Token invalide, rediriger vers la connexion
          Cookies.remove('shared_auth_token');
          window.location.href = `${process.env.NEXT_PUBLIC_BASE_URL}/photobooth-ia/admin/login?redirect=${encodeURIComponent(window.location.href)}`;
          return;
        }
        
        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error('Erreur authentification:', error);
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
  }, [router]);
  
  return { user, loading };
}
