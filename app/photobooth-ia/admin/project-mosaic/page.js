'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQRCode } from 'next-qrcode';

export default function ProjectMosaic() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const wantsFullscreen = searchParams.get('fullscreen') === 'true';
  const { Canvas } = useQRCode();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenButton, setShowFullscreenButton] = useState(false);
  const [projectDetails, setProjectDetails] = useState(null);
  const [projectImages, setProjectImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date()); // Pour suivre le dernier rafraîchissement
  const [displayLimit, setDisplayLimit] = useState(50); // Limite d'affichage par défaut
  const [hasMoreImages, setHasMoreImages] = useState(false); // Indique s'il y a plus d'images à charger
  const [lastKnownCount, setLastKnownCount] = useState(0); // Cache du nombre total d'images
  const [loadingMore, setLoadingMore] = useState(false); // État pour le chargement de plus d'images
  const [mosaicSettings, setMosaicSettings] = useState({
    bg_color: '#000000',
    bg_image_url: '',
    title: '',
    description: '',
    show_qr_code: false,
    qr_title: 'Scannez-moi',
    qr_description: 'Retrouvez toutes les photos ici',
    qr_position: 'center'
  });
  
  const supabase = createClientComponentClient();
  const realtimeChannel = useRef(null);
  const refreshInterval = useRef(null); // Référence pour l'intervalle de rafraîchissement
  
  // Add this to display the mosaic URL
  const mosaicUrl = typeof window !== 'undefined' ? 
    `${window.location.origin}/photobooth-ia/admin/project-mosaic?projectId=${projectId}` : '';
  
  // Background style based on settings (utilise bg_image_url ou bg_color de mosaic_settings)
  const getBackgroundStyle = () => {
    if (mosaicSettings.bg_image_url) {
      return {
        backgroundImage: `url(${mosaicSettings.bg_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: mosaicSettings.bg_color // fallback si image non chargée
      };
    }
    return { backgroundColor: mosaicSettings.bg_color };
  };

  // Charger les détails du projet et les paramètres de mosaïque à chaque affichage
  useEffect(() => {
    if (!projectId) return;

    async function loadProjectDataAndSettings() {
      try {
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, slug, description')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;
        setProjectDetails(projectData);

        // Fetch mosaic settings à chaque affichage (toujours frais)
        const { data: settingsData, error: settingsError } = await supabase
          .from('mosaic_settings')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle();

        if (settingsError) {
          console.error('Erreur lors du chargement des paramètres de mosaïque:', settingsError);
        }

        if (settingsData) {
          setMosaicSettings({
            bg_color: settingsData.bg_color || '#000000',
            bg_image_url: settingsData.bg_image_url || '',
            title: settingsData.title || projectData.name || '',
            description: settingsData.description || '',
            show_qr_code: settingsData.show_qr_code || false,
            qr_title: settingsData.qr_title || 'Scannez-moi',
            qr_description: settingsData.qr_description || 'Retrouvez toutes les photos ici',
            qr_position: settingsData.qr_position || 'center'
          });
        } else {
          setMosaicSettings(prev => ({
            ...prev,
            title: projectData.name || ''
          }));
        }
      } catch (err) {
        console.error('Erreur lors du chargement du projet ou des paramètres:', err);
        setError('Impossible de charger les détails du projet');
      }
    }

    loadProjectDataAndSettings();
  }, [projectId, supabase, /* Ajoute un trigger sur reload si besoin */]);
  
  // Charger les paramètres de mosaïque à chaque changement de projectId
  useEffect(() => {
    if (!projectId) return;

    async function loadMosaicSettingsAndProject() {
      try {
        // Charger les paramètres de mosaïque
        const { data: settingsData } = await supabase
          .from('mosaic_settings')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle();

        // Charger les infos projet (pour fallback du titre)
        const { data: projectData } = await supabase
          .from('projects')
          .select('id, name, slug, description')
          .eq('id', projectId)
          .single();

        setMosaicSettings({
          bg_color: settingsData?.bg_color || '#000000',
          bg_image_url: settingsData?.bg_image_url || '',
          title: settingsData?.title || projectData?.name || '',
          description: settingsData?.description || '',
          show_qr_code: settingsData?.show_qr_code || false,
          qr_title: settingsData?.qr_title || 'Scannez-moi',
          qr_description: settingsData?.qr_description || 'Retrouvez toutes les photos ici',
          qr_position: settingsData?.qr_position || 'center'
        });
      } catch (err) {
        setError('Impossible de charger les paramètres de la mosaïque');
      }
    }

    loadMosaicSettingsAndProject();
  }, [projectId, supabase]);
  
  // Fonction pour charger les images (extraite pour réutilisation)
  const loadSessionImages = async (limit = displayLimit, skipCountCheck = false) => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      // Vérifier d'abord s'il y a de nouvelles images (optimisation)
      let count = lastKnownCount;
      if (!skipCountCheck) {
        const { count: currentCount } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .is('moderation', null);
        
        count = currentCount || 0;
        setLastKnownCount(count);
        
        // Si le nombre d'images n'a pas changé et qu'on ne charge pas plus d'images, ne pas recharger
        if (count === lastKnownCount && limit === displayLimit && projectImages.length > 0) {
          console.log('Aucune nouvelle image détectée, pas de rechargement nécessaire');
          setLoading(false);
          return;
        }
      }

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, result_s3_url, result_image_url, created_at, moderation')
        .eq('project_id', projectId)
        .is('moderation', null)  // Ne sélectionner que les images non modérées
        .order('created_at', { ascending: false }) // Tri décroissant pour avoir les plus récentes en premier
        .limit(limit); // Limiter le nombre d'images chargées

      if (sessionsError) {
        console.error('Erreur lors du chargement des images:', sessionsError);
        setProjectImages([]);
        setHasMoreImages(false);
      } else {
        const images = (sessionsData || [])
          .map(session => ({
            id: session.id,
            image_url: session.result_s3_url || session.result_image_url,
            created_at: session.created_at,
            metadata: {
              fileName: session.result_s3_url ? session.result_s3_url.split('/').pop() : '',
              size: null
            }
          }))
          .filter(img => img.image_url); // Vérifier que l'image a une URL valide
      
        setProjectImages(images);
        setHasMoreImages(count > limit);
        setLastRefresh(new Date());
        console.log(`Rafraîchissement: ${images.length} images chargées pour la mosaïque (total: ${count})`);
      }
    } catch (err) {
      console.error('Erreur de chargement des images:', err);
      setProjectImages([]);
      setHasMoreImages(false);
    } finally {
      setLoading(false);
    }
  };

  // Charger les images du projet initialement et configurer le rafraîchissement automatique
  useEffect(() => {
    if (!projectId) return;

    // Chargement initial
    loadSessionImages();

    // Configurer le rafraîchissement automatique toutes les 60 secondes (au lieu de 30)
    refreshInterval.current = setInterval(() => {
      console.log('Rafraîchissement automatique de la mosaïque...');
      loadSessionImages(displayLimit);
    }, 60000); // 60 secondes

    // Nettoyage lors du démontage du composant
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [projectId, supabase]);
  
  // Animation variants avec effet image par image amélioré
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1, // Délai entre chaque image
        delayChildren: 0.2    // Délai avant de commencer l'animation
      }
    }
  };
  
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 30,
      rotateY: -15 
    },
    show: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      rotateY: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        duration: 0.6
      }
    }
  };
  
  // Function to determine QR code position in the grid
  const getQRCodePosition = () => {
    const position = mosaicSettings.qr_position || 'center';
    
    // Default grid position is center (translate to grid index)
    switch (position) {
      case 'center': return Math.floor(projectImages.length / 2); // Middle of images
      case 'top-left': return 0; // First position
      case 'top-right': return 4; // Top right corner (assuming grid width of ~5)
      case 'bottom-left': return Math.max(0, projectImages.length - 10); // Near bottom left
      case 'bottom-right': return Math.max(0, projectImages.length - 1); // Last position
      default: return Math.floor(projectImages.length / 2);
    }
  };
  
  // Create mosaic grid items including the QR code at the specified position
  const createMosaicItems = () => {
    if (!projectImages.length) return [];
    
    const items = [...projectImages];
    
    // If QR code is enabled, insert it at the specified position
    if (mosaicSettings.show_qr_code) {
      const position = getQRCodePosition();
      
      // Creating a QR "image" object that will render differently
      const qrCodeItem = {
        id: 'qr-code',
        isQRCode: true,
        metadata: { fileName: 'QR Code' }
      };
      
      // Insert QR code at the determined position
      items.splice(position, 0, qrCodeItem);
    }
    
    return items;
  };

  // Fonction pour charger plus d'images
  const loadMoreImages = async () => {
    setLoadingMore(true);
    const newLimit = displayLimit + 50;
    setDisplayLimit(newLimit);
    await loadSessionImages(newLimit, true); // Skip count check car on veut forcer le chargement
    setLoadingMore(false);
  };

  // Gérer le mode plein écran
  useEffect(() => {
    if (wantsFullscreen) {
      // We'll create a button to prompt the user
      setShowFullscreenButton(true);
      
      // Don't try to auto-enter fullscreen mode, 
      // as browsers require a user gesture
      console.log("Fullscreen mode requested via URL, showing button");
    }
  }, [wantsFullscreen]);

  // Ajouter une détection de la touche Échap pour quitter le plein écran
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        console.log("Touche Échap détectée - quitter le plein écran");
        // Ne rien faire, laisser le navigateur gérer la sortie du mode plein écran
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update the fullscreen toggle function to handle layout properly
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // Find the best element to make fullscreen
      const mosaicContainer = document.querySelector('.mosaic-container-standalone') || 
                             document.querySelector('.mosaic-container') ||
                             document.documentElement;
      
      mosaicContainer.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`Erreur lors du passage en plein écran: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };
  
  // Check if fullscreen is wanted and browser supports it
  useEffect(() => {
    const fullscreenSupported = document.documentElement.requestFullscreen || 
                               document.documentElement.mozRequestFullScreen || 
                               document.documentElement.webkitRequestFullscreen || 
                               document.documentElement.msRequestFullscreen;
    
    setShowFullscreenButton(!!fullscreenSupported);
    
    // Listen for fullscreen change
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);
  
  // Show a prominent fullscreen button if requested
  useEffect(() => {
    if (wantsFullscreen) {
      // Highlight the fullscreen button if it was requested via URL parameter
      setShowFullscreenButton(true);
    }
  }, [wantsFullscreen]);

  return (
    <div className="min-h-screen py-6 px-6" style={getBackgroundStyle()}>
      {/* Affichage des informations de la mosaïque */}
  
      {/* Fullscreen Button - Always visible when supported */}
      {showFullscreenButton && (
        <motion.button
          onClick={toggleFullscreen}
          className={`fixed ${isFullscreen ? 'top-6 right-6' : 'top-4 right-4'} z-40 p-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: wantsFullscreen ? [0, 1, 0.8, 1] : 1, 
            scale: wantsFullscreen ? [0.8, 1.2, 1] : 1,
            y: wantsFullscreen ? [-10, 0] : 0
          }}
          transition={{ 
            duration: wantsFullscreen ? 1.5 : 0.3,
            repeat: wantsFullscreen ? 2 : 0,
            repeatType: "reverse",
            repeatDelay: 0.5
          }}
          title={isFullscreen ? "Quitter le mode plein écran" : "Activer le mode plein écran"}
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          )}
        </motion.button>
      )}
      
      {/* Si l'utilisateur vient via "fullscreen=true", montrer un message d'aide */}
      {wantsFullscreen && !isFullscreen && (
        <motion.div
          className="fixed top-16 inset-x-0 flex justify-center z-30"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg flex items-center shadow-lg">
            <span className="mr-2">Cliquez sur</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
            <span className="ml-2">pour activer le mode plein écran</span>
          </div>
        </motion.div>
      )}

      {/* Indicateur de dernier rafraîchissement et nombre d'images */}
      {!loading && projectImages.length > 0 && (
        <motion.div
          className="fixed bottom-4 left-4 bg-black bg-opacity-50 text-white text-xs px-3 py-1 rounded-full z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div>Dernière mise à jour: {lastRefresh.toLocaleTimeString('fr-FR')}</div>
          <div className="text-center">
            {projectImages.length} images affichées{hasMoreImages && ' (plus disponibles)'}
          </div>
        </motion.div>
      )}

      {/* Affichage du QR code de la mosaïque si activé dans mosaic_settings */}
    
      {/* Title and description */}
      {(mosaicSettings.title || mosaicSettings.description) && (
        <div className="max-w-4xl mx-auto mb-8 text-center">
          {mosaicSettings.title && (
            <motion.h1 
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow"
              key={lastRefresh.getTime()} // Force re-animation lors du rafraîchissement
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {mosaicSettings.title}
            </motion.h1>
          )}
          
          {mosaicSettings.description && (
            <p className="text-base sm:text-lg text-white/90 drop-shadow">
              {mosaicSettings.description}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg max-w-4xl mx-auto">
          {error}
        </div>
      )}
    
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          {/* Loader principal avec animation sophistiquée */}
          <div className="relative">
            {/* Cercles concentriques animés */}
            <motion.div
              className="absolute rounded-full border-4 border-blue-400/30"
              style={{ width: 80, height: 80 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute rounded-full border-4 border-purple-400/50"
              style={{ width: 60, height: 60, top: 10, left: 10 }}
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute rounded-full border-4 border-pink-400/70"
              style={{ width: 40, height: 40, top: 20, left: 20 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Centre pulsant avec icône */}
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full flex items-center justify-center"
              style={{ width: 20, height: 20 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </motion.div>
          </div>
          
          {/* Texte de chargement avec animation */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.h3
              className="text-white text-xl font-medium mb-3"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Chargement de la mosaïque...
            </motion.h3>
            
            {/* Points de chargement animés */}
            <div className="flex space-x-2 justify-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 bg-white rounded-full"
                  animate={{
                    y: [0, -10, 0],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Grille de simulation de mosaïque */}
          <motion.div
            className="mt-8 grid grid-cols-6 gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-8 h-8 rounded-lg"
                style={{
                  background: `linear-gradient(45deg, 
                    ${i % 3 === 0 ? 'rgb(59, 130, 246)' : i % 3 === 1 ? 'rgb(147, 51, 234)' : 'rgb(236, 72, 153)'}, 
                    rgba(255, 255, 255, 0.1))`
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: (i * 0.1) % 1.5
                }}
              />
            ))}
          </motion.div>

          {/* Barre de progression stylée */}
          <motion.div
            className="mt-6 w-64 h-2 bg-white/20 rounded-full overflow-hidden"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 256 }}
            transition={{ delay: 1 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400 rounded-full"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>

          {/* Message informatif */}
          <motion.p
            className="text-white/80 text-sm mt-4 max-w-md text-center leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            Récupération des {displayLimit} dernières photos du projet...
          </motion.p>
        </div>
      ) : projectImages.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-sm shadow rounded-lg p-12 text-center text-white max-w-4xl mx-auto">
          Aucune image trouvée pour ce projet
        </div>
      ) : (
        <div className="mx-auto max-w-8xl">
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            key={lastRefresh.getTime()} // Force re-animation lors du rafraîchissement
          >
            {createMosaicItems().map((item, index) => (
              <motion.div
                key={item.id || `mosaic-item-${index}`}
                className="aspect-square w-full"
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
                style={{
                  perspective: "1000px"
                }}
              >
                {item.isQRCode ? (
                  // Render QR code avec animation d'entrée
                  <motion.div 
                    className="w-full h-full bg-white flex flex-col items-center justify-center p-4 rounded-lg shadow-lg"
                    initial={{ rotateY: 180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ 
                      delay: index * 0.1,
                      duration: 0.8,
                      type: "spring"
                    }}
                  >
                    <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">
                      {mosaicSettings.qr_title}
                    </h3>
                    <div className="flex justify-center mb-2">
                      <Canvas
                        text={mosaicUrl}
                        options={{
                          level: 'M',
                          margin: 3,
                          scale: 4,
                          width: 150,
                          color: {
                            dark: '#000000',
                            light: '#ffffff',
                          },
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mb-1 text-center truncate w-full px-2">
                      {mosaicUrl.split('//')[1]?.substring(0, 30)}...
                    </div>
                    <div className="text-sm text-gray-700 text-center px-2">
                      {mosaicSettings.qr_description}
                    </div>
                  </motion.div>
                ) : (
                  // Render image avec effet de flip et glow
                  <motion.div 
                    className="relative w-full h-full rounded-lg overflow-hidden shadow-lg"
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ 
                      delay: index * 0.1,
                      duration: 0.6,
                      type: "spring",
                      stiffness: 100
                    }}
                    whileHover={{
                      boxShadow: "0 0 25px rgba(255, 255, 255, 0.3)",
                      transition: { duration: 0.3 }
                    }}
                  >
                    <Image
                      src={item.image_url}
                      alt={item.metadata?.fileName || 'Image du projet'}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      className="object-cover transition-transform duration-300 hover:scale-110"
                      loading="lazy" // Lazy loading natif
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-image.png';
                      }}
                    />
                    {/* Overlay avec effet de nouveauté pour les premières images */}
                    {index < 3 && (
                      <motion.div
                        className="absolute top-2 right-2 bg-gradient-to-r from-green-400 to-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-lg"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ 
                          delay: (index * 0.1) + 0.5,
                          type: "spring",
                          stiffness: 200
                        }}
                      >
                        Nouveau
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Bouton "Charger plus" si il y a plus d'images disponibles */}
          {hasMoreImages && !loading && (
            <motion.div
              className="flex justify-center mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <button
                onClick={loadMoreImages}
                disabled={loadingMore}
                className={`px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center space-x-3 ${
                  loadingMore ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-xl'
                }`}
              >
                {loadingMore ? (
                  <>
                    {/* Mini loader pour le bouton */}
                    <motion.div
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <span>Chargement...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Charger plus d'images</span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}