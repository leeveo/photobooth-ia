'use client';

import { useEffect, useState, useRef } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQRCode } from 'next-qrcode';

export default function ProjectMosaic() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const wantsFullscreen = searchParams.get('fullscreen') === 'true';
  const { Canvas } = useQRCode();
  
  // États existants du slider
  const [projectImages, setProjectImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // Pour le slider
  const [singleImage, setSingleImage] = useState(null); // Pour le mode slider
  const [autoPlay, setAutoPlay] = useState(false); // Pour l'auto-play du slider

  // Nouveaux états pour les fonctionnalités avancées
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenButton, setShowFullscreenButton] = useState(false);
  const [projectDetails, setProjectDetails] = useState(null);
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
  const IMAGES_PER_PAGE = 18; // 6 colonnes x 3 lignes = 18 images
  const HUGE_PROJECT_LIMIT = 6; // Pour le gros projet, seulement 6 images

  // URL de la mosaïque pour le QR code
  const mosaicUrl = typeof window !== 'undefined' ? 
    `${window.location.origin}/photobooth-ia/admin/project-mosaic?projectId=${projectId}` : '';
  
  // Style de fond basé sur les paramètres
  const getBackgroundStyle = () => {
    if (mosaicSettings.bg_image_url) {
      return {
        backgroundImage: `url(${mosaicSettings.bg_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: mosaicSettings.bg_color // Fallback color
      };
    }
    return { backgroundColor: mosaicSettings.bg_color };
  };

  const loadSessionImages = async (page = 1, retryCount = 0) => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log(`Chargement page ${page} pour projet:`, projectId, retryCount > 0 ? `(tentative ${retryCount + 1})` : '');

      const isHugeProject = projectId === 'b492a7b4-de73-4401-aa53-d98be285d07b';
      
      if (isHugeProject) {
        // Mode slider : charger une seule image à la fois
        const result = await supabase
          .from('sessions')
          .select('id, result_s3_url, result_image_url, created_at')
          .eq('project_id', projectId)
          .is('moderation', null)
          .not('result_s3_url', 'is', null)
          .order('created_at', { ascending: false })
          .range(currentImageIndex, currentImageIndex)
          .single();

        if (result.error) throw result.error;

        if (result.data) {
          const image = {
            id: result.data.id,
            image_url: result.data.result_s3_url || result.data.result_image_url,
            created_at: result.data.created_at
          };
          setSingleImage(image);
          console.log(`Image ${currentImageIndex + 1} chargée pour gros projet`);
        }
        
      } else {
        // Mode normal : grille 6x3
        const limit = 18;
        const offset = (page - 1) * limit;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const result = await supabase
          .from('sessions')
          .select('id, result_s3_url, result_image_url, created_at')
          .eq('project_id', projectId)
          .is('moderation', null)
          .not('result_s3_url', 'is', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (result.error) throw result.error;

        const sessions = result.data || [];
        const images = sessions.map(session => ({
          id: session.id,
          image_url: session.result_s3_url || session.result_image_url,
          created_at: session.created_at
        }));

        setProjectImages(images);
        setCurrentPage(page);
        
        const hasMore = sessions.length === limit;
        setTotalPages(hasMore ? page + 1 : page);
        
        console.log(`Page ${page} chargée: ${images.length} images (limite: ${limit})`);
      }

    } catch (error) {
      console.error('Erreur:', error);
      
      const maxRetries = isHugeProject ? 3 : 2;
      if (retryCount < maxRetries && (error.message.includes('500') || error.message.includes('timeout') || error.name === 'AbortError')) {
        const retryDelay = isHugeProject ? 5000 : 2000;
        console.log(`Retry dans ${retryDelay}ms... (tentative ${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          loadSessionImages(page, retryCount + 1);
        }, retryDelay);
        return;
      }
      
      setError(`Erreur de chargement: ${error.message}${retryCount > 0 ? ` (après ${retryCount + 1} tentatives)` : ''}`);
      if (isHugeProject) {
        setSingleImage(null);
      } else {
        setProjectImages([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1) {
      loadSessionImages(newPage);
    }
  };

  // Navigation pour le mode slider
  const goToPreviousImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  const goToNextImage = () => {
    setCurrentImageIndex(prev => prev + 1);
  };

  // Basculer l'auto-play
  const toggleAutoPlay = () => {
    setAutoPlay(prev => !prev);
  };

  // Charger les détails du projet et les paramètres de mosaïque
  useEffect(() => {
    if (!projectId) return;
    
    async function loadProjectData() {
      try {
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, slug, description')
          .eq('id', projectId)
          .single();
          
        if (projectError) throw projectError;
        
        setProjectDetails(projectData);
        
        // Fetch mosaic settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('mosaic_settings')
          .select('*')
          .eq('project_id', projectId)
          .single();
          
        if (!settingsError && settingsData) {
          console.log("Loaded mosaic settings:", settingsData);
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
          // Use project name as default title if no settings found
          setMosaicSettings(prev => ({
            ...prev,
            title: projectData.name || ''
          }));
        }
      } catch (err) {
        console.error('Erreur lors du chargement du projet:', err);
        setError('Impossible de charger les détails du projet');
      }
    }
    
    loadProjectData();
  }, [projectId, supabase]);

  // Gestion du mode plein écran
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

  // Gérer le mode plein écran
  useEffect(() => {
    if (wantsFullscreen) {
      setShowFullscreenButton(true);
      console.log("Fullscreen mode requested via URL, showing button");
    }
  }, [wantsFullscreen]);

  // Détection de la touche Échap pour quitter le plein écran
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        console.log("Touche Échap détectée - quitter le plein écran");
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check if fullscreen is supported and listen for changes
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

  // Fonction pour déterminer la position du QR code dans la grille
  const getQRCodePosition = () => {
    const position = mosaicSettings.qr_position || 'center';
    
    switch (position) {
      case 'center': return Math.floor(projectImages.length / 2);
      case 'top-left': return 0;
      case 'top-right': return 4;
      case 'bottom-left': return Math.max(0, projectImages.length - 10);
      case 'bottom-right': return Math.max(0, projectImages.length - 1);
      default: return Math.floor(projectImages.length / 2);
    }
  };
  
  // Créer les éléments de la mosaïque incluant le QR code
  const createMosaicItems = () => {
    if (!projectImages.length) return [];
    
    const items = [...projectImages];
    
    // Si le QR code est activé et qu'on n'est pas en mode gros projet, l'insérer
    if (mosaicSettings.show_qr_code && projectId !== 'b492a7b4-de73-4401-aa53-d98be285d07b') {
      const position = getQRCodePosition();
      
      const qrCodeItem = {
        id: 'qr-code',
        isQRCode: true,
        metadata: { fileName: 'QR Code' }
      };
      
      items.splice(position, 0, qrCodeItem);
    }
    
    return items;
  };

  useEffect(() => {
    if (projectId) {
      setCurrentImageIndex(0);
      setSingleImage(null);
      setProjectImages([]);
      setCurrentPage(1);
      setTotalPages(1);
      setAutoPlay(false); // Réinitialiser l'auto-play
      loadSessionImages();
    }
  }, [projectId]);

  // Charger la nouvelle image quand l'index change (mode slider)
  useEffect(() => {
    const isHugeProject = projectId === 'b492a7b4-de73-4401-aa53-d98be285d07b';
    if (isHugeProject && projectId && currentImageIndex >= 0) {
      loadSessionImages();
    }
  }, [currentImageIndex]);

  // Auto-play pour le slider (10 secondes)
  useEffect(() => {
    const isHugeProject = projectId === 'b492a7b4-de73-4401-aa53-d98be285d07b';
    
    if (isHugeProject && autoPlay && !loading) {
      const interval = setInterval(() => {
        setCurrentImageIndex(prev => prev + 1);
      }, 10000); // 10 secondes

      return () => clearInterval(interval);
    }
  }, [autoPlay, loading, projectId]);

  if (loading) {
    const isHugeProject = projectId === 'b492a7b4-de73-4401-aa53-d98be285d07b';
    return (
      <div className="min-h-screen py-6 px-6" style={getBackgroundStyle()}>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">
              {isHugeProject ? 'Chargement optimisé...' : 'Chargement...'}
            </p>
            {isHugeProject && (
              <p className="text-sm text-white/80 mt-2">
                Mode slider détecté - Patience recommandée
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-6 px-6" style={getBackgroundStyle()}>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center max-w-md mx-auto p-6 bg-white/10 backdrop-blur-sm rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-2">Erreur</h2>
            <p className="text-white/90 mb-4">{error}</p>
            <button 
              onClick={() => loadSessionImages(currentPage)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Reessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isHugeProject = projectId === 'b492a7b4-de73-4401-aa53-d98be285d07b';

  return (
    <div className="min-h-screen py-6 px-6" style={getBackgroundStyle()}>
      {/* Bouton plein écran - Toujours visible quand supporté */}
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
      
      {/* Message d'aide pour le mode plein écran */}
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

      {/* Titre et description personnalisés */}
      {(mosaicSettings.title || mosaicSettings.description) && (
        <div className="max-w-4xl mx-auto mb-8 text-center">
          {mosaicSettings.title && (
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
              {mosaicSettings.title}
            </h1>
          )}
          
          {mosaicSettings.description && (
            <p className="text-base sm:text-lg text-white/90">
              {mosaicSettings.description}
            </p>
          )}
        </div>
      )}

      {/* En-tête admin pour les gros projets */}
      {isHugeProject && (
        <div className="bg-white/10 backdrop-blur-sm shadow-sm border-b mb-6 rounded-lg">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Mode slider optimisé</h1>
                <p className="text-sm text-white/80 mt-1">
                  Image ${currentImageIndex + 1} - Navigation une par une${autoPlay ? ' - Auto-play activé' : ''}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleAutoPlay}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    autoPlay 
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {autoPlay ? '⏸️ Pause' : '▶️ Auto-play (10s)'}
                </button>
                <button
                  onClick={() => loadSessionImages()}
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Actualiser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gestion des erreurs avec style personnalisé */}
      {error && !loading && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 bg-opacity-90 rounded-lg max-w-4xl mx-auto">
          {error}
        </div>
      )}

      {/* Contenu principal */}
      <div className="max-w-8xl mx-auto">
        {isHugeProject ? (
          // Mode slider pour gros projets
          <div className="flex flex-col items-center">
            {singleImage ? (
              <motion.div 
                className="relative max-w-2xl w-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="aspect-square relative bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden">
                  <Image
                    src={singleImage.image_url}
                    alt={`Photo ${currentImageIndex + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 90vw, 600px"
                  />
                </div>
                
                {/* Navigation slider avec style adapté */}
                <div className="flex justify-between items-center mt-6">
                  <button
                    onClick={goToPreviousImage}
                    disabled={currentImageIndex <= 0 || loading}
                    className="flex items-center px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm transition-all"
                  >
                    ← Précédente
                  </button>
                  
                  <div className="flex items-center space-x-4">
                    <span className="px-4 py-2 bg-blue-500 text-white rounded-lg backdrop-blur-sm">
                      Image {currentImageIndex + 1}
                    </span>
                    {autoPlay && (
                      <div className="flex items-center text-green-400 text-sm bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                        Auto-play
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={goToNextImage}
                    disabled={loading}
                    className="flex items-center px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 disabled:opacity-50 backdrop-blur-sm transition-all"
                  >
                    Suivante →
                  </button>
                </div>
                
                <p className="text-center text-sm text-white/80 mt-4 bg-black/20 backdrop-blur-sm rounded-lg p-3">
                  Mode optimisé pour gros projet - Une image à la fois
                  {autoPlay && <span className="block text-green-400 mt-1">⏰ Changement automatique toutes les 10 secondes</span>}
                </p>
              </motion.div>
            ) : (
              <div className="text-center py-12 bg-white/10 backdrop-blur-sm rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-2">Aucune image trouvée</h3>
                <p className="text-white/80">Ce projet ne contient pas d'images ou l'index est incorrect.</p>
              </div>
            )}
          </div>
        ) : (
          // Mode grille normal avec QR code intégré
          <>
            {projectImages.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm shadow rounded-lg p-12 text-center text-white max-w-4xl mx-auto">
                Aucune image trouvée pour ce projet
              </div>
            ) : (
              <motion.div 
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1"
                variants={{
                  hidden: { opacity: 0 },
                  show: { 
                    opacity: 1,
                    transition: { staggerChildren: 0.05 }
                  }
                }}
                initial="hidden"
                animate="show"
              >
                {createMosaicItems().map((item, index) => (
                  <motion.div
                    key={item.id || `mosaic-item-${index}`}
                    className="aspect-square w-full"
                    variants={{
                      hidden: { opacity: 0, scale: 0.95 },
                      show: { opacity: 1, scale: 1 }
                    }}
                  >
                    {item.isQRCode ? (
                      // Rendu du QR code
                      <div className="w-full h-full bg-white flex flex-col items-center justify-center p-4">
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
                      </div>
                    ) : (
                      // Rendu d'image
                      <div className="relative w-full h-full">
                        <Image
                          src={item.image_url}
                          alt={item.metadata?.fileName || 'Image du projet'}
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className="object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder-image.png';
                          }}
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Navigation pagination stylisée pour projets normaux */}
            {projectImages.length > 0 && !isHugeProject && (
              <div className="flex justify-center items-center mt-8 space-x-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-4 py-2 bg-white/20 text-white rounded hover:bg-white/30 disabled:opacity-50 backdrop-blur-sm transition-all"
                >
                  ← Précédent
                </button>
                
                <span className="px-4 py-2 bg-blue-500 text-white rounded backdrop-blur-sm">
                  Page {currentPage}
                </span>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={projectImages.length < IMAGES_PER_PAGE}
                  className="px-4 py-2 bg-white/20 text-white rounded hover:bg-white/30 disabled:opacity-50 backdrop-blur-sm transition-all"
                >
                  Suivant →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}