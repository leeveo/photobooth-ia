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
  
  // Add this to display the mosaic URL
  const mosaicUrl = typeof window !== 'undefined' ? 
    `${window.location.origin}/photobooth-ia/admin/project-mosaic?projectId=${projectId}` : '';
  
  // Background style based on settings
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
  
  // Charger les images S3 du projet
  useEffect(() => {
    if (!projectId) return;
    
    async function loadS3Images() {
      setLoading(true);
      try {
        const response = await fetch(`/api/s3-project-images?projectId=${projectId}`);
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.images) {
          setProjectImages(data.images);
        } else {
          setProjectImages([]);
        }
      } catch (err) {
        console.error('Error loading S3 images:', err);
        setError('Failed to load project images');
      } finally {
        setLoading(false);
      }
    }
    
    loadS3Images();
    
    // Corriger la fonction de nettoyage pour éviter le double return
    return () => {
      // Vérifier si un canal existe avant de tenter de le supprimer
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
        realtimeChannel.current = null;
      }
    };
  }, [projectId, supabase]);
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { 
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1 }
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

      {/* Title and description */}
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

      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg max-w-4xl mx-auto">
          {error}
        </div>
      )}
    
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : projectImages.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-sm shadow rounded-lg p-12 text-center text-white max-w-4xl mx-auto">
          Aucune image trouvée pour ce projet
        </div>
      ) : (
        <div className="mx-auto max-w-8xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1">
            {createMosaicItems().map((item, index) => (
              <motion.div
                key={item.id || `mosaic-item-${index}`}
                className="aspect-square w-full"
                variants={itemVariants}
                initial="hidden"
                animate="show"
              >
                {item.isQRCode ? (
                  // Render QR code
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
                  // Render image
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
          </div>
        </div>
      )}
    </div>
  );
}