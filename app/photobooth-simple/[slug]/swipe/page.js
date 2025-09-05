'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import Image from 'next/image';

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
          score: session.score || 0
        }))
        .filter(img => img.image_url);

      setGalleryImages(images);
      setCurrentIndex(0);
      
      console.log(`Galerie swipe: ${images.length} images chargées`);
    } catch (err) {
      console.error('Erreur de chargement des images:', err);
      setGalleryImages([]);
    }
  };

  // Fonction pour évaluer une image
  const rateImage = async (liked) => {
    if (currentIndex >= galleryImages.length) return;
    
    const currentImage = galleryImages[currentIndex];
    
    // Mettre à jour les compteurs
    setSwipeCount(prev => ({
      likes: prev.likes + (liked ? 1 : 0),
      passes: prev.passes + (liked ? 0 : 1)
    }));

    // Mettre à jour le score dans la base de données
    try {
      const response = await fetch('/api/update-image-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: currentImage.id,
          liked,
          projectId: projectData?.id
        })
      });

      if (!response.ok) {
        console.error('Erreur lors de la mise à jour du score');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du score:', error);
    }

    // Passer à l'image suivante
    const nextIndex = currentIndex + 1;
    if (nextIndex >= galleryImages.length) {
      setIsFinished(true);
    } else {
      setCurrentIndex(nextIndex);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Chargement de la galerie...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4 text-white/60">⚠</div>
          <h1 className="text-2xl font-bold text-white mb-4">Galerie non accessible</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <a 
            href="/"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={getBackgroundStyle()}>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="text-8xl mb-4 text-white/90">🎉</div>
          <h1 
            className="text-5xl font-extrabold mb-4 drop-shadow-lg"
            style={{ color: primaryColor }}
          >
            Merci !
          </h1>
          <p 
            className="text-2xl font-semibold"
            style={{ color: secondaryColor }}
          >
            Vous avez évalué toutes les photos
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <div className="flex gap-4 justify-center items-center mb-8">
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-500 hover:scale-105"
              style={{
                background: `linear-gradient(45deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
              }}
            >
              ↻ Recommencer
            </button>
            
            <a
              href={`/photobooth-simple/${slug}/gallery`}
              className="px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-500 hover:scale-105 text-center"
              style={{
                background: `linear-gradient(45deg, ${secondaryColor} 0%, ${primaryColor} 100%)`,
                textDecoration: 'none'
              }}
            >
              ⊞ Voir toutes les photos
            </a>
          </div>
          
          {/* Statistiques personnelles */}
          <div className="p-6 rounded-2xl max-w-sm mx-auto" style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)'
          }}>
            <h3 className="text-xl font-black mb-4 text-center text-white">
              Vos votes de cette session
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-xl bg-green-500/20">
                <div className="text-3xl mb-2">♡</div>
                <div className="text-2xl font-black text-green-300">{swipeCount.likes}</div>
                <div className="text-sm font-bold text-green-200">J'aime</div>
              </div>
              
              <div className="text-center p-3 rounded-xl bg-red-500/20">
                <div className="text-3xl mb-2">✕</div>
                <div className="text-2xl font-black text-red-300">{swipeCount.passes}</div>
                <div className="text-sm font-bold text-red-200">Passé</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentImage = galleryImages[currentIndex];

  return (
    <div className="min-h-screen flex flex-col" style={getBackgroundStyle()}>
      {/* En-tête */}
      <div className="flex-shrink-0 w-full px-4 py-6">
        <div className="max-w-md mx-auto text-center">
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
          
          <h1 className="text-3xl font-bold text-white mb-3 drop-shadow-lg">
            {mosaicSettings?.title || 'Évaluez les photos'}
          </h1>
          
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3">
            <p className="text-white/80 text-sm">
              {currentIndex + 1} / {galleryImages.length} photos
            </p>
          </div>
        </div>
      </div>

      {/* Zone principale */}
      <div className="flex-1 flex flex-col justify-center px-4">
        <div className="max-w-md mx-auto w-full">
          {currentImage && (
            <motion.div
              key={currentImage.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full h-96 rounded-2xl overflow-hidden shadow-2xl mb-6"
            >
              <img
                src={currentImage.image_url}
                alt={`Photo ${currentIndex + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Informations */}
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-sm font-medium">Photo {currentIndex + 1}</p>
                  <p className="text-xs opacity-75">
                    {new Date(currentImage.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Boutons d'action */}
          <div className="flex justify-center items-center space-x-6 mb-6">
            <motion.button
              onClick={() => rateImage(false)}
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
            >
              ✕
            </motion.button>
            
            <motion.button
              onClick={() => rateImage(true)}
              className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
            >
              ♡
            </motion.button>
          </div>

          {/* Compteurs */}
          <div className="flex justify-center space-x-4">
            <div className="bg-green-500/20 backdrop-blur-sm rounded-full px-4 py-2">
              <span className="text-green-300 font-medium">♡ {swipeCount.likes}</span>
            </div>
            <div className="bg-red-500/20 backdrop-blur-sm rounded-full px-4 py-2">
              <span className="text-red-300 font-medium">✕ {swipeCount.passes}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex-shrink-0 px-4 pb-6">
        <div className="max-w-sm mx-auto">
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 text-center">
            <p className="text-white/80 text-sm">
              Cliquez sur ♡ pour aimer ou ✕ pour passer
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
