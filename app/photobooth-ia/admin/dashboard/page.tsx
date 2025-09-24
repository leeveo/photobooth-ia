'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseClient } from '../../../../lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { RiFolder2Line, RiCamera2Line, RiRefreshLine, RiArrowRightSLine, RiPaletteLine, RiFilter3Line, RiCloseLine, RiInformationLine, RiPieChart2Line } from 'react-icons/ri';
import Loader from '../../../components/ui/Loader';
import QuotaDisplay from '../../../../components/QuotaDisplay';
import HairstyleShowcase from '../../../../components/HairstyleShowcase';
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
  userId?: string; // Support legacy
}

export default function Dashboard() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addonSuccessMessage, setAddonSuccessMessage] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalSessions: 0,
    totalPhotos: 0,
    recentSessions: [] as any[]
  });
  // Suppression des états non utilisés pour optimiser les performances
  // const [projects, setProjects] = useState<any[]>([]);
  // const [sessions, setSessions] = useState<any[]>([]);
  // const [projectsWithPhotoCount, setProjectsWithPhotoCount] = useState<Record<string, number>>({});
  
  // Pour la bibliothèque de styles
  const [selectedStyleCategory, setSelectedStyleCategory] = useState<string | null>(null);
  const [expandedCollections, setExpandedCollections] = useState({});
  // État pour le modal de détails des styles
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{ 
    quota: number, 
    used: number, 
    resetAt: string | null,
    addonPurchases?: any[],
    baseQuota?: number,
    addonPhotos?: number
  }>({ quota: 0, used: 0, resetAt: null });
  
  // Ajoute un nouvel état pour le nombre de photos prises sur la période de quota
  const [photosThisPeriod, setPhotosThisPeriod] = useState(0);
  const [baseUrl, setBaseUrl] = useState('');

  // Function to get the base URL dynamically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      setBaseUrl(`${url.protocol}//${url.host}`);
    } else {
      setBaseUrl(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    }
  }, []);

  // Vérifier les paramètres URL pour les messages de succès
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('addon_success') === 'true') {
        setAddonSuccessMessage('🎉 Pack de photos acheté avec succès ! Votre quota a été mis à jour.');
        // Nettoyer l'URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [currentAdminId]);

  // Construction de l'URL du photobooth à partir du baseUrl, du type et du slug du projet
  const getPhotoboothUrl = (project: any) => {
    if (!project?.slug || !project?.photobooth_type || !baseUrl) return '';
    return `${baseUrl}/photobooth-${project.photobooth_type}/${project.slug}`;
  };

  // Fonction pour vérifier la session (OAuth + session locale)
  const getValidAdminSession = async () => {
    try {
      // 1. Vérifier session locale d'abord
      const sessionStr = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
      
      if (sessionStr) {
        let decodedSession = sessionStr;
        try {
          decodedSession = atob(sessionStr);
        } catch (e) {
          // Session déjà décodée
        }
        
        const sessionData = JSON.parse(decodedSession) as SessionData;
        
        if (!sessionData.user_id && sessionData.userId) {
          sessionData.user_id = sessionData.userId;
        }
        
        if (sessionData.user_id) {
          return sessionData;
        }
      }

      // 2. Vérifier session OAuth Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        return null;
      }
      
      if (session?.user) {
        // Appeler RPC pour créer/récupérer le profil admin
        const { data: adminData, error: adminError } = await supabase.rpc(
          'handle_google_admin_auth',
          { 
            google_id: session.user.id,
            admin_email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || '',
            first_name: session.user.user_metadata?.given_name || '',
            last_name: session.user.user_metadata?.family_name || ''
          }
        );
        
        if (adminError) {
          return null;
        }
        
        if (adminData?.success) {
          // Créer session admin
          const newSessionData = {
            userId: adminData.user_id,
            user_id: adminData.user_id,
            email: adminData.email,
            company_name: adminData.company_name || '',
            logged_in: true,
            login_method: 'google',
            login_time: new Date().toISOString(),
            google_id: session.user.id
          };
          
          // Sauvegarder la session
          const encodedSession = btoa(JSON.stringify(newSessionData));
          localStorage.setItem('admin_session', encodedSession);
          sessionStorage.setItem('admin_session', encodedSession);
          
          return newSessionData;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // Récupérer l'ID de l'admin connecté
  useEffect(() => {
    const getAdminSession = async () => {
      try {
        // Première tentative
        let sessionData = await getValidAdminSession();
        
        // Si aucune session trouvée, attendre un peu et réessayer (utile après OAuth callback)
        if (!sessionData) {
          console.log("🔄 Aucune session trouvée, retry dans 1 seconde...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          sessionData = await getValidAdminSession();
        }
        
        if (!sessionData) {
          console.log("❌ Aucune session trouvée après retry, redirection login");
          router.push('/photobooth-ia/admin/login');
          return;
        }
        
        console.log("✅ Session valide trouvée:", sessionData.email);
        setCurrentAdminId(sessionData.user_id!);
        setCurrentAdminEmail(sessionData.email!);
        
      } catch (err) {
        console.error("❌ Erreur lors de la vérification de session:", err);
        router.push('/photobooth-ia/admin/login');
      }
    };
    
    getAdminSession();
  }, [router]);
  
  // Fonction optimisée pour charger les données du dashboard
  const fetchDashboardData = useCallback(async () => {
    console.log("📊 fetchDashboardData démarré, currentAdminId:", currentAdminId);
    console.log("📊 fetchDashboardData démarré, currentAdminEmail:", currentAdminEmail);
    
    if (!currentAdminId || !currentAdminEmail) {
      console.log("❌ Pas d'admin ID ou email, retour");
      return;
    }
    
    setLoading(true);
    
    try {
      console.log("🔍 Requête projets Supabase...");
      console.log("🔍 Recherche pour currentAdminId:", currentAdminId);
      console.log("🔍 Type de currentAdminId:", typeof currentAdminId);
      
      // SOLUTION TEMPORAIRE : Tester avec tous les projets d'abord pour voir la structure
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, created_by, name')
        .limit(5);

      console.log("📊 Résultat projets:", { projectsData, projectsError });
      console.log("📊 ProjectsError type:", typeof projectsError);
      console.log("📊 ProjectsError keys:", projectsError ? Object.keys(projectsError) : "null");
      
      // FORCER L'AFFICHAGE DE L'ERREUR
      if (projectsError) {
        console.log("🚨 ERREUR FORCÉE - Code:", projectsError.code);
        console.log("🚨 ERREUR FORCÉE - Message:", projectsError.message);
        console.log("🚨 ERREUR FORCÉE - Details:", projectsError.details); 
        console.log("🚨 ERREUR FORCÉE - Hint:", projectsError.hint);
      }

      if (projectsError) {
        console.error("❌ Erreur projets Supabase:", projectsError);
        console.error("❌ Code erreur:", projectsError.code);
        console.error("❌ Message erreur:", projectsError.message);
        console.error("❌ Détails erreur:", projectsError.details);
        console.error("❌ Hint erreur:", projectsError.hint);
        console.error("❌ Erreur complète:", JSON.stringify(projectsError, null, 2));
        throw projectsError;
      }

      const projectIds = projectsData?.map((p: any) => p.id) || [];
      console.log("🆔 Project IDs extraits:", projectIds);

      console.log("🔄 Requêtes parallèles en cours...");
      // Exécuter les requêtes en parallèle pour améliorer les performances
      const [projectsCountResult, totalPhotosResult] = await Promise.all([
        // Compter le total des projets
        Promise.resolve({ count: projectIds.length }),
        
        // Compter toutes les photos si on a des projets
        projectIds.length > 0 
          ? supabase
              .from('sessions')
              .select('id', { count: 'exact', head: true })
              .in('project_id', projectIds)
          : Promise.resolve({ count: 0 })
      ]);

      console.log("📈 Résultats requêtes:", { projectsCountResult, totalPhotosResult });

      // Récupérer les statistiques
      const totalProjects = projectsCountResult.count || 0;
      const totalPhotos = totalPhotosResult.count || 0;
      
      console.log("📊 Stats calculées:", { totalProjects, totalPhotos });

      // Simplifier : on ne récupère plus les projets individuels pour éviter la lenteur
      const newStats = {
        totalProjects,
        activeProjects: totalProjects, // Approximation acceptable pour les performances
        totalSessions: 0, // Plus utilisé
        totalPhotos,
        recentSessions: [] // Plus utilisé
      };
      
      console.log("📊 Stats finales à définir:", newStats);
      setStats(newStats);
      console.log("✅ fetchDashboardData terminé avec succès !");

    } catch (error) {
      console.error("💥 Erreur fetchDashboardData:", error);
      console.error("💥 Détails erreur:", JSON.stringify(error, null, 2));
      setError('Erreur lors du chargement des données du tableau de bord');
    } finally {
      setLoading(false);
    }
  }, [currentAdminId, supabase]);
  
  // Appeler fetchDashboardData quand currentAdminId change
  useEffect(() => {
    if (currentAdminId) {
      fetchDashboardData();
    }
  }, [currentAdminId, fetchDashboardData]);
  
  // Function to get photobooth type label
  const getPhotoboothTypeLabel = (type: string) => {
    switch (type) {
      case 'premium':
        return 'Premium';
      case 'photobooth2':
        return 'MiniMax';
      default:
        return 'Standard';
    }
  };

  // Fonction pour ouvrir le modal avec la collection sélectionnée
  const openStyleDetailsModal = (collection: any) => {
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

  // Optimisation du useEffect de quota - version simplifiée et plus rapide
  useEffect(() => {
    async function fetchQuotaAndPhotos() {
      if (!currentAdminId) return;

      try {
        // Exécuter toutes les requêtes en parallèle pour optimiser les performances
        const [paymentResult, adminResult, projectsResult, addonResult] = await Promise.all([
          // 1. Récupérer le quota et la date de reset du dernier paiement ACTIF
          supabase
            .from('admin_payments')
            .select('photo_quota, photo_quota_reset_at')
            .eq('admin_user_id', currentAdminId)
            .eq('status', 'succeeded')
            .in('stripe_subscription_status', ['active', 'trialing'])
            .gte('quota_expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          
          // 2. Récupérer la date de création admin en parallèle
          supabase
            .from('admin_users')
            .select('created_at')
            .eq('id', currentAdminId)
            .single(),
          
          // 3. Récupérer les IDs des projets
          supabase
            .from('projects')
            .select('id')
            .eq('created_by', currentAdminId),
          
          // 4. Récupérer les achats addon
          supabase
            .from('addon_purchases')
            .select('addon_value')
            .eq('admin_user_id', currentAdminId)
            .eq('status', 'completed')
        ]);

        let quota = 3; // Quota gratuit par défaut
        let resetAt = adminResult.data?.created_at || new Date().toISOString();

        if (!paymentResult.error && paymentResult.data) {
          // Utilisateur payant
          quota = paymentResult.data.photo_quota || 0;
          resetAt = paymentResult.data.photo_quota_reset_at || resetAt;
        }

        // Calculer le total des photos addon
        const totalAddonPhotos = addonResult.data?.reduce((total: number, purchase: any) => {
          return total + (purchase.addon_value || 0);
        }, 0) || 0;

        // Quota total = quota de base + photos addon
        const totalQuota = quota + totalAddonPhotos;

        // Compter les sessions depuis le reset (une seule requête optimisée)
        const projectIds = projectsResult.data?.map((p: any) => p.id) || [];
        
        let photosUsed = 0;
        if (projectIds.length > 0) {
          const { count } = await supabase
            .from('sessions')
            .select('id', { count: 'exact', head: true })
            .in('project_id', projectIds)
            .gte('created_at', resetAt);
          
          photosUsed = count || 0;
        }

        setQuotaInfo({
          quota: totalQuota,
          used: photosUsed,
          resetAt,
          addonPurchases: [], // Simplifié pour éviter les requêtes supplémentaires
          baseQuota: quota,
          addonPhotos: totalAddonPhotos
        });
        setPhotosThisPeriod(photosUsed);

      } catch (error) {
        // Valeurs par défaut en cas d'erreur
        setQuotaInfo({
          quota: 3,
          used: 0,
          resetAt: new Date().toISOString(),
          baseQuota: 3,
          addonPhotos: 0
        });
      }
    }

    fetchQuotaAndPhotos();
    // Réduire la fréquence de mise à jour pour éviter la surcharge
    const interval = setInterval(fetchQuotaAndPhotos, 30000); // 30 secondes au lieu de 10
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
      {/* Message de succès addon */}
      {addonSuccessMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{addonSuccessMessage}</span>
          </div>
          <button 
            onClick={() => setAddonSuccessMessage(null)}
            className="text-green-600 hover:text-green-800"
          >
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>
      )}

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
          {/* Quota - Version simplifiée pour le header */}
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-3 flex items-center justify-center">
              <RiPieChart2Line className="h-10 w-10 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-white">
                <p className="text-sm font-medium text-white text-opacity-80">Quota disponible</p>
                <div className="flex items-center">
                  <span className="text-4xl font-bold">{quotaInfo.quota - quotaInfo.used}</span>
                  <span className="ml-2 text-sm text-white text-opacity-70">/ {quotaInfo.quota} photos</span>
                </div>
                <div className="text-xs text-white text-opacity-70 mt-1">
                  {(quotaInfo.baseQuota || 3) > 3 ? 'Plan payant' : 'Plan gratuit'} + {quotaInfo.addonPhotos || 0} addons
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bouton centré sous toutes les statistiques */}
        <div className="mt-8 flex items-center justify-center w-full">
          <Link
            href="/photobooth-ia/admin/choose-plan"
            className="group relative inline-flex items-center gap-4 px-8 py-5 rounded-3xl bg-gradient-to-r from-white/20 via-white/10 to-white/5 backdrop-blur-xl border border-white/30 shadow-2xl hover:shadow-purple-500/50 hover:scale-[1.05] transition-all duration-500 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
              boxShadow: '0 25px 45px -10px rgba(139, 92, 246, 0.3), 0 8px 25px -5px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            }}
          >
            {/* Effet de brillance animée */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            
            {/* Contenu */}
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400/40 to-blue-500/40 backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-inner">
                <svg className="w-6 h-6 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-xl drop-shadow-sm">Augmenter mon quota</span>
                <span className="text-white/80 text-sm font-medium">Débloquez plus de photos</span>
              </div>
            </div>
            
            {/* Flèche animée */}
            <div className="relative z-10 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:translate-x-2 group-hover:bg-white/30 transition-all duration-300 shadow-lg">
              <RiArrowRightSLine className="w-5 h-5 text-white drop-shadow-sm" />
            </div>
            
            {/* Particules flottantes */}
            <div className="absolute top-2 right-4 w-2 h-2 bg-white/40 rounded-full animate-pulse"></div>
            <div className="absolute bottom-3 left-6 w-1.5 h-1.5 bg-purple-300/60 rounded-full animate-pulse delay-300"></div>
            <div className="absolute top-1/2 right-8 w-1 h-1 bg-blue-300/50 rounded-full animate-pulse delay-700"></div>
          </Link>
        </div>
      </div>

      {/* Section Quota Détaillée */}
      <div className="bg-gray-50 rounded-xl p-1">
        <QuotaDisplay 
          adminId={currentAdminId} 
          onQuotaChange={(quotaStatus: any) => {
            // Optionnel : mise à jour des états locaux si nécessaire
          }}
        />
      </div>

      {/* Create Project Section */}
      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-green-800 mb-2">Prêt à créer un nouveau projet ?</h3>
            <p className="text-green-700 text-sm leading-relaxed">
              Lancez un nouveau photobooth IA en quelques clics. Personnalisez l'expérience, 
              configurez les styles et commencez à capturer des moments magiques.
            </p>
          </div>
          <div className="ml-6">
            <Link 
              href="/photobooth-ia/admin/projects/create" 
              className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-3 h-5 w-5 group-hover:rotate-90 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Créer un nouveau projet
              <RiArrowRightSLine className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>
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

      {/* Hairstyle Showcase Section */}
      <div className="mt-8">
        <HairstyleShowcase />
      </div>

      {/* Style Library Section */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <RiPaletteLine className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-medium text-gray-900">Bibliothèque de Styles IA</h3>
            </div>
            <div className="flex items-center">
              <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {(styleTemplatesData || []).length} collections
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
            
            {Array.from(new Set((styleTemplatesData || []).map(collection => collection.compatibleWith?.[0]).filter(Boolean))).map(category => (
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
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {(styleTemplatesData || [])
            .filter(collection => !selectedStyleCategory || collection.compatibleWith?.includes(selectedStyleCategory))
            .map(collection => (
              <div 
                key={collection.id} 
                className="group border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div 
                  className="relative h-36 w-full overflow-hidden cursor-pointer"
                  // Ouvre le popup de détails au clic sur l'image/encart du style
                  onClick={() => openStyleDetailsModal(collection)}
                >
                  {collection.image ? (
                    <Image
                      src={collection.image}
                      alt={collection.name}
                      fill
                      priority
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
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
                  {selectedCollection.styles.map((style: any, index: number) => (
                    <div
                      key={style.style_key}
                      className="relative bg-gray-800 rounded-xl overflow-hidden transition-all border border-gray-700"
                    >
                      {/* Aperçu du style */}
                      <div className="h-24">
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
                            <span className="text-gray-400 text-xs">Aucune image</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2 text-white">
                        <h4 className="font-medium text-sm">{style.name}</h4>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{style.description}</p>
                        {/* Affichage des tags individuels */}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(style.tags || []).map((tag: any, tagIndex: number) => (
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