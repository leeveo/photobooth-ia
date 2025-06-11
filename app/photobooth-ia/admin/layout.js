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
  FiLogOut,
  FiChevronDown,
  FiExternalLink,
  FiGrid,
  FiMusic,
  FiHelpCircle,
  FiRotateCcw,
  FiFilm
} from 'react-icons/fi';

import './admin.css'; // Importer les styles CSS spécifiques à l'admin

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Ajout d'un état pour le menu Photobooth rétractable
  const [photoboothOpen, setPhotoboothOpen] = useState(true);
  
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
        setUser(null);
        setLoading(false);
      } else {
        setUser(session.user);
        setLoading(false);
      }
    };

    checkUser();
  }, [supabase.auth]);

  // Redirection login si pas authentifié (dans un effet séparé)
  useEffect(() => {
    if (!loading && !user && pathname !== '/photobooth-ia/admin/login') {
      router.push('/photobooth-ia/admin/login');
    }
  }, [loading, user, pathname, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/photobooth-ia/admin/login');
  };

  // Show loading indicator or login page if user is not authenticated
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  // Ne rien rendre si pas authentifié et pas sur la page login (évite le setState dans le render)
  if (!user && pathname !== '/photobooth-ia/admin/login') {
    return null;
  }

  // Don't show navigation on login page
  if (pathname === '/photobooth-ia/admin/login') {
    return <>{children}</>;
  }

  const isActive = (path) => {
    return pathname.includes(path);
  };

  // Récupérer les liens externes depuis les variables d'environnement
  const externalApps = [
    {
      label: 'Photo mosaique',
      url: process.env.NEXT_PUBLIC_PHOTO_MOSAIQUE_URL,
      icon: <FiGrid className="w-5 h-5" />,
      color: 'bg-indigo-100 text-indigo-700 border-indigo-300'
    },
    {
      label: 'Karaoke',
      url: process.env.NEXT_PUBLIC_KARAOKE_URL,
      icon: <FiMusic className="w-5 h-5" />,
      color: 'bg-pink-100 text-pink-700 border-pink-300'
    },
    {
      label: 'Quizz',
      url: process.env.NEXT_PUBLIC_QUIZZ_URL,
      icon: <FiHelpCircle className="w-5 h-5" />,
      color: 'bg-green-100 text-green-700 border-green-300'
    },
    {
      label: 'Roue de la fortune',
      url: process.env.NEXT_PUBLIC_ROUE_FORTUNE_URL,
      icon: <FiRotateCcw className="w-5 h-5" />,
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300'
    },
    {
      label: 'Fresque animée',
      url: process.env.NEXT_PUBLIC_FRESQUE_ANIMEE_URL,
      icon: <FiFilm className="w-5 h-5" />,
      color: 'bg-purple-100 text-purple-700 border-purple-300'
    },
  ];

  // Sidebar navigation regroupée
  const photoboothLinks = [
    { name: 'Dashboard', path: '/photobooth-ia/admin/dashboard', icon: <FiHome className="w-5 h-5" /> },
    { name: 'Projets', path: '/photobooth-ia/admin/projects', icon: <FiFolder className="w-5 h-5" /> },
    { name: 'Creation de Template', path: '/photobooth-ia/admin/templates', icon: <FiSettings className="w-5 h-5" /> },
    { name: 'Galerie', path: '/photobooth-ia/admin/project-gallery', icon: <FiImage className="w-5 h-5" /> },
    { name: 'Statistiques', path: '/photobooth-ia/admin/stats', icon: <FiBarChart2 className="w-5 h-5" /> },
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
          
          {/* Encart coloré pour Photobooth + sous-menu rétractable */}
          <div className="mx-4 my-2 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 shadow-inner p-2">
            <button
              type="button"
              className="w-full px-4 py-2 font-bold text-gray-700 flex items-center gap-2 focus:outline-none select-none"
              onClick={() => setPhotoboothOpen((open) => !open)}
              aria-expanded={photoboothOpen}
              aria-controls="photobooth-links"
            >
              <FiChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${photoboothOpen ? 'rotate-0' : '-rotate-90'}`}
              />
              Photobooth
            </button>
            <div
              id="photobooth-links"
              className={`flex flex-col transition-all duration-200 overflow-hidden ${
                photoboothOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {photoboothLinks.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-8 py-2 mx-2 my-1 rounded-lg transition-all duration-150
                    ${
                      isActive(item.path)
                        ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 font-semibold shadow'
                        : 'text-gray-700 hover:bg-indigo-100 hover:text-indigo-700 hover:shadow'
                    }
                  `}
                  style={{ cursor: 'pointer' }}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
          
          {/* Section Applications externes */}
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
                  style={{ textDecoration: 'none' }}
                >
                  {app.icon}
                  <span className="font-medium">{app.label}</span>
                </a>
              ) : null
            )}
          </div>
          
          <hr className="my-6 border-gray-200 mx-4" />

          {/* Encart documentation */}
          <div className="mx-4 mb-4">
            <div className="rounded-lg bg-blue-100 border border-blue-200 p-4 flex flex-col items-start">
              <div className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3m9 0a9 9 0 100-18 9 9 0 000 18z" />
                </svg>
                Documentation
              </div>
              <div className="text-blue-700 text-xs mb-2">
                Retrouvez guides, API et FAQ pour administrer PhotoboothIA.
              </div>
              <a
                href="https://docs.photoboothia.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-1 px-3 py-1 bg-blue-200 text-blue-800 rounded font-medium text-xs hover:bg-blue-300 transition"
              >
                Accéder à la documentation
              </a>
            </div>
          </div>
          {/* SUPPRESSION du lien "Retour au  site" */}
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
              {photoboothLinks.find(item => isActive(item.path))?.name || 'Administration'}
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
