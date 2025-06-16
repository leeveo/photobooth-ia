'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

import {
  FiHome,
  FiFolder,
  FiImage,
  FiSettings,
  FiBarChart2,
  FiLogOut,
  FiChevronDown,
  FiExternalLink,
  FiGrid,
  FiMusic,
  FiHelpCircle,
  FiRotateCcw,
  FiFilm,
  FiUser,
} from 'react-icons/fi';

import './admin.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [photoboothOpen, setPhotoboothOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isPublicRoute, setIsPublicRoute] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const supabase = createClientComponentClient();

  const publicRoutes = [
    '/photobooth-ia/admin/login',
    '/photobooth-ia/admin/register',
    '/photobooth-ia/admin/logout',
  ];

  // Check if current route is public - moved before the early return
  useEffect(() => {
    setIsPublicRoute(publicRoutes.includes(pathname));
  }, [pathname]);

  useEffect(() => {
    const checkUser = async () => {
      // Skip auth check for public routes
      if (isPublicRoute) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUser(null);
      } else {
        setUser(session.user);
        if (session.user?.email) {
          setUserEmail(session.user.email);
        }
      }
      
      // Check for admin_session in localStorage/sessionStorage
      const sessionData = sessionStorage.getItem('admin_session') || localStorage.getItem('admin_session');
      if (sessionData) {
        try {
          const parsedSession = JSON.parse(sessionData);
          if (parsedSession && parsedSession.email) {
            setUserEmail(parsedSession.email);
          }
        } catch (e) {
          console.error('Error parsing session data:', e);
        }
      }
      
      setLoading(false);
    };
    checkUser();
  }, [supabase.auth, isPublicRoute]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (isPublicRoute) return; // Skip for public routes

    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPublicRoute]);

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      router.push('/photobooth-ia/admin/login');
    }
  }, [loading, user, router, isPublicRoute]);

  const handleSignOut = () => {
    // Clear localStorage and sessionStorage
    localStorage.removeItem('admin_session');
    sessionStorage.removeItem('admin_session');
    
    // Clear cookies
    document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    // Redirect to logout page
    router.push('/photobooth-ia/admin/logout');
  };

  // ✅ NOW return for public routes AFTER all hooks are executed
  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  const isActive = (path: string) => pathname.includes(path);

  const photoboothLinks = [
    { name: 'Dashboard', path: '/photobooth-ia/admin/dashboard', icon: <FiHome className="w-5 h-5" /> },
    { name: 'Projets', path: '/photobooth-ia/admin/projects', icon: <FiFolder className="w-5 h-5" /> },
    { name: 'Creation de Template', path: '/photobooth-ia/admin/templates', icon: <FiSettings className="w-5 h-5" /> },
    { name: 'Galerie', path: '/photobooth-ia/admin/project-gallery', icon: <FiImage className="w-5 h-5" /> },
    { name: 'Statistiques', path: '/photobooth-ia/admin/stats', icon: <FiBarChart2 className="w-5 h-5" /> },
  ];

  const externalApps = [
    {
      label: 'Photo mosaique',
      url: process.env.NEXT_PUBLIC_PHOTO_MOSAIQUE_URL,
      icon: <FiGrid className="w-5 h-5" />,
      color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    },
    {
      label: 'Karaoke',
      url: process.env.NEXT_PUBLIC_KARAOKE_URL,
      icon: <FiMusic className="w-5 h-5" />,
      color: 'bg-pink-100 text-pink-700 border-pink-300',
    },
    {
      label: 'Quizz',
      url: process.env.NEXT_PUBLIC_QUIZZ_URL,
      icon: <FiHelpCircle className="w-5 h-5" />,
      color: 'bg-green-100 text-green-700 border-green-300',
    },
    {
      label: 'Roue de la fortune',
      url: process.env.NEXT_PUBLIC_ROUE_FORTUNE_URL,
      icon: <FiRotateCcw className="w-5 h-5" />,
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    },
    {
      label: 'Fresque animée',
      url: process.env.NEXT_PUBLIC_FRESQUE_ANIMEE_URL,
      icon: <FiFilm className="w-5 h-5" />,
      color: 'bg-purple-100 text-purple-700 border-purple-300',
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* SIDEBAR */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out`}>
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">PhotoboothIA</h1>
          <p className="text-sm text-gray-500">Administration</p>
        </div>
        <nav className="mt-6 flex flex-col gap-2 text-sm">
          <div className="px-6 py-2 lg:hidden">
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-gray-700 focus:outline-none">
              <span className="text-sm">Fermer le menu</span>
            </button>
          </div>

          <div className="mx-4 my-2 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 shadow-inner p-2">
            <button
              type="button"
              className="w-full px-4 py-2 font-bold text-gray-700 flex items-center gap-2 focus:outline-none"
              onClick={() => setPhotoboothOpen(!photoboothOpen)}
            >
              <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${photoboothOpen ? 'rotate-0' : '-rotate-90'}`} />
              Photobooth
            </button>
            <div className={`flex flex-col transition-all duration-200 overflow-hidden ${photoboothOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              {photoboothLinks.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-8 py-2 mx-2 my-1 rounded-lg transition-all duration-150
                    ${isActive(item.path)
                    ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 font-semibold shadow'
                    : 'text-gray-700 hover:bg-indigo-100 hover:text-indigo-700 hover:shadow'
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="px-6 py-2 mt-6 font-bold text-gray-700 flex items-center gap-2">
            <FiExternalLink className="w-4 h-4" />
            Applications externes
          </div>
          <div className="flex flex-col gap-3 px-4">
            {externalApps.map(app =>
              app.url ? (
                <a
                  key={app.label}
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${app.color} shadow-sm hover:scale-[1.03] transition-transform`}
                >
                  {app.icon}
                  <span className="font-medium">{app.label}</span>
                </a>
              ) : null
            )}
          </div>

          <hr className="my-6 border-gray-200 mx-4" />
        </nav>
      </div>

      {/* BACKDROP */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-4 lg:hidden" aria-label="Toggle menu">
                <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="font-semibold text-xl text-gray-800">
                {photoboothLinks.find(item => isActive(item.path))?.name || 'Administration'}
              </h2>
            </div>
            
            {/* User Profile Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                  <FiUser className="w-4 h-4" />
                </div>
                <span className="hidden md:inline-block font-medium">{userEmail ? userEmail.split('@')[0] : 'Utilisateur'}</span>
                <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : 'rotate-0'}`} />
              </button>
              
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-2 px-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-700">Connecté en tant que</p>
                    <p className="text-sm text-gray-500 truncate">{userEmail || 'Utilisateur'}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <FiLogOut className="mr-2 h-4 w-4" />
                      Se déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
