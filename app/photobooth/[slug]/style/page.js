'use client';

import { useState, useEffect, useRef } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import './style.css'; // Import CSS for masonry grid

export default function PhotoboothStyles({ params }) {
  const { slug } = params;
  const supabase = createClientComponentClient();
  const router = useRouter();
  const scrollRef = useRef(null);
  
  const [project, setProject] = useState(null);
  const [styles, setStyles] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Simplified state - removed filtering states
  const [visibleCount, setVisibleCount] = useState(50);
  
  // Effect for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 100) {
          setVisibleCount(prev => Math.min(prev + 10, styles.length));
        }
      }
    };

    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [styles.length]);

  // Fetch project and styles data
  useEffect(() => {
    async function fetchProjectAndStyles() {
      try {
        console.log('Fetching project data for slug:', slug);
        
        // Fetch project data by slug
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();
          
        if (projectError || !projectData) {
          console.error('Project not found or inactive:', projectError);
          return notFound();
        }
        
        console.log('Project data fetched successfully:', projectData.id);
        
        // Fetch styles for this project
        const { data: stylesData, error: stylesError } = await supabase
          .from('styles')
          .select('*')
          .eq('project_id', projectData.id)
          .eq('is_active', true);
          
        if (stylesError) {
          console.error('Error fetching styles:', stylesError);
          throw stylesError;
        }
        
        console.log(`Fetched ${stylesData?.length || 0} styles for project`);
        
        // Process styles to ensure we have valid image URLs
        const processedStyles = stylesData?.map(style => {
          if (!style.preview_image) {
            console.warn(`Style ${style.id} (${style.name}) has no preview_image`);
            return style;
          }
          
          console.log(`Original style image URL for ${style.name}:`, style.preview_image);
          
          // Fix URLs that are just paths or references
          if (style.preview_image && !style.preview_image.startsWith('http')) {
            // If it looks like a storage path
            if (style.preview_image.includes('/')) {
              try {
                const publicUrl = supabase.storage
                  .from('styles')
                  .getPublicUrl(style.preview_image).data.publicUrl;
                console.log(`Generated public URL for ${style.name}:`, publicUrl);
                style.preview_image = publicUrl;
              } catch (e) {
                console.error(`Error generating URL for ${style.name}:`, e);
              }
            } else {
              // Maybe it's just a filename
              try {
                const publicUrl = `https://leeveostockage.s3.eu-west-3.amazonaws.com/style/${style.preview_image}`;
                console.log(`Created full URL for ${style.name}:`, publicUrl);
                style.preview_image = publicUrl;
              } catch (e) {
                console.error(`Error creating URL for ${style.name}:`, e);
              }
            }
          }
          
          return style;
        }) || [];
        
        setProject(projectData);
        localStorage.setItem('projectData', JSON.stringify(projectData));
        localStorage.setItem('currentProjectId', projectData.id);
        localStorage.setItem('currentProjectSlug', slug);
        
        setStyles(processedStyles);
        
      } catch (error) {
        console.error('Error loading project data:', error);
        setError('Impossible de charger les données du projet');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProjectAndStyles();
  }, [slug, supabase]);
  
  const handleStyleSelect = (style) => {
    setSelectedStyle(style);
    localStorage.setItem('selectedStyleId', style.id);
    localStorage.setItem('selectedStyleData', JSON.stringify(style)); 
    
    // Store style image URL for fal.ai processing
    localStorage.setItem('styleFix', style.preview_image);
    
    // Store style gender for processing
    localStorage.setItem('styleGenderFix', style.gender || 'g');
    localStorage.setItem('styleGender', style.gender || 'g');
    
    // Show confirmation modal
    setShowConfirmModal(true);
  };
  
  const handleStartClick = () => {
    if (!selectedStyle) {
      setError('Veuillez sélectionner un style avant de continuer');
      return;
    }
    
    // Navigate to camera page
    router.push(`/photobooth/${slug}/cam`);
  };
  
  // Function to close the modal
  const closeModal = () => {
    setShowConfirmModal(false);
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-500">
        {error}
      </div>
    );
  }
  
  if (!project) {
    return notFound();
  }
  
  // Dynamic styles based on project colors
  const primaryColor = project.primary_color || '#811A53';
  const secondaryColor = project.secondary_color || '#E5E40A';

  return (
    <main 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: primaryColor }}
      ref={scrollRef}
    >
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 py-8 lg:py-12 flex flex-col flex-grow">
        {/* Logo et message d'accueil */}
        <div className="flex flex-col items-center mb-10">
          {project.logo_url ? (
            <img 
              src={project.logo_url} 
              alt={project.name} 
              className="max-w-xs w-full mb-8 drop-shadow-2xl"
            />
          ) : (
            <h1 className="text-3xl font-bold text-white mb-8">{project.name}</h1>
          )}
          
          <h2 
            className="text-3xl sm:text-5xl font-bold text-center"
            style={{ color: secondaryColor }}
          >
            {project.home_message || "Choisissez votre style préféré"}
          </h2>
          <p className="mt-6 text-white text-opacity-90 text-center max-w-3xl text-xl">
            Sélectionnez un style parmi ceux disponibles ci-dessous pour créer votre portrait personnalisé
          </p>
        </div>
        
        {/* Styles selection - with masonry layout */}
        <div className="mb-16 flex-grow flex flex-col items-center justify-center">
          <h3 className="text-2xl font-semibold text-center mb-8" style={{ color: secondaryColor }}>
            Nos styles disponibles
          </h3>
          {styles.length === 0 ? (
            <p className="text-center text-white text-xl">Aucun style disponible pour ce projet</p>
          ) : (
            <div className="w-full max-w-[1800px] mx-auto">
              {/* Masonry layout using CSS columns */}
              <div className="masonry-grid">
                {styles.slice(0, visibleCount).map((style, index) => (
                  <motion.div 
                    key={style.id}
                    className="masonry-item mb-4 inline-block w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                  >
                    <div 
                      className={`cursor-pointer overflow-hidden rounded-2xl backdrop-blur-sm bg-white/10 shadow-lg hover:shadow-xl transition-all transform duration-300 border-2 ${
                        selectedStyle?.id === style.id 
                          ? 'border-white scale-105 shadow-xl' 
                          : 'border-transparent hover:scale-[1.03]'
                      }`}
                      onClick={() => handleStyleSelect(style)}
                    >
                      {/* Image with random heights for masonry effect */}
                      <div 
                        className="relative overflow-hidden"
                        style={{ 
                          height: `${Math.floor(Math.random() * 100) + 250}px` 
                        }}
                      >
                        {style.preview_image ? (
                          <>
                            <img 
                              src={style.preview_image}
                              alt={style.name}
                              className="object-cover w-full h-full transition-transform duration-700 hover:scale-110"
                              onError={(e) => {
                                console.error(`Failed to load image for style ${style.name}`);
                                e.target.style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-70 group-hover:opacity-100 transition-opacity"></div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                              <button className="px-8 py-3 bg-white rounded-full text-purple-900 font-bold shadow-lg transform hover:scale-105 transition-transform text-lg">
                                Sélectionner
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-300">
                            <span className="text-gray-500 text-lg">Pas d&apos;image</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Informations du style */}
                      <div className="p-5">
                        <h4 className="font-bold text-white text-xl tracking-tight">
                          {style.name}
                        </h4>
                        {style.description && (
                          <p className="mt-2 text-white/80 text-base line-clamp-2">
                            {style.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Badge de sélection */}
                      {selectedStyle?.id === style.id && (
                        <div className="absolute top-4 right-4 bg-white/90 text-purple-900 text-sm font-bold px-3 py-1.5 rounded-full">
                          Sélectionné
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Bouton "Charger plus" si tous les styles ne sont pas affichés */}
        {visibleCount < styles.length && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setVisibleCount(prev => Math.min(prev + 10, styles.length))}
              className="px-8 py-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-medium transition-colors text-lg"
            >
              Afficher plus de styles ({styles.length - visibleCount} restants)
            </button>
          </div>
        )}
        
        {/* Fenêtre modale de confirmation - Version redesignée */}
        <AnimatePresence>
          {showConfirmModal && selectedStyle && (
            <motion.div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            >
              {/* Fond flouté avec effet glassmorphism */}
              <motion.div 
                className="absolute inset-0 backdrop-blur-md bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              ></motion.div>
              
              {/* Contenu du popup */}
              <motion.div 
                className="relative max-w-md w-full rounded-2xl overflow-hidden shadow-2xl"
                initial={{ scale: 0.9, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 30, opacity: 0 }}
                transition={{ 
                  type: "spring", 
                  damping: 25, 
                  stiffness: 300,
                  duration: 0.3
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header avec dégradé coloré */}
                <div 
                  className="w-full h-2" 
                  style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
                ></div>
                
                {/* Image du style avec overlay et effet d'échelle */}
                <div className="relative w-full h-64 bg-gray-900">
                  {selectedStyle.preview_image ? (
                    <>
                      <motion.img 
                        src={selectedStyle.preview_image}
                        alt={selectedStyle.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 1.5 }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-800">
                      <span className="text-gray-400">Pas d'image disponible</span>
                    </div>
                  )}
                  
                  {/* Badge du style */}
                  <div className="absolute bottom-6 left-6 right-6">
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                    >
                      <h3 className="text-white text-2xl font-bold mb-1 drop-shadow-md">
                        {selectedStyle.name}
                      </h3>
                      {selectedStyle.description && (
                        <p className="text-white/80 text-sm line-clamp-2 drop-shadow-md">
                          {selectedStyle.description}
                        </p>
                      )}
                    </motion.div>
                  </div>
                </div>
                
                {/* Corps du popup */}
                <div className="bg-white p-6">
                  <motion.div
                    className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <h4 className="text-gray-800 font-semibold mb-2">Confirmation du style</h4>
                    <p className="text-gray-600">
                      Vous avez sélectionné <span className="font-semibold">{selectedStyle.name}</span>. 
                      Prêt à commencer l'expérience photo?
                    </p>
                  </motion.div>
                  
                  {/* Boutons d'action - Restructuré pour mettre le bouton COMMENCER en valeur */}
                  <div className="flex flex-col items-center gap-4">
                    {/* Bouton COMMENCER repositionné et aggrandi */}
                    <motion.button
                      onClick={handleStartClick}
                      className="w-full px-8 py-4 rounded-xl font-bold text-xl flex items-center justify-center gap-2 shadow-lg"
                      style={{ backgroundColor: secondaryColor, color: primaryColor }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                    >
                      <span>COMMENCER</span>
                      <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </motion.button>
                    
                    {/* Bouton Annuler en dessous et plus discret */}
                    <motion.button
                      onClick={closeModal}
                      className="px-5 py-2.5 rounded-lg text-gray-700 font-medium text-sm flex items-center gap-1 hover:bg-gray-100 transition-colors"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      Annuler
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
