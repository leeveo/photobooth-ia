'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import Image from 'next/image';

// Composant de carte swipable personnalisé
const SwipeCard = ({ image, onSwipe, children, ...props }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-30, 30]);
  const opacity = useTransform(x, [-300, -100, 0, 100, 300], [0, 1, 1, 1, 0]);

  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    
    const threshold = 100;
    const direction = info.offset.x > threshold ? 'right' : info.offset.x < -threshold ? 'left' : null;
    
    if (direction) {
      onSwipe(direction);
    } else {
      // Retour à la position initiale
      x.set(0);
      y.set(0);
    }
  };

  return (
    <motion.div
      className="absolute w-full h-full cursor-grab active:cursor-grabbing"
      style={{ x, y, rotate, opacity }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileHover={{ scale: isDragging ? 1 : 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

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

  // Gérer le swipe
  const swiped = (direction, imageId, index) => {
    console.log(`Swipe ${direction} sur l'image ${imageId}`);
    
    const liked = direction === 'right';
    setLastDirection(direction);
    
    // Mettre à jour les compteurs
    setSwipeCount(prev => ({
      likes: prev.likes + (liked ? 1 : 0),
      passes: prev.passes + (liked ? 0 : 1)
    }));

    // Mettre à jour le score dans la base de données
    updateImageScore(imageId, liked);
    
    // Passer à l'image suivante
    setCurrentIndex(prev => prev - 1);
    
    // Vérifier si on a fini toutes les images
    if (index === 0) {
      setIsFinished(true);
    }
  };

  // Swipe programmatique
  const handleSwipeButton = (direction) => {
    if (currentIndex >= 0 && galleryImages[currentIndex]) {
      swiped(direction, galleryImages[currentIndex].id, currentIndex);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Chargement de la galerie...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-white mb-4">Galerie non accessible</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <a 
            href="/"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={getBackgroundStyle()}>
        <div className="text-center max-w-md mx-auto p-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Terminé !</h1>
            <p className="text-gray-600 mb-6">
              Vous avez évalué toutes les photos !
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-100 rounded-lg p-4">
                <div className="text-2xl text-green-600">👍</div>
                <div className="text-lg font-bold text-green-800">{swipeCount.likes}</div>
                <div className="text-sm text-green-600">J'aime</div>
              </div>
              <div className="bg-red-100 rounded-lg p-4">
                <div className="text-2xl text-red-600">👎</div>
                <div className="text-lg font-bold text-red-800">{swipeCount.passes}</div>
                <div className="text-sm text-red-600">Passer</div>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Recommencer
              </button>
              <a
                href={`/photobooth-coiffure/${slug}/results`}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Voir les résultats
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4" style={getBackgroundStyle()}>
      {/* En-tête */}
      <div className="max-w-md mx-auto mb-8">
        <div className="text-center">
          {projectData?.logo_url && (
            <div className="mb-4 flex justify-center">
              <div className="w-24 h-16 relative">
                <Image
                  src={projectData.logo_url}
                  alt={projectData.name}
                  fill
                  className="object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          )}
          
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-lg">
            {mosaicSettings?.title || 'Évaluez les photos'}
          </h1>
          
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3">
            <p className="text-white/80 text-sm">
              {galleryImages.length - currentIndex - 1} / {galleryImages.length} photos évaluées
            </p>
          </div>
        </div>
      </div>

      {/* Zone de swipe */}
      <div className="max-w-md mx-auto relative">
        <div className="relative h-[600px] w-full">
          {galleryImages.length === 0 ? (
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
                <div className="text-4xl mb-4">📸</div>
                <h2 className="text-xl font-bold text-white mb-2">Aucune photo</h2>
                <p className="text-white/80 text-sm">
                  Aucune photo à évaluer pour le moment.
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {galleryImages.map((image, index) => {
                if (index > currentIndex + 2 || index < currentIndex - 1) return null;
                
                const isTop = index === currentIndex;
                
                return (
                  <SwipeCard
                    key={image.id}
                    image={image}
                    onSwipe={(direction) => swiped(direction, image.id, index)}
                    style={{
                      zIndex: isTop ? 10 : 9 - (currentIndex - index),
                      scale: isTop ? 1 : 0.95 - (currentIndex - index) * 0.05,
                    }}
                  >
                    <motion.div
                      className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-white"
                      style={{
                        backgroundImage: `url(${image.image_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ 
                        scale: isTop ? 1 : 0.95 - (currentIndex - index) * 0.05, 
                        opacity: 1 
                      }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      
                      {/* Informations de la photo */}
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <p className="text-sm opacity-75">
                          Photo {galleryImages.length - index}
                        </p>
                        <p className="text-xs opacity-60">
                          {new Date(image.created_at).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-xs opacity-60">
                          Score actuel: {image.score}
                        </p>
                      </div>

                      {/* Instructions pour les gestes */}
                      {isTop && (
                        <div className="absolute top-4 left-4 right-4 text-white text-center">
                          <motion.p 
                            className="text-sm opacity-75 bg-black/30 rounded-lg px-3 py-1"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 0.75, y: 0 }}
                            transition={{ delay: 0.5 }}
                          >
                            Glissez ou utilisez les boutons
                          </motion.p>
                        </div>
                      )}
                    </motion.div>
                  </SwipeCard>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Boutons d'action */}
        {galleryImages.length > 0 && !isFinished && currentIndex >= 0 && (
          <div className="flex justify-center space-x-6 mt-8">
            <motion.button
              onClick={() => handleSwipeButton('left')}
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ❌
            </motion.button>
            
            <motion.button
              onClick={() => handleSwipeButton('right')}
              className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ❤️
            </motion.button>
          </div>
        )}

        {/* Compteurs */}
        {!isFinished && (
          <div className="flex justify-center space-x-4 mt-6">
            <div className="bg-green-500/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-green-300 text-sm">❤️ {swipeCount.likes}</span>
            </div>
            <div className="bg-red-500/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-red-300 text-sm">❌ {swipeCount.passes}</span>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 text-center">
          <p className="text-white/80 text-sm">
            Glissez à droite pour ❤️ ou à gauche pour ❌
          </p>
        </div>
      </div>
    </div>
  );
}
