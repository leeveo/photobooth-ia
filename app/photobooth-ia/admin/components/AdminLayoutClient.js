'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayoutClient({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Pages à exclure de la vérification de session
  const publicPages = [
    '/photobooth-ia/admin/login',
    '/photobooth-ia/admin/logout',
    '/photobooth-ia/admin/register'
  ];
  
  const isPublicPage = publicPages.includes(pathname);
  
  useEffect(() => {
    // Skip session check for public pages
    if (isPublicPage) {
      setLoading(false);
      return;
    }
    
    const checkSession = () => {
      try {
        // Essayer de récupérer la session depuis sessionStorage
        let sessionData = sessionStorage.getItem('admin_session');
        
        // Si pas trouvé, essayer localStorage
        if (!sessionData) {
          sessionData = localStorage.getItem('admin_session');
        }
        
        // Vérifier si les cookies contiennent la session
        const hasCookie = document.cookie.split(';').some(c => 
          c.trim().startsWith('admin_session=')
        );
        
        if (sessionData) {
          const parsedSession = JSON.parse(sessionData);
          
          if (parsedSession && parsedSession.logged_in) {
            setSession(parsedSession);
            setLoading(false);
            
            // Si le cookie n'existe pas, le créer
            if (!hasCookie) {
              document.cookie = `admin_session=${parsedSession.user_id}; path=/; max-age=86400;`;
            }
            
            return;
          }
        }
        
        // Si aucune session valide trouvée, rediriger vers la page de connexion
        console.log("Aucune session valide trouvée, redirection vers login");
        router.push('/photobooth-ia/admin/login');
      } catch (err) {
        console.error("Erreur lors de la vérification de session:", err);
        router.push('/photobooth-ia/admin/login');
      }
    };
    
    checkSession();
  }, [router, isPublicPage, pathname]);
  
  // Render content for public pages without sidebar
  if (isPublicPage) {
    return <>{children}</>;
  }
  
  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-16 h-16 border-t-4 border-b-4 border-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // For authenticated pages, render with sidebar
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gradient-to-b from-indigo-800 to-purple-900 fixed h-full shadow-lg">
          <div className="px-6 pt-8 pb-6">
            <Link href="/photobooth-ia/admin/dashboard" className="text-white flex items-center space-x-2">
              <span className="text-xl font-bold">PhotoBooth IA</span>
            </Link>
          </div>
          
          <nav className="mt-2 px-4">
            <Link href="/photobooth-ia/admin/dashboard" 
              className={`flex items-center py-3 px-4 text-white ${
                pathname === '/photobooth-ia/admin/dashboard' ? 'bg-indigo-700 rounded-lg' : 'hover:bg-indigo-700/50 rounded-lg'
              }`}
            >
              Dashboard
            </Link>
            
            <Link href="/photobooth-ia/admin/projects" 
              className={`flex items-center py-3 px-4 text-white ${
                pathname.includes('/photobooth-ia/admin/projects') ? 'bg-indigo-700 rounded-lg' : 'hover:bg-indigo-700/50 rounded-lg'
              }`}
            >
              Projets
            </Link>
            
            <Link href="/photobooth-ia/admin/stats" 
              className={`flex items-center py-3 px-4 text-white ${
                pathname === '/photobooth-ia/admin/stats' ? 'bg-indigo-700 rounded-lg' : 'hover:bg-indigo-700/50 rounded-lg'
              }`}
            >
              Statistiques
            </Link>
            
            <Link href="/photobooth-ia/admin/logout" 
              className="flex items-center py-3 px-4 text-white hover:bg-indigo-700/50 rounded-lg mt-12"
            >
              Déconnexion
            </Link>
          </nav>
        </div>
        
        {/* Main content */}
        <main className="flex-1 ml-64 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
