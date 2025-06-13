'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { RiFolder2Line, RiCamera2Line, RiRefreshLine, RiArrowRightSLine } from 'react-icons/ri';
import Loader from '../../../components/ui/Loader';

export default function Dashboard() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalSessions: 0,
    totalPhotos: 0,
    recentSessions: []
  });
  const [projects, setProjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [projectsWithPhotoCount, setProjectsWithPhotoCount] = useState({});
  
  // Création d'une fonction fetchProjects séparée pour déboguer
  const fetchProjects = useCallback(async () => {
    console.log("Dashboard: Fetching projects from Supabase...");
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Supabase projects error:", error);
        throw error;
      }
      
      console.log("Projects received in dashboard:", data?.length || 0, "projects");
      return data || [];
    } catch (error) {
      console.error('Error fetching projects in dashboard:', error);
      setError('Erreur lors du chargement des projets');
      return [];
    }
  }, [supabase]);
  
  // Fonction pour récupérer les données du tableau de bord
  const fetchDashboardData = useCallback(async () => {
    console.log("Fetching dashboard data...");
    setLoading(true);
    try {
      // Récupérer les projets
      const projectsData = await fetchProjects();
      setProjects(projectsData);
      
      // Vérifier si la table sessions existe et récupérer les sessions récentes
      try {
        // Tenter une requête simple sans jointure
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (sessionsError) {
          console.warn("Sessions table may not exist:", sessionsError);
          // Continuer sans les données de sessions
          setSessions([]);
        } else {
          setSessions(sessionsData || []);
        }
      } catch (sessionError) {
        console.warn("Error fetching sessions, continuing without session data:", sessionError);
        setSessions([]);
      }
      
      // Calculer les statistiques
      const activeProjects = projectsData ? projectsData.filter(p => p.is_active).length : 0;
      
      // Récupérer le nombre de photos pour chaque projet
      let totalPhotos = 0;
      const photoCounts = {};
      
      console.log("Fetching photo counts for", projectsData.length, "projects");
      
      for (const project of projectsData || []) {
        try {
          // Appeler l'API pour compter les images S3
          console.log(`Fetching photo count for project ${project.id}: ${project.name}`);
          const response = await fetch(`/api/s3-project-images?projectId=${project.id}&countOnly=true`);
          
          if (!response.ok) {
            console.warn(`Failed to fetch counts for project ${project.id}:`, response.statusText);
            photoCounts[project.id] = 0;
            continue;
          }
          
          const countData = await response.json();
          const count = countData.count || 0;
          console.log(`Project ${project.id} has ${count} photos`);
          photoCounts[project.id] = count;
          totalPhotos += count;
        } catch (countError) {
          console.error(`Error fetching counts for project ${project.id}:`, countError);
          photoCounts[project.id] = 0;
        }
      }
      
      setProjectsWithPhotoCount(photoCounts);
      
      setStats({
        totalProjects: projectsData.length,
        activeProjects,
        totalSessions: sessions.length || 0,
        totalPhotos,
        recentSessions: sessions || []
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Erreur lors du chargement des données du tableau de bord');
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchProjects, sessions.length]);
  
  useEffect(() => {
    console.log("Dashboard mounted, calling fetchDashboardData");
    fetchDashboardData();
    
    // Afficher les informations de connexion Supabase pour le débogage
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Supabase Anon Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set");
  }, [fetchDashboardData]);
  
  // Add permission check on component mount
  useEffect(() => {
    async function checkPermissions() {
      try {
        // First check if the API endpoint exists
        const response = await fetch('/api/check-permissions', {
          // Add cache control to prevent caching
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          // Handle non-200 responses more gracefully
          if (response.status === 404) {
            console.warn('Permissions check API not found, continuing without check');
            return; // Continue without permissions check
          }
          throw new Error(`Permissions check failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          console.warn('Permissions check returned failure:', data.error);
          setError('Vérification des permissions échouée: ' + (data.error || 'unknown error'));
        } else if (!data.permissions.s3) {
          console.warn('S3 permissions failed');
          setError('Problème de permissions AWS S3: vérifiez vos identifiants et votre connexion internet');
        } else if (!data.permissions.supabase) {
          console.warn('Supabase permissions failed');
          setError('Problème de permissions Supabase: vérifiez vos identifiants');
        } else {
          console.log('All permissions checks passed:', data.permissions);
        }
      } catch (err) {
        console.error('Permission check error:', err);
        // Don't block the dashboard from loading with a permissions error
        console.warn(`Erreur lors de la vérification des permissions: ${err.message}`);
      }
    }
    
    checkPermissions();
  }, []);
  
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

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl shadow-sm">
        <h2 className="text-lg font-medium text-red-800">Erreur de chargement</h2>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        <button 
          onClick={() => fetchDashboardData()} 
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
        >
          <RiRefreshLine className="w-5 h-5" />
          Réessayer
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader 
          size="large" 
          message="Chargement du tableau de bord..." 
          variant="premium" 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats Card */}
      <div className="p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl shadow-lg text-white">
        <h3 className="text-xl font-medium mb-6">Statistiques Globales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Photos */}
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-3 flex items-center justify-center">
              <RiCamera2Line className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white text-opacity-80">Total des photos générées</p>
              <div className="flex items-center">
                <span className="text-4xl font-bold">{stats.totalPhotos}</span>
                <span className="ml-2 text-sm text-white text-opacity-70">images</span>
              </div>
            </div>
          </div>
          {/* Projets */}
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-3 flex items-center justify-center">
              <RiFolder2Line className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white text-opacity-80">Projets actifs</p>
              <div className="flex items-center">
                <span className="text-4xl font-bold">{stats.totalProjects}</span>
                <span className="ml-2 text-sm text-white text-opacity-70">projets</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={() => fetchDashboardData()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow hover:from-green-600 hover:to-emerald-700 transition-all font-medium"
        >
          <RiRefreshLine className="w-5 h-5" />
          Actualiser les données
        </button>
      </div>

      {/* Projects List */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Projets ({projects.length})</h3>
          <Link 
            href="/photobooth-ia/admin/projects" 
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
          >
            Voir tous
            <RiArrowRightSLine className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-6 flex justify-center">
              <Loader size="default" message="Chargement des projets..." variant="premium" />
            </div>
          ) : projects.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">Aucun projet trouvé.</p>
              <Link 
                href="/photobooth-ia/admin/projects" 
                className="mt-2 inline-block text-sm font-medium px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
              >
                Créer un nouveau projet
              </Link>
            </div>
          ) : (
            <>
              {projects.slice(0, 5).map((project) => (
                <div key={project.id} className="px-6 py-4 hover:bg-gray-50 transition duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {project.logo_url ? (
                          <div className="w-12 h-12 relative rounded-lg overflow-hidden border border-gray-200">
                            <Image
                              src={project.logo_url}
                              alt={project.name}
                              fill
                              priority // Add priority to fix LCP warning
                              sizes="48px"
                              style={{ objectFit: "cover" }}
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-500 rounded-lg flex items-center justify-center">
                            <RiFolder2Line className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center">
                          <h4 className="text-base font-medium text-gray-900">{project.name}</h4>
                          <span className="ml-2 bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {projectsWithPhotoCount[project.id] || 0} photos
                          </span>
                        </div>
                        <div className="flex items-center mt-1 text-sm">
                          <span className="text-gray-500">/{project.slug}</span>
                          
                          <span className="mx-2 text-gray-300">•</span>
                          
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            project.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {project.is_active ? 'Actif' : 'Inactif'}
                          </span>
                          
                          <span className="mx-2 text-gray-300">•</span>
                          
                          <span className="text-gray-500">
                            {getPhotoboothTypeLabel(project.photobooth_type)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Link
                        href={`/photobooth-ia/admin/project-gallery?id=${project.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm hover:from-blue-600 hover:to-purple-700 transition-colors"
                      >
                        <RiCamera2Line className="mr-1 h-4 w-4" />
                        Photos ({projectsWithPhotoCount[project.id] || 0})
                      </Link>
                      
                      <Link
                        href={`/photobooth/${project.slug}`}
                        target="_blank"
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Accès au Photobooth
                      </Link>
                      
                      <Link
                        href={`/photobooth-ia/admin/projects/${project.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium text-white bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm hover:from-indigo-600 hover:to-purple-700 transition-colors"
                      >
                        Configurer
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              
              {projects.length > 5 && (
                <div className="px-6 py-3 bg-gray-50 text-center">
                  <Link 
                    href="/photobooth-ia/admin/projects" 
                    className="text-sm text-indigo-600 hover:text-indigo-500 font-medium flex items-center justify-center gap-1"
                  >
                    Voir les {projects.length - 5} autres projets
                    <RiArrowRightSLine className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="p-6 bg-blue-50 border-l-4 border-blue-400 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-blue-800">Galerie & Mosaïque</h3>
            <span className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
              Visualisation
            </span>
          </div>
          <p className="mt-2 text-sm text-blue-600">
            Accédez à la galerie de toutes les photos générées par vos utilisateurs, filtrez par projet et affichez-les en mosaïque interactive pour vos événements ou sur écran géant.
          </p>
        </div>
        <div className="p-6 bg-purple-50 border-l-4 border-purple-400 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-purple-800">Personnalisation IA & Styles</h3>
            <span className="px-3 py-1 text-xs font-medium text-purple-600 bg-purple-100 rounded-full">
              Expérience
            </span>
          </div>
          <p className="mt-2 text-sm text-purple-600">
            Gérez les styles IA disponibles (looks, costumes, effets) pour chaque projet. Proposez des expériences uniques et adaptées à vos utilisateurs grâce à la personnalisation avancée.
          </p>
        </div>
        <div className="p-6 bg-green-50 border-l-4 border-green-400 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-green-800">Statistiques & Suivi</h3>
            <span className="px-3 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full">
              Analyse
            </span>
          </div>
          <p className="mt-2 text-sm text-green-600">
            Suivez l'activité de vos photobooths IA : nombre de photos générées, projets les plus actifs, évolution dans le temps. Analysez l'impact de vos animations et optimisez vos événements.
          </p>
        </div>
      </div>
    </div>
  );
}
