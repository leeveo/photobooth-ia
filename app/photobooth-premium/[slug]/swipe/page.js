'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import Image from 'next/image';

// Composant SwipeCard optimisé pour mobile
const SwipeCard = React.forwardRef(({ children, onSwipe, onCardLeftScreen, className, preventSwipe = [], swipeThreshold = 80 }, ref) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  const [exitX, setExitX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    // Seuil adapté pour mobile
    if (Math.abs(offset) > swipeThreshold || Math.abs(velocity) > 400) {
      const direction = offset > 0 ? 'right' : 'left';
      const exitDirection = direction === 'right' ? 1000 : -1000;
      
      setExitX(exitDirection);
      
      if (onSwipe) {
        onSwipe(direction);
      }
      
      // Animation de sortie plus rapide sur mobile
      setTimeout(() => {
        if (onCardLeftScreen) {
          onCardLeftScreen();
        }
      }, 250);
    } else {
      // Reset avec animation élastique
      x.set(0);
      y.set(0);
    }
  };

  // Expose swipe method via ref
  React.useImperativeHandle(ref, () => ({
    swipe: (direction) => {
      const targetX = direction === 'right' ? 1000 : -1000;
      setExitX(targetX);
      
      if (onSwipe) {
        onSwipe(direction);
      }
      
      setTimeout(() => {
        if (onCardLeftScreen) {
          onCardLeftScreen();
        }
      }, 250);
    }
  }));

  return (
    <motion.div
      className={className}
      style={{ 
        x, 
        y, 
        rotate, 
        opacity,
        touchAction: 'pan-x', // Optimise les gestes tactiles
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.4}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      animate={{ x: exitX }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        duration: isDragging ? 0.1 : 0.6
      }}
      whileDrag={{ 
        scale: 1.02, 
        cursor: "grabbing",
        zIndex: 10
      }}
    >
      {children}
    </motion.div>
  );
});

