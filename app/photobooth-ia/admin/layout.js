'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  FiHome, 
  FiFolder, 
  FiImage, 
  FiSettings, 
  FiBarChart2, 
  FiLogOut 
} from 'react-icons/fi';

import './admin.css'; // Importer les styles CSS spécifiques à l'admin

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
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

  const isActive = (path) => {
    return pathname.includes(path);
  };

  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/photobooth-ia/admin/dashboard', 
      icon: <FiHome className="w-5 h-5" /> 
    },
    { 
      name: 'Projets', 
      path: '/photobooth-ia/admin/projects', 
      icon: <FiFolder className="w-5 h-5" /> 
    },
    { 
      name: 'Galerie', 
      path: '/photobooth-ia/admin/project-gallery', 
      icon: <FiImage className="w-5 h-5" /> 
    },
    { 
      name: 'Statistiques', 
      path: '/photobooth-ia/admin/stats', 
      icon: <FiBarChart2 className="w-5 h-5" /> 
    },
    { 
      name: 'Paramètres', 
      path: '/photobooth-ia/admin/settings', 
      icon: <FiSettings className="w-5 h-5" /> 
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - responsive */}
      <div
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out`}
      >
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">PhotoboothIA</h1>
          <p className="text-sm text-gray-500">Administration</p>
        </div>
        <nav className="mt-6 flex flex-col gap-2 text-sm">
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
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-6 py-3 mx-2 rounded-lg ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
          
          <hr className="my-6 border-gray-200 mx-4" />
          
          <Link
            href="/"
            className="flex items-center gap-3 px-6 py-3 mx-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600"
          >
            <FiLogOut className="w-5 h-5" />
            <span>Retour au site</span>
          </Link>
        </nav>
      </div>

      {/* Backdrop overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center">
            {/* Mobile hamburger menu button */}
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
              {navItems.find(item => isActive(item.path))?.name || 'Administration'}
            </h2>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
