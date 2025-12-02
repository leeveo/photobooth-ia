'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function PublicGalleryPage() {
  const params = useParams();
  const slug = params?.slug;
  const supabase = createSupabaseClient();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [mosaicSettings, setMosaicSettings] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

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
        .select('id, result_s3_url, result_image_url, created_at, moderation')
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
          metadata: {
            fileName: session.result_s3_url ? session.result_s3_url.split('/').pop() : ''
          }
        }))
        .filter(img => img.image_url);

      setGalleryImages(images);
      setLastRefresh(new Date());
      console.log(`Galerie publique: ${images.length} images chargées`);
    } catch (err) {
      console.error('Erreur de chargement des images:', err);
      setGalleryImages([]);
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 30
    },
    show: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        duration: 0.6
      }
    }
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
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gray-900 p-4">
        <div className="text-center max-w-sm sm:max-w-md mx-auto p-4 sm:p-6">
          <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4 text-white/60">⚠</div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Galerie non accessible</h1>
          <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">{error}</p>
          <a 
            href="/"
            className="inline-block w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base touch-manipulation active:scale-95"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-6" style={getBackgroundStyle()}>
      {/* En-tête avec logo et nom du projet */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="text-center">
          {projectData?.logo_url && (
            <div className="mb-4 flex justify-center">
              <div className="w-32 h-20 relative">
                <Image
                  src={projectData.logo_url}
                  alt={projectData.name}
                  fill
                  className="object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          )}
          
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
            {mosaicSettings?.title || projectData?.name || 'Galerie Photos'}
          </h1>
          
          {mosaicSettings?.description && (
            <p className="text-lg text-white/90 drop-shadow">
              {mosaicSettings.description}
            </p>
          )}
        </div>
      </div>

      {/* Informations de la galerie */}
      <div className="max-w-6xl mx-auto mb-8 text-center">
        <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 inline-block">
          <p className="text-white/80 text-sm">
            {galleryImages.length} photo{galleryImages.length > 1 ? 's' : ''} • 
            Dernière mise à jour: {lastRefresh.toLocaleTimeString('fr-FR')}
          </p>
        </div>
      </div>

      {/* Galerie d'images */}
      {galleryImages.length === 0 ? (
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-12">
            <div className="text-6xl mb-4 text-white/60">⊞</div>
            <h2 className="text-2xl font-bold text-white mb-4">Aucune photo pour le moment</h2>
            <p className="text-white/80">
              Les photos apparaîtront ici au fur et à mesure qu'elles sont prises.
            </p>
          </div>
        </div>
      ) : (
        <div className="max-w-8xl mx-auto">
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            key={lastRefresh.getTime()}
          >
            {galleryImages.map((image, index) => (
              <motion.div
                key={image.id}
                className="aspect-square w-full"
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
              >
                <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg group cursor-pointer">
                  <Image
                    src={image.image_url}
                    alt={`Photo ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-image.png';
                    }}
                  />
                  
                  {/* Overlay au survol */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-2xl mb-2">⌕</div>
                      <p className="text-sm">Voir en grand</p>
                    </div>
                  </div>
                  
                  {/* Badge "nouveau" pour les premières images */}
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
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-16 text-center">
        <div className="bg-black/20 backdrop-blur-sm rounded-lg p-6">
          <p className="text-white/60 text-sm">
            Galerie publique • {projectData?.name}
          </p>
        </div>
      </div>
    </div>
  );
}