export default function SwipeGalleryPage() {
  const params = useParams();
  const slug = params?.slug;
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [mosaicSettings, setMosaicSettings] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastDirection, setLastDirection] = useState(null);
  const [swipeCount, setSwipeCount] = useState({ likes: 0, passes: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [topPhotos, setTopPhotos] = useState([]);

  const currentIndexRef = useRef(currentIndex);
  const childRefs = useRef([]);

  // Ajout d'un style pour désactiver le zoom sur mobile
  React.useEffect(() => {
    // Empêcher le zoom sur double-tap
    const preventDefault = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventZoom = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventDefault, { passive: false });
    document.addEventListener('touchmove', preventZoom, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', preventDefault);
      document.removeEventListener('touchmove', preventZoom);
    };
  }, []);

  // Charger les données du projet et vérifier si la galerie est publique
  useEffect(() => {
    async function loadPublicGallery() {
      if (!slug) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // 1. Récupérer les infos du projet par slug
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('id, name, slug, description, logo_url, primary_color, secondary_color')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (projectError || !project) {
          throw new Error('Projet non trouvé ou inactif');
        }

        // 2. Vérifier si la galerie est publique
        const { data: mosaicData, error: mosaicError } = await supabase
          .from('mosaic_settings')
          .select('*')
          .eq('project_id', project.id)
          .maybeSingle();

        if (mosaicError) {
          throw new Error('Erreur lors du chargement des paramètres de galerie');
        }

        // Vérifier si la galerie est publique
        if (!mosaicData || !mosaicData.is_public) {
          throw new Error('Cette galerie n\'est pas accessible publiquement');
        }

        setProjectData(project);
        setMosaicSettings(mosaicData);

        // 3. Charger les images du projet
        await loadGalleryImages(project.id);

      } catch (err) {
        console.error('Erreur lors du chargement de la galerie publique:', err);
        setError(err.message || 'Impossible de charger la galerie');
      } finally {
        setLoading(false);
      }
    }

    loadPublicGallery();
  }, [slug, supabase]);

  // Fonction pour charger les images de la galerie
  const loadGalleryImages = async (projectId) => {
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, result_s3_url, result_image_url, created_at, moderation, score')
        .eq('project_id', projectId)
        .is('moderation', null) // Images non modérées seulement
        .order('created_at', { ascending: false });

      if (sessionsError) {
        throw new Error('Erreur lors du chargement des images');
      }

      const images = (sessionsData || [])
        .map(session => ({
          id: session.id,
          image_url: session.result_s3_url || session.result_image_url,
          created_at: session.created_at,
          score: session.score || 0,
          metadata: {
            fileName: session.result_s3_url ? session.result_s3_url.split('/').pop() : ''
          }
        }))
        .filter(img => img.image_url);

      setGalleryImages(images);
      setCurrentIndex(images.length - 1);
      currentIndexRef.current = images.length - 1;
      
      // Initialiser les refs pour chaque carte
      childRefs.current = Array(images.length).fill(0).map(() => React.createRef());
      
      console.log(`Galerie swipe: ${images.length} images chargées`);
    } catch (err) {
      console.error('Erreur de chargement des images:', err);
      setGalleryImages([]);
    }
  };

  // Fonction pour mettre à jour le score dans la base de données
  const updateImageScore = async (imageId, liked) => {
    try {
      const response = await fetch('/api/update-image-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId,
          liked,
          projectId: projectData?.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la mise à jour du score');
      }

      console.log(`Score mis à jour pour l'image ${imageId}: ${result.score} (${result.liked ? 'liked' : 'passed'})`);
      return result;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du score:', error);
      throw error;
    }
  };

  // Récupérer le top 3 des photos
  const fetchTopPhotos = async () => {
    try {
      const response = await fetch(`/api/get-top-photos?projectId=${projectData?.id}`);
      const result = await response.json();
      
      if (result.success) {
        setTopPhotos(result.topPhotos);
        console.log('Top 3 photos récupérées:', result.topPhotos);
      } else {
        console.error('Erreur lors de la récupération du top 3:', result.error);
      }
    } catch (error) {
      console.error('Erreur fetch top photos:', error);
    }
  };

  // Gérer le swipe
  const swiped = (direction, imageId, index) => {
    console.log(`Swipe ${direction} sur l'image ${imageId}, index: ${index}`);
    
    const liked = direction === 'right';
    setLastDirection(direction);
    
    // Mettre à jour les compteurs
    setSwipeCount(prev => ({
      likes: prev.likes + (liked ? 1 : 0),
      passes: prev.passes + (liked ? 0 : 1)
    }));

    // Mettre à jour l'index courant
    const newIndex = index - 1;
    setCurrentIndex(newIndex);
    currentIndexRef.current = newIndex;

    // Mettre à jour le score dans la base de données
    updateImageScore(imageId, liked);
    
    // Vérifier si on a fini toutes les images
    if (newIndex < 0) {
      setIsFinished(true);
      // Récupérer le top 3 des photos à la fin
      setTimeout(() => {
        fetchTopPhotos();
      }, 1000);
    }
  };

  // Gérer la sortie de la carte
  const outOfFrame = (imageId, index) => {
    console.log(`Image ${imageId} sortie du frame, index: ${index}`);
    // La mise à jour de l'index est déjà gérée dans swiped()
  };

  // Swipe programmatique
  const swipe = async (dir) => {
    const activeIndex = currentIndexRef.current;
    console.log(`Swipe programmatique ${dir}, index actuel: ${activeIndex}`);
    
    if (activeIndex >= 0 && childRefs.current[activeIndex] && childRefs.current[activeIndex].current) {
      childRefs.current[activeIndex].current.swipe(dir);
    } else {
      console.warn(`Impossible de swiper: index ${activeIndex}, ref disponible: ${!!childRefs.current[activeIndex]?.current}`);
    }
  };

  // Style d'arrière-plan basé sur les paramètres
  const getBackgroundStyle = () => {
    if (!mosaicSettings) return { backgroundColor: '#000000' };
    
    if (mosaicSettings.bg_image_url) {
      return {
        backgroundImage: `url(${mosaicSettings.bg_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: mosaicSettings.bg_color || '#000000'
      };
    }
    return { backgroundColor: mosaicSettings.bg_color || '#000000' };
  };

  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-white mx-auto mb-3 sm:mb-4"></div>
          <p className="text-white text-sm sm:text-base">Chargement de la galerie...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center max-w-sm sm:max-w-md mx-auto p-4 sm:p-6">
          <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4 text-white/60">⚠</div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Galerie non accessible</h1>
          <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">{error}</p>
          <a 
            href="/"
            className="inline-block w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base touch-manipulation active:scale-95"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const primaryColor = projectData?.primary_color || '#811A53';
    const secondaryColor = projectData?.secondary_color || '#E5E40A';

    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 relative overflow-hidden" style={getBackgroundStyle()}>
        <div className="w-full max-w-sm sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="text-center mb-6 sm:mb-8"
          >
            <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl mb-3 sm:mb-4 text-white/90">🏁</div>
            <h1 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold mb-3 sm:mb-4 drop-shadow-lg px-2"
              style={{ color: primaryColor }}
            >
              Évaluation terminée !
            </h1>
            <p 
              className="text-sm sm:text-lg md:text-xl lg:text-2xl font-semibold px-4"
              style={{ color: secondaryColor }}
            >
              Merci pour votre participation
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-8 sm:mt-10 md:mt-12"
          >
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-8">
              <motion.button
                onClick={() => window.location.reload()}
                className="relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base md:text-lg text-white shadow-lg transition-all duration-500 hover:scale-105 active:scale-95 touch-manipulation overflow-hidden group"
                style={{
                  background: `linear-gradient(45deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  WebkitTapHighlightColor: 'transparent',
                  boxShadow: `0 10px 30px rgba(0,0,0,0.3), 0 0 20px ${primaryColor}40`
                }}
                whileHover={{ 
                  boxShadow: `0 15px 40px rgba(0,0,0,0.4), 0 0 30px ${primaryColor}60`
                }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10">↻ Recommencer</span>
              </motion.button>
              
              <motion.a
                href={`/photobooth-premium/${slug}/gallery`}
                className="relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base md:text-lg text-white shadow-lg transition-all duration-500 hover:scale-105 active:scale-95 touch-manipulation overflow-hidden group block text-center"
                style={{
                  background: `linear-gradient(45deg, ${secondaryColor} 0%, ${primaryColor} 100%)`,
                  textDecoration: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  boxShadow: `0 10px 30px rgba(0,0,0,0.3), 0 0 20px ${secondaryColor}40`
                }}
                whileHover={{ 
                  boxShadow: `0 15px 40px rgba(0,0,0,0.4), 0 0 30px ${secondaryColor}60`
                }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10">⊞ Voir toutes les photos</span>
              </motion.a>
            </div>
            
            {/* Statistiques personnelles */}
            <motion.div 
              className="relative mx-auto p-4 sm:p-6 rounded-2xl max-w-sm overflow-hidden group"
              style={{
                background: `linear-gradient(135deg, 
                  rgba(255,255,255,0.1) 0%, 
                  rgba(255,255,255,0.05) 50%, 
                  rgba(0,0,0,0.1) 100%)`,
                border: `1px solid ${secondaryColor}44`,
                backdropFilter: 'blur(20px)',
                boxShadow: `0 20px 40px rgba(0,0,0,0.3), 
                           inset 0 1px 0 rgba(255,255,255,0.2),
                           0 0 30px ${secondaryColor}20`
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1, type: "spring", stiffness: 200 }}
              whileHover={{ 
                scale: 1.02,
                boxShadow: `0 25px 50px rgba(0,0,0,0.4), 
                           inset 0 1px 0 rgba(255,255,255,0.3),
                           0 0 40px ${secondaryColor}30`
              }}
            >
              <div className="relative z-10">
                <motion.h3 
                  className="text-lg sm:text-xl font-black mb-3 sm:mb-4 text-center bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  Vos votes de cette session
                </motion.h3>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <motion.div 
                    className="relative text-center p-3 rounded-xl group/stat overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                      border: '1px solid rgba(34,197,94,0.3)',
                      boxShadow: '0 10px 25px rgba(34,197,94,0.2)'
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.3, type: "spring", stiffness: 200 }}
                  >
                    <div className="relative z-10">
                      <div className="text-2xl sm:text-3xl mb-2">♡</div>
                      <div className="text-xl sm:text-2xl font-black text-green-300 mb-1">{swipeCount.likes}</div>
                      <div className="text-xs sm:text-sm font-bold text-green-200">J'aime</div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="relative text-center p-3 rounded-xl group/stat overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
                      border: '1px solid rgba(239,68,68,0.3)',
                      boxShadow: '0 10px 25px rgba(239,68,68,0.2)'
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.4, type: "spring", stiffness: 200 }}
                  >
                    <div className="relative z-10">
                      <div className="text-2xl sm:text-3xl mb-2">✕</div>
                      <div className="text-xl sm:text-2xl font-black text-red-300 mb-1">{swipeCount.passes}</div>
                      <div className="text-xs sm:text-sm font-bold text-red-200">Passé</div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col" style={getBackgroundStyle()}>
      {/* En-tête responsive */}
      <div className="flex-shrink-0 w-full px-4 py-3 sm:py-4 md:py-6">
        <div className="max-w-sm sm:max-w-md mx-auto">
          <div className="text-center">
            {projectData?.logo_url && (
              <div className="mb-3 sm:mb-4 flex justify-center">
                <div className="w-16 h-12 sm:w-20 sm:h-14 md:w-24 md:h-16 relative">
                  <Image
                    src={projectData.logo_url}
                    alt={projectData.name}
                    fill
                    className="object-contain drop-shadow-2xl"
                  />
                </div>
              </div>
            )}
            
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3 drop-shadow-lg px-2">
              {mosaicSettings?.title || 'Évaluez les photos'}
            </h1>
            
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 mx-2">
              <p className="text-white/80 text-xs sm:text-sm">
                {galleryImages.length - currentIndex - 1} / {galleryImages.length} photos évaluées
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Zone de swipe principale */}
      <div className="flex-1 flex flex-col justify-center px-3 sm:px-4 pb-3 sm:pb-4">
        <div className="max-w-sm sm:max-w-md lg:max-w-lg mx-auto w-full">
          <div className="relative w-full" style={{ 
            height: 'min(calc(100vh - 240px), calc(100vw - 40px), 600px)',
            minHeight: '400px',
            maxHeight: '600px'
          }}>
            {galleryImages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 sm:p-8 text-center max-w-xs">
                  <div className="text-3xl sm:text-4xl mb-3 sm:mb-4 text-white/60">⊞</div>
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Aucune photo</h2>
                  <p className="text-white/80 text-xs sm:text-sm">
                    Aucune photo à évaluer pour le moment.
                  </p>
                </div>
              </div>
            ) : (
              <AnimatePresence>
                {galleryImages.map((image, index) => (
                  <SwipeCard
                    ref={childRefs.current[index]}
                    key={image.id}
                    onSwipe={(dir) => swiped(dir, image.id, index)}
                    onCardLeftScreen={() => outOfFrame(image.id, index)}
                    className="absolute inset-0 w-full h-full"
                    preventSwipe={['up', 'down']}
                    swipeThreshold={80}
                  >
                    <motion.div
                      className="relative w-full h-full rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl bg-white"
                      style={{
                        backgroundImage: `url(${image.image_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                      
                      {/* Informations de la photo */}
                      <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 text-white">
                        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                          <p className="text-xs sm:text-sm font-medium">
                            Photo {galleryImages.length - index}
                          </p>
                          <p className="text-xs opacity-75">
                            {new Date(image.created_at).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-xs opacity-75">
                            Score: {image.score}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </SwipeCard>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Boutons d'action tactiles optimisés */}
          {galleryImages.length > 0 && !isFinished && (
            <div className="flex justify-center items-center space-x-4 sm:space-x-6 mt-4 sm:mt-6">
              <motion.button
                onClick={() => swipe('left')}
                className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg active:scale-95 touch-manipulation"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                ✕
              </motion.button>
              
              <div className="text-white/60 text-xs sm:text-sm font-medium px-2">
                ou swipez
              </div>
              
              <motion.button
                onClick={() => swipe('right')}
                className="w-14 h-14 sm:w-16 sm:h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg active:scale-95 touch-manipulation"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                ♡
              </motion.button>
            </div>
          )}

          {/* Compteurs compacts */}
          {!isFinished && (
            <div className="flex justify-center space-x-3 sm:space-x-4 mt-3 sm:mt-4">
              <div className="bg-green-500/20 backdrop-blur-sm rounded-full px-3 py-1 sm:px-4 sm:py-2">
                <span className="text-green-300 text-xs sm:text-sm font-medium">♡ {swipeCount.likes}</span>
              </div>
              <div className="bg-red-500/20 backdrop-blur-sm rounded-full px-3 py-1 sm:px-4 sm:py-2">
                <span className="text-red-300 text-xs sm:text-sm font-medium">✕ {swipeCount.passes}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions en bas */}
      <div className="flex-shrink-0 px-4 pb-safe-area-inset-bottom pb-4 sm:pb-6">
        <div className="max-w-sm mx-auto">
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3 sm:p-4 text-center">
            <p className="text-white/80 text-xs sm:text-sm">
              Swipez à droite pour ♡ ou à gauche pour ✕
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
