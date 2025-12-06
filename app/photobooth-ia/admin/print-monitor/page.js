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
  
  // Réinitialiser lastImageId quand on change de projet
  useEffect(() => {
    if (selectedProject) {
      console.log('🔄 Changement de projet surveillé:', selectedProject);
      console.log('   ↳ Réinitialisation de lastImageId et lastImageTimestamp');
      setLastImageId(null);
      setLastImageTimestamp(null);
      setNewImages([]);
      setLastMonitoredImage(null);
    }
  }, [selectedProject]);
  
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pollingRef = useRef(null);
  const audioRef = useRef(null);

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
        
        console.log('🔍 Recherche images pour projet:', projectIdToQuery);
        
        // Charger uniquement depuis sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, result_s3_url, result_image_url, created_at, moderation')
          .eq('project_id', projectIdToQuery)
          .order('created_at', { ascending: false })
          .limit(100);

        if (sessionsError) {
          console.warn('⚠️ Erreur sessions:', sessionsError);
          setError('Erreur lors du chargement des images');
          return;
        }

        console.log('📊 Résultats bruts: sessions:', sessionsData?.length || 0);

        // Compteurs pour diagnostics
        let moderatedCount = 0;
        let noUrlCount = 0;
        let validCount = 0;

        // Charger les images depuis sessions
        const allImages = [];
        
        if (sessionsData && sessionsData.length > 0) {
          sessionsData.forEach(session => {
            // Skip les modérées
            if (session.moderation === 'M') {
              moderatedCount++;
              return;
            }
            
            const url = session.result_s3_url || session.result_image_url;
            if (url && url.trim() !== '' && url !== 'null' && url !== 'undefined') {
              validCount++;
              allImages.push({
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
        console.log('  ✅ Images valides:', validCount);
        console.log('  🚫 Images modérées:', moderatedCount);
        console.log('  ⚠️ Sans URL:', noUrlCount);
        console.log('  📈 Total brut:', sessionsData?.length || 0);

        // Trier par date (plus récent en premier)
        allImages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setAllProjectImages(allImages);
        console.log(`✅ Chargé ${allImages.length} images pour le projet ${selectedProject}`);
        
        // Initialiser la dernière image monitorée avec la plus récente du projet
        if (allImages.length > 0) {
          setLastMonitoredImage(allImages[0]);
          console.log('📸 Dernière image du projet définie:', allImages[0].id);
        }
        
        if (allImages.length === 0) {
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
  }, [selectedProject]); // ✅ Retirer supabase des dépendances (client stable)

  // Actualiser automatiquement la liste des images toutes les minutes
  useEffect(() => {
    if (!selectedProject) return;

    const refreshInterval = setInterval(() => {
      console.log('🔄 [AUTO-REFRESH] Actualisation automatique des images du projet');
      // Recharger les images du projet
      (async () => {
        try {
          const projectIdToQuery = String(selectedProject).trim();
          
          const { data: sessionsData, error: sessionsError } = await supabase
            .from('sessions')
            .select('id, result_s3_url, result_image_url, created_at, moderation')
            .eq('project_id', projectIdToQuery)
            .order('created_at', { ascending: false })
            .limit(100);

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
  }, [selectedProject, supabase]);

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
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <RiImageLine className="w-6 h-6 text-indigo-600" />
              Toutes les photos du projet ({allProjectImages.length})
            </h2>
            
            {loadingAllImages ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
                          <div className="w-16 h-16 relative rounded-lg overflow-hidden border-2 border-gray-200">
                            <Image
                              src={image.image_url}
                              alt="Photo"
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
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
                <span>Vous pouvez aussi imprimer manuellement en survolant une photo et en cliquant sur l&apos;icône</span>
              </li>
            </ol>
            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                💡 <strong>Astuce :</strong> Connectez votre imprimante à ce PC avant de démarrer.
                L&apos;impression se fera via le dialogue d&apos;impression standard de Windows.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
