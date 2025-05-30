'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import './admin.css'; // Importer les styles CSS spécifiques à l'admin

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPhotoboothMenuOpen, setIsPhotoboothMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFresqueMenuOpen, setIsFresqueMenuOpen] = useState(false);
  
  // Créer le client Supabase avec les variables d'environnement
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    // Vérifier si les variables d'environnement sont définies
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Les variables d\'environnement Supabase ne sont pas définies');
    }
    
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        if (pathname !== '/photobooth-ia/admin/login') {
          router.push('/photobooth-ia/admin/login');
        }
        setLoading(false);
        return;
      }
      
      setUser(session.user);
      setLoading(false);
      
      // Auto-expand the Photobooth menu if we're on a photobooth page
      if (pathname.includes('/photobooth-ia/admin') && 
          pathname !== '/photobooth-ia/admin/login' &&
          pathname !== '/photobooth-ia/admin') {
        setIsPhotoboothMenuOpen(true);
      }

      // Auto-expand the Fresque menu if on a fresque page
      if (pathname.startsWith('/fresque/')) {
        setIsFresqueMenuOpen(true);
      }
    };

    checkUser();
  }, [router, supabase.auth, pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/photobooth-ia/admin/login');
  };

  // Show loading indicator or login page if user is not authenticated
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  if (!user && pathname !== '/photobooth-ia/admin/login') {
    return null; // Don't show anything, will redirect
  }

  // Don't show navigation on login page
  if (pathname === '/photobooth-ia/admin/login') {
    return <>{children}</>;
  }

  // Define photobooth menu items
  const photoboothMenuItems = [
    { name: 'Projets', href: '/photobooth-ia/admin/projects' },
    { name: 'Galerie', href: '/photobooth-ia/admin/project-gallery' },
    { name: 'Styles', href: '/photobooth-ia/admin/styles' },
    { name: 'Arrière-plans', href: '/photobooth-ia/admin/backgrounds' },
  ];

  // Define fresque menu items
  const fresqueMenuItems = [
    { name: 'Galerie vidéos', href: '/fresque/gallery' },
 
     { name: 'Generation photo fresque', href: '/fresque/photo-wall' },
    { name: 'Photobooth', href: '/fresque/photobooth' },
    { name: 'Record', href: '/fresque/record' },
  ];

  // Main navigation
  const mainNavigation = [
    { name: 'Dashboard', href: '/photobooth-ia/admin' },
    
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - responsive */}
      <div 
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-20 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out`}
      >
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-indigo-600">PixMagic</h1>
          <p className="text-sm text-gray-500">Administration</p>
        </div>
        
        <nav className="mt-6">
          {/* Close button for mobile */}
          <div className="px-6 py-2 lg:hidden">
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <span className="text-sm">Fermer le menu</span>
            </button>
          </div>
          
          {/* Main navigation items */}
          {mainNavigation.map((item) => (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`flex items-center px-6 py-3 ${
                pathname === item.href ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-indigo-50'
              }`}
            >
              <span className="mx-4">{item.name}</span>
            </Link>
          ))}
          
          {/* Fresque dropdown menu */}
          <div className="mt-3">
            <div
              onClick={() => setIsFresqueMenuOpen(!isFresqueMenuOpen)}
              className={`flex items-center justify-between px-6 py-3 cursor-pointer ${
                pathname.startsWith('/fresque/')
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-700 hover:bg-indigo-50'
              }`}
            >
              <div className="flex items-center">
                <span className="mx-4 font-medium">Fresque</span>
              </div>
              <svg
                className={`w-5 h-5 transition-transform transform ${
                  isFresqueMenuOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
            {isFresqueMenuOpen && (
              <div className="pl-4 bg-gray-50">
                {fresqueMenuItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-6 py-2 text-sm ${
                      pathname === item.href
                        ? 'text-indigo-600 font-medium'
                        : 'text-gray-600 hover:text-indigo-600'
                    }`}
                  >
                    <span className="mx-4">{item.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Photobooth IA dropdown menu */}
          <div className="mt-3">
            <div
              onClick={() => setIsPhotoboothMenuOpen(!isPhotoboothMenuOpen)}
              className={`flex items-center justify-between px-6 py-3 cursor-pointer ${
                pathname.includes('/photobooth-ia/admin/') &&
                pathname !== '/photobooth-ia/admin'
                // pathname !== '/photobooth-ia/admin/settings' &&
                // pathname !== '/photobooth-ia/admin/s3-check'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-700 hover:bg-indigo-50'
              }`}
            >
              <div className="flex items-center">
                <span className="mx-4 font-medium">Photobooth IA</span>
              </div>
              <svg
                className={`w-5 h-5 transition-transform transform ${
                  isPhotoboothMenuOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
            
            {/* Dropdown items */}
            {isPhotoboothMenuOpen && (
              <div className="pl-4 bg-gray-50">
                {photoboothMenuItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-6 py-2 text-sm ${
                      pathname === item.href
                        ? 'text-indigo-600 font-medium'
                        : 'text-gray-600 hover:text-indigo-600'
                    }`}
                  >
                    <span className="mx-4">{item.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          <hr className="my-6 border-gray-200" />
          
          <button onClick={handleSignOut} className="w-full flex items-center px-6 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600">
            <span className="mx-4">Déconnexion</span>
          </button>
        </nav>
      </div>

      {/* Backdrop overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow pl-4 lg:pl-0">
          <div className="px-6 py-4 flex items-center">
            {/* Mobile hamburger menu button (top header version) - On garde uniquement ce bouton */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="mr-4 lg:hidden"
              aria-label="Toggle menu"
            >
              <svg 
                className="h-6 w-6 text-gray-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" 
                />
              </svg>
            </button>
            
            <h2 className="font-semibold text-xl text-gray-800">
              {pathname === '/photobooth-ia/admin' && 'Dashboard'}
              {pathname.includes('/projects') && 'Photobooth IA - Gestion des Projets'}
              {pathname.includes('/project-gallery') && 'Photobooth IA - Galerie de Projets'}
              {pathname.includes('/backgrounds') && 'Photobooth IA - Gestion des Arrière-plans'}
              {pathname.includes('/styles') && 'Photobooth IA - Gestion des Styles'}
              {pathname.includes('/settings') && 'Paramètres'}
              {pathname.includes('/s3-check') && 'Vérification S3'}
            </h2>
          </div>
        </header>
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
