'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { printImageToAirPrint } from '@/utils/clientPrint';
import { 
  RiPrinterLine, 
  RiPlayFill, 
  RiPauseFill, 
  RiCloseFill,
  RiCheckLine,
  RiErrorWarningLine,
  RiTimeLine,
  RiVolumeUpFill,
  RiVolumeMuteFill,
  RiImageLine,
  RiArrowLeftLine,
  RiSettings3Line
} from 'react-icons/ri';
import Loader from '@/app/components/ui/Loader';

export default function PrintMonitor() {
  // 🔍 DEBUG: Tracer les remontages du composant
  useEffect(() => {
    console.log('🏗️ [MOUNT] PrintMonitor component mounted/remounted');
    return () => {
      console.log('🔥 [UNMOUNT] PrintMonitor component unmounting');
    };
  }, []);

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoprint, setAutoprint] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newImages, setNewImages] = useState([]);
  const [printQueue, setPrintQueue] = useState([]);
  const [printHistory, setPrintHistory] = useState([]);
  const [lastImageId, setLastImageId] = useState(null);
  const [lastImageTimestamp, setLastImageTimestamp] = useState(null); // Nouveau: timestamp pour filtrage
  const [pollingInterval, setPollingInterval] = useState(5000); // 5 secondes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [allProjectImages, setAllProjectImages] = useState([]); // Toutes les images du projet
  const [loadingAllImages, setLoadingAllImages] = useState(false);
  const [lastMonitoredImage, setLastMonitoredImage] = useState(null); // Dernière image détectée
  const [previewImage, setPreviewImage] = useState(null); // Image en prévisualisation pop-up
  const [currentPage, setCurrentPage] = useState(1);
  const [totalImages, setTotalImages] = useState(0);
  const [totalValidImages, setTotalValidImages] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const [kioskModeWarning, setKioskModeWarning] = useState(false); // Alerte mode kiosque
  
  // Réinitialiser lastImageId quand on change de projet
  useEffect(() => {
    if (selectedProject) {
      console.log('🔄 Changement de projet surveillé:', selectedProject);
      console.log('   ↳ Réinitialisation de lastImageId et lastImageTimestamp');
      setLastImageId(null);
      setLastImageTimestamp(null);
      setNewImages([]);
      setLastMonitoredImage(null);
      setCurrentPage(1);
      setTotalValidImages(0);
    }
  }, [selectedProject]);
  
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pollingRef = useRef(null);
  const audioRef = useRef(null);

  // ⚠️ Détecter le mode kiosque au chargement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isKioskMode = window.matchMedia('(display-mode: fullscreen)').matches;
      const hasKioskFlag = window.location.search.includes('kiosk=true');
      
      console.log('🔍 Vérification mode kiosque:', { isKioskMode, hasKioskFlag });
      
      // Afficher l'alerte seulement si l'autoprint est activé ET on n'est pas en kiosque
      if (!isKioskMode && !hasKioskFlag) {
        setKioskModeWarning(true);
        console.warn('⚠️ Mode kiosque non détecté - Les popups d\'impression peuvent être bloqués');
      }
    }
  }, []);

  // Récupérer l'ID de l'admin connecté depuis le système custom
  useEffect(() => {
    const getAdminSession = async () => {
      try {
        // Récupérer la session depuis localStorage (système custom)
        const sessionData = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
        
        if (!sessionData) {
          console.log('❌ Pas de session trouvée, redirection vers login');
          router.push('/photobooth-ia/admin/login');
          return;
        }

        // Décoder la session
        let decodedSession;
        try {
          decodedSession = JSON.parse(atob(sessionData));
        } catch (decodeError) {
          console.error('Erreur décodage session:', decodeError);
          router.push('/photobooth-ia/admin/login');
          return;
        }

        const userId = decodedSession.userId || decodedSession.user_id;
        const userEmail = decodedSession.email;

        if (!userId || !userEmail) {
          console.log('❌ Session invalide (pas d\'userId ou email)');
          router.push('/photobooth-ia/admin/login');
          return;
        }

        console.log('✅ Session admin valide:', userEmail);
        setCurrentAdminId(userId);
      } catch (err) {
        console.error('Error getting admin session:', err);
        router.push('/photobooth-ia/admin/login');
      }
    };

    getAdminSession();
  }, [router]); // ✅ supabase client est stable

  // Charger les projets
  useEffect(() => {
    async function loadProjects() {
      if (!currentAdminId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, logo_url')
          .eq('created_by', currentAdminId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        setError('Erreur lors du chargement des projets');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [currentAdminId]); // ✅ supabase client est stable

  // Charger TOUTES les images du projet sélectionné
  useEffect(() => {
    async function loadAllProjectImages() {
      if (!selectedProject) {
        console.log('⏸️ Pas de projet sélectionné, skip chargement images');
        setAllProjectImages([]);
        return;
      }

      console.log('🔄 [useEffect] loadAllProjectImages déclenché pour projet:', selectedProject);

      setLoadingAllImages(true);
      try {
        const projectIdToQuery = String(selectedProject).trim();
        
        console.log('🔍 Recherche images pour projet:', projectIdToQuery, '- Page:', currentPage);
        
        // ÉTAPE 1: Charger TOUTES les sessions (sans limite) pour avoir le total
        const { data: allSessionsData, error: allSessionsError } = await supabase
          .from('sessions')
          .select('id, result_s3_url, result_image_url, created_at, moderation')
          .eq('project_id', projectIdToQuery)
          .order('created_at', { ascending: false });

        if (allSessionsError) {
          console.warn('⚠️ Erreur chargement sessions:', allSessionsError);
          setError('Erreur lors du chargement des images');
          return;
        }

        console.log('📊 Total sessions récupérées:', allSessionsData?.length || 0);

        // ÉTAPE 2: Filtrer et compter les images valides
        const validImages = [];
        let moderatedCount = 0;
        let noUrlCount = 0;
        
        if (allSessionsData && allSessionsData.length > 0) {
          allSessionsData.forEach(session => {
            // Skip les modérées
            if (session.moderation === 'M') {
              moderatedCount++;
              return;
            }
            
            const url = session.result_s3_url || session.result_image_url;
            if (url && url.trim() !== '' && url !== 'null' && url !== 'undefined') {
              validImages.push({
                id: `s_${session.id}`,
                image_url: url,
                created_at: session.created_at,
                status: 'existing',
                source: 'sessions'
              });
            } else {
              noUrlCount++;
            }
          });
        }
        
        console.log('📊 Filtrage détaillé:');
        console.log('  ✅ Images valides:', validImages.length);
        console.log('  🚫 Images modérées:', moderatedCount);
        console.log('  ⚠️ Sans URL:', noUrlCount);
        console.log('  📈 Total brut:', allSessionsData?.length || 0);

        // ÉTAPE 3: Définir le total d'images valides
        setTotalValidImages(validImages.length);
        console.log('📊 TOTAL VALIDÉ:', validImages.length);
        console.log('📄 Nombre de pages:', Math.ceil(validImages.length / ITEMS_PER_PAGE));
        
        // ÉTAPE 4: Extraire uniquement les images pour la page actuelle
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageImages = validImages.slice(startIndex, endIndex);
        
        console.log('🔢 Page', currentPage, '- Images:', startIndex, 'à', endIndex - 1, '(', pageImages.length, 'images)');

        // ÉTAPE 5: Mettre à jour l'état avec les images de la page
        setAllProjectImages(pageImages);
        
        console.log(`✅ Affichage page ${currentPage}/${Math.ceil(validImages.length / ITEMS_PER_PAGE)}`);
        console.log(`📊 Total: ${validImages.length} images - Affichées: ${pageImages.length}`);
        console.log(`🎯 Condition pagination: totalValidImages (${validImages.length}) > ITEMS_PER_PAGE (${ITEMS_PER_PAGE}) = ${validImages.length > ITEMS_PER_PAGE}`);
        
        // Initialiser la dernière image monitorée avec la plus récente du projet (uniquement page 1)
        if (currentPage === 1 && validImages.length > 0) {
          setLastMonitoredImage(validImages[0]);
          console.log('📸 Dernière image du projet définie:', validImages[0].id);
        }
        
        if (validImages.length === 0) {
          console.log('⚠️ Aucune image trouvée. Vérifiez:');
          console.log('  - Le project_id est correct:', projectIdToQuery);
          console.log('  - Les colonnes result_s3_url/result_image_url existent');
          console.log('  - Les images ne sont pas modérées (moderation != "M")');
        }
      } catch (err) {
        console.error('❌ Erreur chargement images:', err);
        setError('Erreur lors du chargement des images du projet');
      } finally {
        setLoadingAllImages(false);
      }
    }

    loadAllProjectImages();
  }, [selectedProject, currentPage]); // ✅ Recharger lors du changement de page

  // Actualiser automatiquement la liste des images toutes les minutes
  useEffect(() => {
    if (!selectedProject) return;

    const refreshInterval = setInterval(() => {
      console.log('🔄 [AUTO-REFRESH] Actualisation automatique des images du projet');
      // Recharger les images du projet
      (async () => {
        try {
          const projectIdToQuery = String(selectedProject).trim();
          
          const startRange = (currentPage - 1) * ITEMS_PER_PAGE;
          const endRange = startRange + ITEMS_PER_PAGE - 1;
          
          const { data: sessionsData, error: sessionsError } = await supabase
            .from('sessions')
            .select('id, result_s3_url, result_image_url, created_at, moderation')
            .eq('project_id', projectIdToQuery)
            .order('created_at', { ascending: false })
            .range(startRange, endRange);

          if (sessionsError) {
            console.warn('⚠️ Erreur refresh sessions:', sessionsError);
            return;
          }

          const allImages = [];
          
          if (sessionsData && sessionsData.length > 0) {
            sessionsData.forEach(session => {
              if (session.moderation === 'M') return;
              
              const url = session.result_s3_url || session.result_image_url;
              if (url && url.trim() !== '' && url !== 'null' && url !== 'undefined') {
                allImages.push({
                  id: `s_${session.id}`,
                  image_url: url,
                  created_at: session.created_at,
                  status: 'existing',
                  source: 'sessions'
                });
              }
            });
          }

          allImages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setAllProjectImages(allImages);
          console.log(`✅ [AUTO-REFRESH] ${allImages.length} images actualisées`);
        } catch (err) {
          console.error('❌ Erreur auto-refresh:', err);
        }
      })();
    }, 60000); // 60 secondes = 1 minute

    return () => clearInterval(refreshInterval);
  }, [selectedProject, currentPage, supabase]);

  // Fonction de notification sonore
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    if (!audioRef.current) {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVKns8bJiHgU7k9r0yoIzBipzxvLaizsIGGS57OihUQ0PUKXh8bllHwU5ktbz0YU0Bh9uwO/jmVENEFWr7PGxYh4FOpPZ9MqDMwYpcsPy2os7CBhkuezooVENEFCl4fG5ZR8FOpLW89GENgYfbsDv45lRDRBVq+zxsWIeBTqT2fTKgzMGKXLD8tqLOwgYZLns6KFRDRBQpeHxuWUfBTqS1vPRhDYGH27A7eSaUQwPVKvs8bFiHgU6k9n0yoM0Bilyw/Laiyw=');
    }
    
    audioRef.current.play().catch(e => console.log('Could not play sound:', e));
  }, [soundEnabled]);

  // Fonction pour récupérer les nouvelles images
  const checkForNewImages = useCallback(async () => {
    if (!selectedProject) return;

    try {
      const projectIdToQuery = String(selectedProject).trim();
      const allNewImages = [];
      
      // Requête pour les nouvelles images depuis sessions (ID = UUID, utiliser created_at)
      let query = supabase
        .from('sessions')
        .select('id, result_s3_url, result_image_url, created_at, moderation')
        .eq('project_id', projectIdToQuery)
        .order('created_at', { ascending: false })
        .limit(10);

      // Utiliser created_at pour filtrer au lieu de id (car id est UUID)
      if (lastImageTimestamp) {
        query = query.gt('created_at', lastImageTimestamp);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('⚠️ Erreur monitoring sessions:', error);
        return;
      }

      if (data && data.length > 0) {
        // Filtrer les images valides
        const validSessions = data.filter(session => {
          // Skip les modérées
          if (session.moderation === 'M') return false;
          
          const url = session.result_s3_url || session.result_image_url;
          return url && url.trim() !== '' && url !== 'null' && url !== 'undefined';
        });

        validSessions.forEach(session => {
          allNewImages.push({
            id: `s_${session.id}`,
            image_url: session.result_s3_url || session.result_image_url,
            created_at: session.created_at,
            status: 'pending',
            source: 'sessions'
          });
        });
      }

      // Traiter les nouvelles images trouvées
      if (allNewImages.length > 0) {
        // Trier par date (plus récent en premier)
        allNewImages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Notification sonore
        playNotificationSound();

        // Mettre à jour la dernière image monitorée
        setLastMonitoredImage(allNewImages[0]);
        console.log('🆕 Nouvelle image détectée pour le projet:', selectedProject, '- ID:', allNewImages[0].id, '- Source:', allNewImages[0].source);

        // Ajouter à la liste des nouvelles images
        setNewImages(prev => [...allNewImages, ...prev].slice(0, 50)); // Garder max 50 images

        // Si autoprint activé, ajouter à la queue d'impression
        if (autoprint) {
          setPrintQueue(prev => [...prev, ...allNewImages]);
        }

        // Mettre à jour le dernier ID ET timestamp avec la plus récente image
        setLastImageId(allNewImages[0].id);
        setLastImageTimestamp(allNewImages[0].created_at);
      }
    } catch (err) {
      console.error('Error checking for new images:', err);
    }
  }, [selectedProject, lastImageTimestamp, autoprint, playNotificationSound, supabase]);

  // Démarrer/arrêter le monitoring
  useEffect(() => {
    if (isMonitoring && selectedProject) {
      // Première vérification immédiate
      checkForNewImages();
      
      // Puis polling régulier
      pollingRef.current = setInterval(checkForNewImages, pollingInterval);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isMonitoring, selectedProject, pollingInterval, checkForNewImages]);

  // Fonction d'impression
  const printImage = useCallback(async (imageData) => {
    try {
      console.log('🖨️ [PRINT] Impression de l\'image:', imageData.id);
      
      // Utiliser la fonction printImageToAirPrint du fichier clientPrint.js
      await printImageToAirPrint(imageData.image_url);
      
      // Ajouter à l'historique
      setPrintHistory(prev => [{
        id: imageData.id,
        image_url: imageData.image_url,
        printed_at: new Date().toISOString(),
        status: 'success'
      }, ...prev].slice(0, 100)); // Garder max 100 entrées
      
      console.log('✅ [PRINT] Impression réussie');
      return true;
    } catch (error) {
      console.error('❌ [PRINT] Erreur impression:', error);
      
      // Ajouter à l'historique avec erreur
      setPrintHistory(prev => [{
        id: imageData.id,
        image_url: imageData.image_url,
        printed_at: new Date().toISOString(),
        status: 'error',
        error: error.message
      }, ...prev].slice(0, 100));
      
      return false;
    }
  }, []);

  // Process print queue
  useEffect(() => {
    if (printQueue.length > 0 && autoprint) {
      const nextImage = printQueue[0];
      
      // Imprimer l'image
      printImage(nextImage).then(() => {
        // Retirer de la queue
        setPrintQueue(prev => prev.slice(1));
      });
    }
  }, [printQueue, autoprint, printImage]);

  // Impression manuelle
  const handleManualPrint = useCallback((imageData) => {
    printImage(imageData);
  }, [printImage]);

  // Toggle monitoring
  const toggleMonitoring = useCallback(() => {
    if (!selectedProject) {
      setError('Veuillez sélectionner un projet');
      return;
    }
    setIsMonitoring(prev => !prev);
    setError(null);
  }, [selectedProject]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <RiPrinterLine className="w-8 h-8" />
                Monitoring d&apos;Impression Automatique
              </h1>
              <p className="text-white text-opacity-80 text-sm">
                Surveillez les nouvelles photos et imprimez-les automatiquement depuis votre PC
              </p>
            </div>
            <Link
              href="/photobooth-ia/admin/project-gallery"
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RiArrowLeftLine className="w-5 h-5" />
              Retour
            </Link>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <RiErrorWarningLine className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <RiSettings3Line className="w-6 h-6 text-indigo-600" />
            Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Projet à surveiller
              </label>
              <select
                value={selectedProject || ''}
                onChange={(e) => {
                  const newProjectId = e.target.value;
                  console.log('🎯 [SELECT onChange] Changement de projet:', {
                    ancien: selectedProject,
                    nouveau: newProjectId
                  });
                  setSelectedProject(newProjectId);
                  setLastImageId(null);
                  setNewImages([]);
                  setPrintQueue([]);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isMonitoring}
              >
                <option value="">Sélectionnez un projet</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Polling interval */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalle de vérification
              </label>
              <select
                value={pollingInterval}
                onChange={(e) => setPollingInterval(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isMonitoring}
              >
                <option value={3000}>3 secondes</option>
                <option value={5000}>5 secondes</option>
                <option value={10000}>10 secondes</option>
                <option value={30000}>30 secondes</option>
              </select>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <button
              onClick={toggleMonitoring}
              className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
                isMonitoring
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
              disabled={!selectedProject}
            >
              {isMonitoring ? (
                <>
                  <RiPauseFill className="w-5 h-5" />
                  Arrêter le monitoring
                </>
              ) : (
                <>
                  <RiPlayFill className="w-5 h-5" />
                  Démarrer le monitoring
                </>
              )}
            </button>

            <button
              onClick={() => setAutoprint(prev => !prev)}
              className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
                autoprint
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              disabled={!isMonitoring}
            >
              <RiPrinterLine className="w-5 h-5" />
              Impression auto: {autoprint ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className="px-6 py-3 rounded-lg font-medium flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 transition-all"
            >
              {soundEnabled ? (
                <>
                  <RiVolumeUpFill className="w-5 h-5" />
                  Son activé
                </>
              ) : (
                <>
                  <RiVolumeMuteFill className="w-5 h-5" />
                  Son désactivé
                </>
              )}
            </button>
          </div>

          {/* Status indicators */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{newImages.length}</div>
              <div className="text-sm text-gray-600">Nouvelles photos</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{printQueue.length}</div>
              <div className="text-sm text-gray-600">En attente</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {printHistory.filter(h => h.status === 'success').length}
              </div>
              <div className="text-sm text-gray-600">Imprimées</div>
            </div>
          </div>
        </div>

        {/* ⚠️ ALERTE MODE KIOSQUE */}
        {kioskModeWarning && autoprint && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-xl shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <RiErrorWarningLine className="w-10 h-10 text-yellow-600 animate-bounce" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-yellow-900 mb-2 flex items-center gap-2">
                  ⚠️ Mode kiosque non détecté
                </h3>
                <p className="text-yellow-800 mb-3">
                  Votre navigateur n&apos;est pas en mode kiosque. Les popups d&apos;impression seront <strong>probablement bloqués</strong>.
                </p>
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-3">
                  <p className="text-sm text-yellow-900 font-semibold mb-2">
                    📋 Solution : Utilisez le script de lancement automatique
                  </p>
                  <p className="text-xs text-yellow-800">
                    Fermez toutes les fenêtres Chrome et double-cliquez sur le fichier <code className="bg-yellow-200 px-1 rounded">start-photobooth-silent.bat</code>
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setKioskModeWarning(false)}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    J&apos;ai compris
                  </button>
                  <a
                    href="/start-photobooth-silent.bat"
                    download
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                  >
                    📥 Télécharger le script
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dernière photo monitorée */}
        {lastMonitoredImage && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-6 border-2 border-indigo-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-600 rounded-full p-3 animate-pulse">
                <RiImageLine className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  Dernière photo détectée
                </h2>
                <p className="text-sm text-indigo-600">
                  {new Date(lastMonitoredImage.created_at).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-center">
              {/* Image preview */}
              <div className="relative group flex-shrink-0">
                <div className="w-64 h-64 relative rounded-xl overflow-hidden border-4 border-white shadow-2xl">
                  <Image
                    src={lastMonitoredImage.image_url}
                    alt="Dernière photo"
                    fill
                    className="object-cover"
                    sizes="256px"
                  />
                </div>
                <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  NOUVEAU
                </div>
              </div>

              {/* Actions */}
              <div className="flex-1 space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-md">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">URL de l&apos;image</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded max-w-xs truncate" title={lastMonitoredImage.image_url}>
                        {lastMonitoredImage.image_url}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(lastMonitoredImage.image_url);
                      }}
                      className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors text-xs font-medium flex-shrink-0"
                      title="Copier l'URL"
                    >
                      📋 Copier
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleManualPrint(lastMonitoredImage)}
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-2xl transform hover:scale-105"
                >
                  <RiPrinterLine className="w-6 h-6" />
                  Imprimer cette photo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tableau de TOUTES les images du projet */}
        {selectedProject && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <RiImageLine className="w-6 h-6 text-indigo-600" />
                  Toutes les photos du projet {loadingAllImages ? (
                    <span className="text-sm font-normal text-gray-500 animate-pulse">
                      Chargement...
                    </span>
                  ) : (
                    <span className="text-sm font-normal text-gray-500">
                      ({totalValidImages} {totalValidImages > 1 ? 'photos' : 'photo'})
                    </span>
                  )}
                </h2>
              </div>
              
              {/* Contrôles de pagination EN HAUT */}
              {!loadingAllImages && totalValidImages > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-center gap-3 mt-4 p-4 bg-gray-50 rounded-lg">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md disabled:bg-gray-400"
                  >
                    ← Précédent
                  </button>
                  <span className="text-base text-gray-700 font-bold px-4 py-2 bg-white rounded-lg shadow-sm">
                    Page {currentPage} / {Math.ceil(totalValidImages / ITEMS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalValidImages / ITEMS_PER_PAGE), prev + 1))}
                    disabled={currentPage >= Math.ceil(totalValidImages / ITEMS_PER_PAGE)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md disabled:bg-gray-400"
                  >
                    Suivant →
                  </button>
                </div>
              )}
            </div>
            
            {loadingAllImages ? (
              <div className="flex justify-center items-center py-16">
                <Loader size="large" message="Chargement des photos du projet..." variant="premium" />
              </div>
            ) : allProjectImages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <RiImageLine className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Aucune photo disponible pour ce projet</p>
                <p className="text-sm mt-2">Les photos apparaîtront ici dès qu&apos;elles seront générées</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aperçu
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID Session
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date et Heure
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        URL Image
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allProjectImages.map((image) => (
                      <tr key={image.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-16 h-16 relative rounded-lg overflow-hidden border-2 border-gray-200 group cursor-pointer"
                               onClick={() => setPreviewImage(image)}>
                            <Image
                              src={image.image_url}
                              alt="Photo"
                              fill
                              className="object-cover transition-transform group-hover:scale-110"
                              sizes="64px"
                            />
                            {/* Overlay avec icône œil */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center">
                              <svg 
                                className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  strokeWidth={2} 
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                                />
                                <path 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  strokeWidth={2} 
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
                                />
                              </svg>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">
                              #{image.id}
                            </div>
                            {image.source && (
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                image.source === 'project_images' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {image.source === 'project_images' ? 'PI' : 'S'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(image.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(image.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-600 font-mono max-w-xs truncate" title={image.image_url}>
                            {image.image_url}
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(image.image_url);
                              setError(null);
                              const tempSuccess = 'URL copiée !';
                              setError(tempSuccess);
                              setTimeout(() => setError(null), 2000);
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                          >
                            📋 Copier l&apos;URL
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleManualPrint(image)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg transform hover:scale-105"
                              title="Imprimer cette photo"
                            >
                              <RiPrinterLine className="w-4 h-4" />
                              Imprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Contrôles de pagination EN BAS */}
            {!loadingAllImages && totalValidImages > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-center gap-3 mt-6 p-4 bg-gray-50 rounded-lg">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md disabled:bg-gray-400"
                >
                  ← Précédent
                </button>
                <span className="text-base text-gray-700 font-bold px-4 py-2 bg-white rounded-lg shadow-sm">
                  Page {currentPage} / {Math.ceil(totalValidImages / ITEMS_PER_PAGE)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalValidImages / ITEMS_PER_PAGE), prev + 1))}
                  disabled={currentPage >= Math.ceil(totalValidImages / ITEMS_PER_PAGE)}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md disabled:bg-gray-400"
                >
                  Suivant →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Print History */}
        {printHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <RiTimeLine className="w-6 h-6 text-indigo-600" />
              Historique d&apos;impression
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {printHistory.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    item.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.status === 'success' ? (
                      <RiCheckLine className="w-5 h-5 text-green-600" />
                    ) : (
                      <RiErrorWarningLine className="w-5 h-5 text-red-600" />
                    )}
                    <div className="w-12 h-12 relative rounded overflow-hidden">
                      <Image
                        src={item.image_url}
                        alt="Printed"
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Photo #{item.id}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.printed_at).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  {item.error && (
                    <div className="text-xs text-red-600">{item.error}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isMonitoring && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              📖 Instructions d&apos;utilisation
            </h3>
            
            {/* Mode Standard */}
            <div className="mb-6">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">MODE STANDARD</span>
                Surveillance manuelle
              </h4>
              <ol className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>Sélectionnez le projet à surveiller dans la liste déroulante</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>Cliquez sur &quot;Démarrer le monitoring&quot; pour commencer la surveillance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>Activez &quot;Impression auto&quot; pour imprimer automatiquement chaque nouvelle photo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">4.</span>
                  <span>Les nouvelles photos apparaîtront en temps réel avec une notification sonore</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">5.</span>
                  <span>Vous pouvez aussi imprimer manuellement en cliquant sur le bouton &quot;Imprimer&quot;</span>
                </li>
              </ol>
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Limitation :</strong> En mode standard, vous devez valider manuellement chaque impression dans la boîte de dialogue Windows.
                </p>
              </div>
            </div>

            {/* Mode Kiosque */}
            <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">MODE KIOSQUE (RECOMMANDÉ)</span>
                Impression 100% automatique et silencieuse
              </h4>
              <p className="text-sm text-green-800 mb-3">
                Pour une impression totalement automatique <strong>sans aucune confirmation</strong>, utilisez le script de lancement en mode kiosque :
              </p>
              <ol className="space-y-2 text-sm text-green-800 mb-3">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>Téléchargez le script <code className="bg-green-100 px-2 py-1 rounded font-mono text-xs">start-photobooth-silent.bat</code> ci-dessous</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>Enregistrez-le sur le bureau ou dans un dossier accessible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>Fermez toutes les fenêtres Chrome</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">4.</span>
                  <span><strong>Double-cliquez sur le fichier .bat</strong> (ne l&apos;ouvrez PAS avec un éditeur)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">5.</span>
                  <span>Chrome s&apos;ouvrira automatiquement en mode kiosque avec cette page</span>
                </li>
              </ol>
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>⚠️ Important :</strong> Si le fichier s&apos;ouvre dans un éditeur au lieu de s&apos;exécuter, 
                  faites un <strong>clic droit sur le fichier .bat</strong> → <strong>&quot;Exécuter en tant qu&apos;administrateur&quot;</strong> ou 
                  vérifiez que Windows n&apos;associe pas les fichiers .bat à Chrome.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/start-photobooth-silent.bat"
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Télécharger le script Kiosque
                </a>
                <span className="text-xs text-green-700">
                  ✓ Prêt à l'emploi<br/>
                  ✓ Impression silencieuse<br/>
                  ✓ Plein écran automatique
                </span>
              </div>
              <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                <p className="text-xs text-green-800">
                  <strong>💡 Comment ça marche ?</strong> Le script est déjà configuré pour ouvrir cette page en mode kiosque. 
                  Il lance Chrome uniquement pour cette URL. Vos autres sites et fenêtres Chrome ne sont pas affectés. 
                  Pour quitter le mode kiosque, appuyez sur <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">ALT + F4</kbd>.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                💡 <strong>Astuce :</strong> Connectez votre imprimante à ce PC et définissez-la comme imprimante par défaut dans Windows avant de démarrer.
              </p>
            </div>
          </div>
        )}

        {/* Pop-up de prévisualisation d'image */}
        {previewImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-[99999] flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center">
              {/* Bouton fermer */}
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 z-10 bg-white hover:bg-gray-100 text-gray-800 rounded-full p-3 shadow-2xl transition-all transform hover:scale-110 group"
                title="Fermer"
              >
                <svg 
                  className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </button>

              {/* Image en grand */}
              <div className="relative w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="relative max-w-full max-h-full">
                  <Image
                    src={previewImage.image_url}
                    alt="Aperçu"
                    width={1200}
                    height={1200}
                    className="object-contain max-h-[80vh] w-auto h-auto rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Informations de l'image */}
                <div className="bg-white bg-opacity-95 rounded-lg p-4 shadow-xl max-w-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">ID:</span>
                      <span className="text-gray-600">#{previewImage.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">Date:</span>
                      <span className="text-gray-600">
                        {new Date(previewImage.created_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManualPrint(previewImage);
                      }}
                      className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      <RiPrinterLine className="w-4 h-4" />
                      Imprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
