'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RiAddLine, RiRefreshLine, RiFolder2Line, RiExternalLinkLine, RiSettings4Line } from 'react-icons/ri';
import Loader from '../../../components/ui/Loader';

interface SessionData {
  user_id: string;
  email: string;
  company_name?: string;
  logged_in: boolean;
  login_method: string;
  login_time: string;
}

export default function Projects() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    const checkSession = () => {
      try {
        // Vérifier si le cookie admin_session existe
        const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('admin_session='));
        
        // Essayer de récupérer depuis sessionStorage d'abord
        let sessionData = sessionStorage.getItem('admin_session');
        
        // Si pas trouvé, essayer localStorage
        if (!sessionData) {
          sessionData = localStorage.getItem('admin_session');
        }
        
        if (sessionData) {
          const parsedSession = JSON.parse(sessionData) as SessionData;
          
          // Vérifier si la session est valide
          if (parsedSession && parsedSession.logged_in) {
            setSession(parsedSession);
            
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
  }, [router]);

  // Fonction pour récupérer les projets
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    
    if (!session || !session.user_id) {
      console.warn("No valid session found, cannot fetch user-specific projects");
      setProjects([]);
      setLoading(false);
      return;
    }
    
    try {
      console.log(`Filtering projects for user ID: ${session.user_id}`);
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', session.user_id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Erreur lors de la récupération des projets:", error);
        setError("Erreur lors du chargement des projets. Veuillez réessayer.");
        setProjects([]);
      } else {
        console.log(`Projets récupérés: ${data?.length || 0} projets pour cet utilisateur`);
        setProjects(data || []);
        setError(null);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des projets:", err);
      setError("Une erreur s'est produite. Veuillez réessayer.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, session]);

  // Charger les projets quand la session est disponible
  useEffect(() => {
    if (session) {
      fetchProjects();
    }
  }, [fetchProjects, session]);
  
  // Function to get photobooth type label
  const getPhotoboothTypeLabel = (type) => {
    switch (type) {
      case 'premium':
        return 'Premium';
      case 'photobooth2':
        return 'MiniMax';
      default:
        return 'FaceSwapping';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {session?.company_name 
              ? `Projets de ${session.company_name}`
              : "Vos Projets"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos projets de photobooth IA et créez-en de nouveaux.
          </p>
        </div>
        
        <Link
          href="/photobooth-ia/admin/projects/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          <RiAddLine className="mr-2 h-4 w-4" />
          Nouveau projet
        </Link>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-md">
          <p className="font-medium">Erreur</p>
          <p>{error}</p>
          <button 
            onClick={fetchProjects} 
            className="mt-2 flex items-center text-sm font-medium text-red-700 hover:text-red-600"
          >
            <RiRefreshLine className="mr-1" /> Réessayer
          </button>
        </div>
      )}

      {/* Projects grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size="large" message="Chargement des projets..." variant="premium" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900">Aucun projet trouvé</h3>
            <p className="mt-2 text-sm text-gray-500">
              Vous n'avez pas encore créé de projet. Commencez par en créer un nouveau.
            </p>
            <div className="mt-6">
              <Link
                href="/photobooth-ia/admin/projects/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <RiAddLine className="mr-2 h-4 w-4" />
                Créer un projet
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center mb-4">
                  {project.logo_url ? (
                    <div className="w-12 h-12 relative rounded-lg overflow-hidden border border-gray-200 mr-4">
                      <Image
                        src={project.logo_url}
                        alt={project.name}
                        fill
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-500 rounded-lg flex items-center justify-center mr-4">
                      <RiFolder2Line className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500">/{project.slug}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {project.is_active ? 'Actif' : 'Inactif'}
                  </span>
                  
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {getPhotoboothTypeLabel(project.photobooth_type)}
                  </span>
                  
                  {project.event_date && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {new Date(project.event_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                  {project.description || "Aucune description disponible."}
                </p>
                
                <div className="flex justify-between space-x-2">
                  <Link
                    href={`/photobooth/${project.slug}`}
                    target="_blank"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <RiExternalLinkLine className="mr-1 h-4 w-4" />
                    Accéder
                  </Link>
                  
                  <Link
                    href={`/photobooth-ia/admin/project-gallery?id=${project.id}`}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm hover:from-blue-600 hover:to-purple-700"
                  >
                    Galerie photos
                  </Link>
                  
                  <Link
                    href={`/photobooth-ia/admin/projects/${project.id}`}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium text-white bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm hover:from-indigo-600 hover:to-purple-700"
                  >
                    <RiSettings4Line className="mr-1 h-4 w-4" />
                    Configurer
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
