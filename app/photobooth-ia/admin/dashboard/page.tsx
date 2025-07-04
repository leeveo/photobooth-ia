'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { RiFolder2Line, RiCamera2Line, RiRefreshLine, RiArrowRightSLine, RiPaletteLine, RiFilter3Line, RiCloseLine, RiInformationLine, RiPieChart2Line } from 'react-icons/ri';
import Loader from '../../../components/ui/Loader';
import { useRouter } from 'next/navigation';
// Importer les données de style
import styleTemplatesData from '../components/styleTemplatesData.json';

interface SessionData {
  user_id: string;
  email: string;
  company_name?: string;
  logged_in: boolean;
  login_method: string;
  login_time: string;
}

export default function Dashboard() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
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
  
  // Pour la bibliothèque de styles
  const [selectedStyleCategory, setSelectedStyleCategory] = useState(null);
  const [expandedCollections, setExpandedCollections] = useState({});
  // État pour le modal de détails des styles
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{ quota: number, used: number, resetAt: string | null }>({ quota: 0, used: 0, resetAt: null });
  
  // Ajoute un nouvel état pour le nombre de photos prises sur la période de quota
  const [photosThisPeriod, setPhotosThisPeriod] = useState(0);

  // Récupérer l'ID de l'admin connecté
  useEffect(() => {
    const getAdminSession = () => {
      try {
        // Récupérer la session depuis localStorage ou sessionStorage
        const sessionStr = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
        
        if (!sessionStr) {
          console.warn("Aucune session admin trouvée, redirection vers login");
          router.push('/photobooth-ia/admin/login');
          return null;
        }

        // Correction : décoder base64 avant JSON.parse
        let decodedSession = sessionStr;
        try {
          decodedSession = atob(sessionStr);
        } catch (e) {
          // Si déjà décodé, ignorer
        }
        const sessionData = JSON.parse(decodedSession) as SessionData;
        
        if (!sessionData.user_id && sessionData.userId) {
          // Support legacy: si userId existe, le mapper
          sessionData.user_id = sessionData.userId;
        }
        
        if (!sessionData.user_id) {
          console.warn("Session invalide (aucun user_id), redirection vers login");
          router.push('/photobooth-ia/admin/login');
          return null;
        }
        
        console.log("Session admin trouvée, ID:", sessionData.user_id);
        setCurrentAdminId(sessionData.user_id);
        return sessionData.user_id;
      } catch (err) {
        console.error("Erreur lors de la récupération de la session admin:", err);
        router.push('/photobooth-ia/admin/login');
        return null;
      }
    };
    
    getAdminSession();
  }, [router]);
  
  // Fonction pour récupérer les projets de l'admin connecté
  const fetchProjects = useCallback(async (adminId: string) => {
    if (!adminId) {
      console.warn("Impossible de charger les projets: ID admin non défini");
      return [];
    }
    
    console.log(`Chargement des projets pour l'admin ID: ${adminId}`);
    
    try {
      // Filtrer les projets par l'ID de l'admin connecté
      // et inclure les projets où archive est NULL ou false
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', adminId) // Filtre par ID admin
        .or('archive.is.null,archive.eq.false') // Inclure les projets où archive est NULL ou false
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Erreur Supabase:", error);
        throw error;
      }
      
      console.log(`${data?.length || 0} projets trouvés pour l'admin ${adminId}`);
      return data || [];
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
      setError('Erreur lors du chargement des projets');
      return [];
    }
  }, [supabase]);
  
  // Fonction pour charger les données du dashboard une fois l'admin ID récupéré
  const fetchDashboardData = useCallback(async () => {
    if (!currentAdminId) {
      console.warn("Impossible de charger les données: admin ID non défini");
      return;
    }
    
    setLoading(true);
    console.log(`Chargement des données du dashboard pour l'admin ID: ${currentAdminId}`);
    
    try {
      // Récupérer les projets de l'admin connecté
      const projectsData = await fetchProjects(currentAdminId);
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
      
      // Récupérer le nombre de photos pour chaque projet depuis la table sessions
      let totalPhotos = 0;
      const photoCounts = {};

      console.log("Fetching photo counts for", projectsData.length, "projects");

      for (const project of projectsData || []) {
        try {
          // Compter les sessions pour ce projet (une session = une photo)
          const { count, error: countError } = await supabase
            .from('sessions')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', project.id);

          if (countError) {
            console.warn(`Failed to fetch counts for project ${project.id}:`, countError);
            photoCounts[project.id] = 0;
            continue;
          }

          photoCounts[project.id] = count || 0;
          totalPhotos += count || 0;
          console.log(`Project ${project.id} has ${count} photos`);
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
      console.error('Erreur lors du chargement des données du tableau de bord:', error);
      setError('Erreur lors du chargement des données du tableau de bord');
    } finally {
      setLoading(false);
    }
  }, [currentAdminId, fetchProjects, sessions.length, supabase]);
  
  // Appeler fetchDashboardData quand currentAdminId change
  useEffect(() => {
    if (currentAdminId) {
      console.log(`Admin ID récupéré (${currentAdminId}), chargement des données...`);
      fetchDashboardData();
    }
  }, [currentAdminId, fetchDashboardData]);
  
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

  // Fonction pour ouvrir le modal avec la collection sélectionnée
  const openStyleDetailsModal = (collection) => {
    setSelectedCollection(collection);
    setIsModalOpen(true);
    // Empêcher le défilement de la page derrière le modal
    document.body.style.overflow = 'hidden';
  };

  // Fonction pour fermer le modal
  const closeStyleDetailsModal = () => {
    setIsModalOpen(false);
    setSelectedCollection(null);
    // Réactiver le défilement de la page
    document.body.style.overflow = 'auto';
  };

  // Remplace le useEffect de quota par une version qui utilise une requête SQL personnalisée pour le décompte :
  useEffect(() => {
    async function fetchQuotaAndPhotos() {
      if (!currentAdminId) return;

      // 1. Récupérer le quota et la date de reset du dernier paiement
      // Modification pour éviter d'utiliser plan_type
      const { data: lastPayment, error: paymentError } = await supabase
        .from('admin_payments')
        .select('photo_quota, photo_quota_reset_at')
        .eq('admin_user_id', currentAdminId)
        .order('created_at', { ascending: false })  // Utilisez created_at au lieu de photo_quota_reset_at
        .limit(1)
        .maybeSingle();

      if (paymentError || !lastPayment) {
        setQuotaInfo({ quota: 0, used: 0, resetAt: null });
        setPhotosThisPeriod(0);
        return;
      }

      const quota = lastPayment.photo_quota || 0;
      const resetAt = lastPayment.photo_quota_reset_at;

      // 2. Utilise une requête SQL personnalisée pour compter les photos prises depuis le reset
      const { data, error } = await supabase.rpc('photos_count_for_admin', {
        admin_id: currentAdminId
      });

      // Si tu n'as pas de fonction SQL côté Supabase, tu peux utiliser la requête SQL brute :
      // const { data, error } = await supabase
      //   .rpc('execute_sql', {
      //     sql: `
      //       SELECT COUNT(s.id) AS photos_count
      //       FROM sessions s
      //       JOIN projects p ON s.project_id = p.id
      //       JOIN admin_users u ON p.created_by = u.id
      //       WHERE u.id = '${currentAdminId}'
      //         AND s.created_at >= '${resetAt}'
      //     `
      //   });

      // Si tu ne peux pas utiliser de RPC, tu peux faire le décompte côté JS :
      // 1. Récupère tous les projets de l'admin
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('created_by', currentAdminId);

      const projectIds = projects?.map(p => p.id) || [];

      // 2. Compte les sessions pour ces projets depuis le reset
      const { count, error: countError } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .gte('created_at', resetAt);

      setQuotaInfo({
        quota,
        used: count || 0,
        resetAt
      });
      setPhotosThisPeriod(count || 0);
    }

    fetchQuotaAndPhotos();
    const interval = setInterval(fetchQuotaAndPhotos, 10000);
    return () => clearInterval(interval);
  }, [currentAdminId, supabase]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
              {/* Ajoute ici le décompte sur la période de quota */}
              <div className="text-xs text-white text-opacity-70 mt-1">
                Sur la période actuelle : {photosThisPeriod} / {quotaInfo.quota} utilisées
              </div>
              {/* Message d'alerte si moins de 10 photos restantes */}
              {quotaInfo.quota > 0 && quotaInfo.quota - photosThisPeriod <= 10 && quotaInfo.quota - photosThisPeriod > 0 && (
                <div className="mt-1 text-xs font-bold text-yellow-300 bg-yellow-900 bg-opacity-40 px-2 py-1 rounded">
                  Attention : il ne vous reste plus que {quotaInfo.quota - photosThisPeriod} photo{quotaInfo.quota - photosThisPeriod > 1 ? 's' : ''} à prendre avant d’atteindre votre quota !
                </div>
              )}
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
          {/* Quota */}
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-3 flex items-center justify-center">
              <RiPieChart2Line className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white text-opacity-80">Quota photos</p>
              <div className="flex items-center">
                <span className="text-4xl font-bold">
                  {quotaInfo.quota - quotaInfo.used >= 0 ? quotaInfo.quota - quotaInfo.used : 0}
                </span>
                <span className="ml-2 text-sm text-white text-opacity-70">
                  / {quotaInfo.quota} restantes
                </span>
              </div>
              <div className="text-xs text-white text-opacity-70 mt-1">
                {quotaInfo.resetAt && (
                  <>Reset le {new Date(quotaInfo.resetAt).toLocaleDateString()}</>
                )}
              </div>
              {/* Bouton d'accès à la page de plans */}
              <div className="mt-4 flex justify-center">
                <Link
                  href="/photobooth-ia/admin/choose-plan"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 via-indigo-600 to-purple-600 text-white font-bold text-base shadow-lg hover:from-pink-600 hover:to-purple-700 transition-all border-4 border-white"
                  style={{ boxShadow: '0 4px 24px 0 rgba(99,102,241,0.25)' }}
                >
                  <RiArrowRightSLine className="w-6 h-6" />
                  Augmenter mon quota / Changer de plan
                </Link>
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

      {/* Style Library Section */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <RiPaletteLine className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-medium text-gray-900">Bibliothèque de Styles</h3>
            </div>
            <div className="flex items-center">
              <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {styleTemplatesData.length} collections
              </span>
            </div>
          </div>
          {/* Explication positionnée juste sous le titre */}
          <div className="mt-3">
            <p className="text-sm text-gray-700 bg-indigo-50 rounded-lg px-4 py-3 shadow">
              <span className="font-semibold text-indigo-700">Astuce :</span>
              {' '}
              Les styles dont la miniature montre un <span className="font-semibold">groupe de personnes</span> peuvent être utilisés aussi bien pour les photos de groupe que pour les photos individuelles.
              Les styles avec une seule personne en miniature sont conçus pour une utilisation individuelle.
            </p>
          </div>
        </div>
        
        {/* Categories Tabs */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex whitespace-nowrap px-4 py-2">
            <button 
              onClick={() => setSelectedStyleCategory(null)}
              className={`px-4 py-2 font-medium text-sm rounded-lg mr-2 ${
                !selectedStyleCategory 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Tous
            </button>
            
            {Array.from(new Set(styleTemplatesData.map(collection => collection.compatibleWith[0]))).map(category => (
              <button 
                key={category}
                onClick={() => setSelectedStyleCategory(category)}
                className={`px-4 py-2 font-medium text-sm rounded-lg mr-2 ${
                  selectedStyleCategory === category 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {category === 'premium' ? 'Premium' : 
                 category === 'standard' ? 'Standard' : 
                 category === 'photobooth2' ? 'MiniMax' : 
                 category === 'avatar' ? 'Avatar IA' : category}
              </button>
            ))}
          </div>
        </div>
        
        {/* Collections Grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {styleTemplatesData
            .filter(collection => !selectedStyleCategory || collection.compatibleWith.includes(selectedStyleCategory))
            .map(collection => (
              <div 
                key={collection.id} 
                className="group border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div 
                  className="relative h-48 w-full overflow-hidden cursor-pointer"
                  // Ouvre le popup de détails au clic sur l'image/encart du style
                  onClick={() => openStyleDetailsModal(collection)}
                >
                  {collection.image ? (
                    <Image
                      src={collection.image}
                      alt={collection.name}
                      fill
                      priority
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      style={{ objectFit: "cover" }}
                      className="group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                      <RiPaletteLine className="h-16 w-16 text-indigo-400" />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                    <h4 className="text-white font-medium text-lg">{collection.name}</h4>
                    <p className="text-white/80 text-sm mt-1 line-clamp-2">{collection.description}</p>
                  </div>
                  
                  <div className="absolute top-2 right-2">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded">
                      {collection.styles.length} styles
                    </span>
                  </div>
                  
                  {collection.compatibleWith.map((type, idx) => (
                    <div key={type} className="absolute top-2 left-2 flex items-center">
                      <span 
                        className={`
                          text-xs font-bold px-2 py-1 rounded
                          ${type === 'premium' ? 'bg-amber-500 text-white' : 
                            type === 'standard' ? 'bg-blue-500 text-white' : 
                            type === 'photobooth2' ? 'bg-green-500 text-white' : 
                            type === 'avatar' ? 'bg-purple-500 text-white' : 'bg-gray-500 text-white'}
                        `}
                      >
                        {type === 'premium' ? 'Premium' : 
                         type === 'standard' ? 'Standard' : 
                         type === 'photobooth2' ? 'MiniMax' : 
                         type === 'avatar' ? 'Avatar IA' : type}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                  <button
                    onClick={() => openStyleDetailsModal(collection)}
                    className="text-xs font-medium text-gray-600 hover:text-gray-800 flex items-center"
                  >
                    Détails
                    <RiArrowRightSLine className="ml-1 w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Modal de détails des styles */}
      {isModalOpen && selectedCollection && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl overflow-hidden w-full max-w-4xl transform transition-all">
            <div className="relative">
              {/* Header avec image de couverture et titre */}
              <div className="h-40 bg-gradient-to-r from-indigo-600 to-purple-600 relative overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-40"
                  style={{ backgroundImage: `url(${selectedCollection.image})` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6 text-white">
                  <h3 className="text-2xl font-bold">{selectedCollection.name}</h3>
                  <p className="text-gray-200 text-sm mt-1">{selectedCollection.description}</p>
                </div>
                {/* Bouton de fermeture */}
                <button
                  onClick={closeStyleDetailsModal}
                  className="absolute top-4 right-4 bg-black bg-opacity-40 rounded-full p-2 text-white hover:bg-opacity-60 transition-all"
                >
                  <RiCloseLine className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-white">
                    <span className="text-gray-300">{selectedCollection.styles.length} styles disponibles</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto p-2">
                  {selectedCollection.styles.map((style, index) => (
                    <div
                      key={style.style_key}
                      className="relative bg-gray-800 rounded-xl overflow-hidden transition-all border border-gray-700"
                    >
                      {/* Aperçu du style */}
                      <div className="h-56">
                        {style.preview_image ? (
                          <img
                            src={style.preview_image}
                            alt={style.name}
                            className="w-full h-full object-cover transition-transform hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://leeveostockage.s3.eu-west-3.amazonaws.com/style/placeholder-style.png';
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gray-700">
                            <span className="text-gray-400">Aucune image</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 text-white">
                        <h4 className="font-medium text-md">{style.name}</h4>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{style.description}</p>
                        {/* Affichage des tags individuels */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(style.tags || []).map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                                tag === 'homme'
                                  ? 'bg-blue-600/30 text-blue-300 border border-blue-600'
                                  : tag === 'femme'
                                  ? 'bg-pink-600/30 text-pink-300 border border-pink-600'
                                  : 'bg-purple-600/30 text-purple-300 border border-purple-600'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-900 px-6 py-4 flex justify-end">
                <button
                  type="button"
                  onClick={closeStyleDetailsModal}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}