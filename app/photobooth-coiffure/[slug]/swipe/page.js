'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabaseClient';
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
  const supabase = createSupabaseClient();
  
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
    
    // Ajouter une meta viewport si elle n'existe pas
    const existingViewport = document.querySelector('meta[name="viewport"]');
    if (!existingViewport) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(viewport);
    }

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
        {/* Grid technologique en arrière-plan */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              animation: 'float 20s ease-in-out infinite'
            }}
          ></div>
        </div>
        
        {/* Particules flottantes d'ambiance */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse opacity-30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            ></div>
          ))}
        </div>
        
        {/* Rayons lumineux depuis le centre */}
        <div className="absolute inset-0 pointer-events-none">
          <div 
            className="absolute top-1/2 left-1/2 w-96 h-96 transform -translate-x-1/2 -translate-y-1/2 opacity-20"
            style={{
              background: `conic-gradient(from 0deg, transparent, ${primaryColor}40, transparent, ${secondaryColor}40, transparent)`,
              animation: 'spin 30s linear infinite'
            }}
          ></div>
        </div>

        <div className="w-full max-w-sm sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="text-center mb-6 sm:mb-8"
          >
            <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl mb-3 sm:mb-4 text-white/90">🥇</div>
            <h1 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold mb-3 sm:mb-4 drop-shadow-lg px-2"
              style={{ color: primaryColor }}
            >
              PODIUM DES GAGNANTS
            </h1>
            <p 
              className="text-sm sm:text-lg md:text-xl lg:text-2xl font-semibold px-4"
              style={{ color: secondaryColor }}
            >
              Les 3 photos préférées de tous les participants
            </p>
          </motion.div>

          {topPhotos.length > 0 ? (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="relative"
            >
              {/* Effet de particules en arrière-plan */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
                <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '3s' }}></div>
              </div>

              {/* Container responsive avec design Web3 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 md:gap-6 lg:gap-8 items-end">
                
                {/* 2ème place */}
                {topPhotos[1] && (
                  <motion.div
                    initial={{ y: 30, opacity: 0, rotateY: -15 }}
                    animate={{ y: 0, opacity: 1, rotateY: 0 }}
                    transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
                    className="flex flex-col items-center order-2 sm:order-1"
                  >
                    <div className="relative group">
                      {/* Aura lumineuse animée */}
                      <div 
                        className="absolute -inset-4 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"
                        style={{
                          background: `conic-gradient(from 0deg, ${secondaryColor}, ${primaryColor}, ${secondaryColor})`
                        }}
                      ></div>
                      
                      {/* Conteneur principal avec glassmorphism */}
                      <div 
                        className="relative p-4 sm:p-5 md:p-6 rounded-3xl shadow-2xl backdrop-blur-xl border border-white/20 w-full max-w-xs sm:max-w-sm transform transition-all duration-500 hover:scale-105"
                        style={{
                          background: `linear-gradient(135deg, 
                            rgba(255,255,255,0.1) 0%, 
                            rgba(255,255,255,0.05) 50%, 
                            rgba(0,0,0,0.1) 100%)`,
                          boxShadow: `0 25px 45px -10px rgba(0,0,0,0.3), 
                                     inset 0 1px 0 rgba(255,255,255,0.2),
                                     0 0 30px rgba(192,192,192,0.3)`
                        }}
                      >
                        {/* Badge avec effet néon */}
                        <div 
                          className="absolute -top-4 sm:-top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-lg sm:text-xl md:text-2xl font-black text-white shadow-2xl border-2 border-white/30 z-20"
                          style={{ 
                            background: `linear-gradient(45deg, #C0C0C0, #E8E8E8, #C0C0C0)`,
                            boxShadow: `0 0 20px rgba(192,192,192,0.8), inset 0 2px 4px rgba(255,255,255,0.3)`
                          }}
                        >
                          2
                        </div>
                        
                        {/* Hologramme effect sur l'image */}
                        <div className="relative overflow-hidden rounded-2xl mb-4 group z-10">
                          <img
                            src={topPhotos[1].image_url}
                            alt="2ème place"
                            className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          {/* Overlay holographique */}
                          <div 
                            className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                            style={{
                              background: `linear-gradient(45deg, 
                                transparent 30%, 
                                rgba(0,255,255,0.3) 50%, 
                                transparent 70%)`
                            }}
                          ></div>

                        </div>
                        
                        {/* Stats avec effet néon */}
                        <div className="text-center space-y-3">
                          <div className="flex justify-center gap-2 sm:gap-3">
                            <div 
                              className="flex items-center gap-1 px-3 py-1.5 rounded-full backdrop-blur-sm border border-green-400/30 shadow-lg"
                              style={{ 
                                background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))',
                                boxShadow: '0 0 15px rgba(34,197,94,0.4)'
                              }}
                            >
                              <span className="text-sm text-white">♡</span>
                              <span className="text-white font-bold text-sm">{topPhotos[1].likes}</span>
                            </div>
                            <div 
                              className="flex items-center gap-1 px-3 py-1.5 rounded-full backdrop-blur-sm border border-red-400/30 shadow-lg"
                              style={{ 
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))',
                                boxShadow: '0 0 15px rgba(239,68,68,0.4)'
                              }}
                            >
                              <span className="text-sm text-white">✕</span>
                              <span className="text-white font-bold text-sm">{topPhotos[1].dislikes}</span>
                            </div>
                          </div>
                          
                          {/* Score avec animation de compteur */}
                          <motion.div 
                            className="text-lg sm:text-xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1, type: "spring", stiffness: 200 }}
                          >
                            Score: {topPhotos[1].score}
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 1ère place - Design champion */}
                {topPhotos[0] && (
                  <motion.div
                    initial={{ y: 50, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                    className="flex flex-col items-center order-1 sm:order-2 relative z-10"
                  >
                    <div className="relative group">
                      {/* Aura champion avec rotation */}
                      <div 
                        className="absolute -inset-8 rounded-full blur-2xl opacity-50 animate-spin-slow"
                        style={{
                          background: `conic-gradient(from 0deg, #FFD700, ${secondaryColor}, #FFD700, ${primaryColor}, #FFD700)`,
                          animation: 'spin 8s linear infinite'
                        }}
                      ></div>
                      
                      {/* Ring de lumière secondaire */}
                      <div 
                        className="absolute -inset-6 rounded-full opacity-30 animate-pulse"
                        style={{
                          background: `radial-gradient(circle, transparent 60%, ${secondaryColor}40 70%, transparent 80%)`
                        }}
                      ></div>
                      
                      {/* Conteneur champion */}
                      <div 
                        className="relative p-5 sm:p-6 md:p-8 rounded-3xl shadow-2xl backdrop-blur-xl border-2 border-yellow-400/30 w-full max-w-sm sm:max-w-md transform transition-all duration-700 hover:scale-110"
                        style={{
                          background: `linear-gradient(135deg, 
                            rgba(255,215,0,0.15) 0%, 
                            rgba(255,255,255,0.1) 30%,
                            rgba(255,215,0,0.1) 60%,
                            rgba(0,0,0,0.1) 100%)`,
                          boxShadow: `0 30px 60px -10px rgba(255,215,0,0.4), 
                                     inset 0 1px 0 rgba(255,255,255,0.3),
                                     0 0 50px rgba(255,215,0,0.6)`
                        }}
                      >
                        {/* Couronne avec effet royal */}
                        <div 
                          className="absolute -top-6 sm:-top-8 left-1/2 transform -translate-x-1/2 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl md:text-4xl shadow-2xl border-3 border-yellow-300/50 text-white z-30"
                          style={{ 
                            background: `radial-gradient(circle, #FFD700, #FFA500, #FFD700)`,
                            boxShadow: `0 0 30px rgba(255,215,0,1), inset 0 3px 6px rgba(255,255,255,0.4)`,
                            animation: 'glow 2s ease-in-out infinite alternate'
                          }}
                        >
                          🥇
                        </div>
                        
                        {/* Image avec effet prismatique */}
                        <div className="relative overflow-hidden rounded-2xl mb-4 sm:mb-6 group z-10">
                          <img
                            src={topPhotos[0].image_url}
                            alt="1ère place"
                            className="w-full aspect-square object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                          />
                          {/* Overlay prismatique */}
                          <div 
                            className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-500"
                            style={{
                              background: `linear-gradient(45deg, 
                                rgba(255,0,255,0.2) 0%,
                                rgba(0,255,255,0.2) 25%, 
                                rgba(255,255,0,0.2) 50%,
                                rgba(255,0,255,0.2) 75%,
                                rgba(0,255,255,0.2) 100%)`
                            }}
                          ></div>
                          {/* Particules flottantes */}
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-60"></div>
                            <div className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-white rounded-full animate-pulse opacity-80"></div>
                            <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-cyan-400 rounded-full animate-ping opacity-70" style={{ animationDelay: '1s' }}></div>
                          </div>
                        </div>
                        
                        {/* Stats premium */}
                        <div className="text-center space-y-4">
                          <div className="flex justify-center gap-3 sm:gap-4">
                            <div 
                              className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border border-green-400/40 shadow-xl"
                              style={{ 
                                background: 'linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.1))',
                                boxShadow: '0 0 25px rgba(34,197,94,0.6)'
                              }}
                            >
                              <span className="text-base sm:text-lg text-white">♡</span>
                              <span className="text-white font-black text-base sm:text-lg">{topPhotos[0].likes}</span>
                            </div>
                            <div 
                              className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border border-red-400/40 shadow-xl"
                              style={{ 
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(239,68,68,0.1))',
                                boxShadow: '0 0 25px rgba(239,68,68,0.6)'
                              }}
                            >
                              <span className="text-base sm:text-lg text-white">✕</span>
                              <span className="text-white font-black text-base sm:text-lg">{topPhotos[0].dislikes}</span>
                            </div>
                          </div>
                          
                          {/* Score champion animé */}
                          <motion.div 
                            className="text-xl sm:text-2xl md:text-3xl font-black"
                            style={{ 
                              background: `linear-gradient(45deg, #FFD700, #FFA500, #FFD700)`,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.8))'
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
                          >
                            Score: {topPhotos[0].score}
                          </motion.div>
                          
                          {/* Label champion */}
                          <motion.div 
                            className="text-sm sm:text-base md:text-lg font-black bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.5 }}
                          >
                            🥇 CHAMPION 🥇
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3ème place */}
                {topPhotos[2] && (
                  <motion.div
                    initial={{ y: 20, opacity: 0, rotateY: 15 }}
                    animate={{ y: 0, opacity: 1, rotateY: 0 }}
                    transition={{ delay: 0.7, type: "spring", stiffness: 100 }}
                    className="flex flex-col items-center order-3"
                  >
                    <div className="relative group">
                      {/* Aura bronze */}
                      <div 
                        className="absolute -inset-3 rounded-full blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-500"
                        style={{
                          background: `conic-gradient(from 0deg, #CD7F32, ${primaryColor}, #CD7F32)`
                        }}
                      ></div>
                      
                      {/* Conteneur bronze */}
                      <div 
                        className="relative p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-xl backdrop-blur-lg border border-white/15 w-full max-w-xs transform transition-all duration-500 hover:scale-105"
                        style={{
                          background: `linear-gradient(135deg, 
                            rgba(205,127,50,0.1) 0%, 
                            rgba(255,255,255,0.05) 50%, 
                            rgba(0,0,0,0.1) 100%)`,
                          boxShadow: `0 20px 35px -10px rgba(0,0,0,0.25), 
                                     inset 0 1px 0 rgba(255,255,255,0.15),
                                     0 0 20px rgba(205,127,50,0.3)`
                        }}
                      >
                        {/* Badge bronze */}
                        <div 
                          className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-lg font-bold text-white shadow-lg border border-white/20 z-20"
                          style={{ 
                            background: `linear-gradient(45deg, #CD7F32, #D2691E, #CD7F32)`,
                            boxShadow: `0 0 15px rgba(205,127,50,0.6), inset 0 1px 2px rgba(255,255,255,0.2)`
                          }}
                        >
                          3
                        </div>
                        
                        {/* Image avec effet subtil */}
                        <div className="relative overflow-hidden rounded-xl mb-3 sm:mb-4 group z-10">
                          <img
                            src={topPhotos[2].image_url}
                            alt="3ème place"
                            className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          {/* Overlay bronze */}
                          <div 
                            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                            style={{
                              background: `linear-gradient(45deg, transparent 40%, rgba(205,127,50,0.3) 60%, transparent 80%)`
                            }}
                          ></div>
                        </div>
                        
                        {/* Stats compactes */}
                        <div className="text-center space-y-2">
                          <div className="flex justify-center gap-2">
                            <div 
                              className="flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm border border-green-400/20 shadow-md"
                              style={{ 
                                background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                                boxShadow: '0 0 10px rgba(34,197,94,0.3)'
                              }}
                            >
                              <span className="text-xs text-white">♡</span>
                              <span className="text-white font-bold text-xs">{topPhotos[2].likes}</span>
                            </div>
                            <div 
                              className="flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm border border-red-400/20 shadow-md"
                              style={{ 
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
                                boxShadow: '0 0 10px rgba(239,68,68,0.3)'
                              }}
                            >
                              <span className="text-xs text-white">✕</span>
                              <span className="text-white font-bold text-xs">{topPhotos[2].dislikes}</span>
                            </div>
                          </div>
                          
                          <motion.div 
                            className="text-sm sm:text-base font-black bg-gradient-to-r from-orange-400 to-yellow-600 bg-clip-text text-transparent"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                          >
                            Score: {topPhotos[2].score}
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 mx-auto mb-4" style={{ borderColor: primaryColor }}></div>
              <p style={{ color: secondaryColor }} className="text-base sm:text-xl font-semibold">
                Chargement du classement...
              </p>
            </motion.div>
          )}

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
                {/* Effet de brillance au survol */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
                    transform: 'translateX(-100%)',
                    animation: 'shimmer 2s infinite'
                  }}
                ></div>
                
                {/* Border lumineux */}
                <div 
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(45deg, ${secondaryColor}, ${primaryColor}, ${secondaryColor})`,
                    padding: '1px'
                  }}
                >
                  <div 
                    className="w-full h-full rounded-xl"
                    style={{
                      background: `linear-gradient(45deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                    }}
                  ></div>
                </div>
                
                <span className="relative z-10">↻ Recommencer</span>
              </motion.button>
              
              <motion.a
                href={`/photobooth-coiffure/${slug}/gallery`}
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
                {/* Effet de brillance au survol */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
                    transform: 'translateX(-100%)',
                    animation: 'shimmer 2s infinite'
                  }}
                ></div>
                
                {/* Particules flottantes */}
                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute top-2 left-4 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
                  <div className="absolute bottom-3 right-6 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                  <div className="absolute top-1/2 right-4 w-0.5 h-0.5 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
                </div>
                
                <span className="relative z-10">⊞ Voir toutes les photos</span>
              </motion.a>
            </div>
            
            {/* Statistiques personnelles avec design Web3 */}
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
              {/* Effet de scan lumineux */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"
                style={{
                  background: `linear-gradient(45deg, 
                    transparent 30%, 
                    rgba(255,255,255,0.1) 50%, 
                    transparent 70%)`,
                  animation: 'shimmer 3s infinite'
                }}
              ></div>
              
              {/* Particules d'ambiance */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-4 right-4 w-1 h-1 bg-cyan-400 rounded-full animate-ping opacity-60" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-6 left-6 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse opacity-50" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 left-4 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-70" style={{ animationDelay: '4s' }}></div>
              </div>
              
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
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: '0 15px 35px rgba(34,197,94,0.4)'
                    }}
                  >
                    {/* Aura verte */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover/stat:opacity-30 transition-opacity duration-500"
                      style={{
                        background: 'radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)'
                      }}
                    ></div>
                    
                    <div className="relative z-10">
                      <motion.div 
                        className="text-2xl sm:text-3xl mb-2"
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 3
                        }}
                      >
                        ♡
                      </motion.div>
                      <motion.div 
                        className="text-xl sm:text-2xl font-black text-green-300 mb-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1.5, type: "spring", stiffness: 300 }}
                      >
                        {swipeCount.likes}
                      </motion.div>
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
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: '0 15px 35px rgba(239,68,68,0.4)'
                    }}
                  >
                    {/* Aura rouge */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover/stat:opacity-30 transition-opacity duration-500"
                      style={{
                        background: 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)'
                      }}
                    ></div>
                    
                    <div className="relative z-10">
                      <motion.div 
                        className="text-2xl sm:text-3xl mb-2"
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, -5, 5, 0]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 3,
                          delay: 1
                        }}
                      >
                        ✕
                      </motion.div>
                      <motion.div 
                        className="text-xl sm:text-2xl font-black text-red-300 mb-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1.6, type: "spring", stiffness: 300 }}
                      >
                        {swipeCount.passes}
                      </motion.div>
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

      {/* Zone de swipe principale - prend tout l'espace disponible */}
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

                      {/* Indicateurs de swipe plus visibles */}
                      <motion.div
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 0, scale: 1 }}
                      >
                        <div className="text-4xl sm:text-5xl md:text-6xl">❤️</div>
                      </motion.div>
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

      {/* Instructions en bas - toujours visibles */}
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
