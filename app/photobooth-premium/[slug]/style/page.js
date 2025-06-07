'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { notFound } from 'next/navigation';
import Image from "next/image";
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
  const [stylesLoading, setStylesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Simplified state for infinite scroll
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

  // Define fetchStyles first - without dependencies on fetchProjectData
  const fetchStyles = useCallback(async (projectId) => {
    setStylesLoading(true);
    try {
      console.log(`Loading styles for project=${projectId}`);
      
      // Fetch all styles for this project
      const { data, error } = await supabase
        .from('styles')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('name');
        
      if (error) {
        console.error("Error loading styles:", error);
        throw error;
      }
      
      console.log(`${data?.length || 0} styles found`);
      
      // Process styles to ensure we have valid image URLs
      const processedStyles = data?.map(style => {
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
      
      setStyles(processedStyles);
    } catch (error) {
      console.error('Error loading styles:', error);
      setError("Unable to load styles");
    } finally {
      setStylesLoading(false);
    }
  }, [supabase]); // Only depends on supabase
  
  // Now define fetchProjectData separately
  const fetchProjectData = useCallback(async () => {
    try {
      // Retry logic for Supabase
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Fetch project data by slug
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, name, slug, logo_url, primary_color, secondary_color, home_message, is_active')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

          if (projectError || !projectData) {
            console.error('Project not found or inactive:', projectError);
            throw projectError;
          }
          
          setProject(projectData);
          
          // Fetch project settings
          const { data: settingsData } = await supabase
            .from('project_settings')
            .select('default_gender')
            .eq('project_id', projectData.id)
            .single();
          
          const projectSettings = settingsData || { default_gender: 'g' };
          
          // Store project info in localStorage
          localStorage.setItem('currentProjectId', projectData.id);
          localStorage.setItem('currentProjectSlug', slug);
          localStorage.setItem('projectData', JSON.stringify(projectData));
          localStorage.setItem('projectSettings', JSON.stringify(projectSettings));
          
          // Fetch styles for this project
          fetchStyles(projectData.id);
          
          // Success - break the retry loop
          break;
        } catch (retryError) {
          retryCount++;
          console.warn(`Attempt ${retryCount} failed:`, retryError);
          
          if (retryCount >= maxRetries) {
            throw retryError;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
      setError("Unable to load project data. Please try again.");
      
      // Use cached data if available
      const cachedProject = localStorage.getItem('projectData');
      if (cachedProject) {
        try {
          const parsedProject = JSON.parse(cachedProject);
          setProject(parsedProject);
          console.log('Using cached project data as fallback');
          
          // Also try to load styles from cache
          if (parsedProject.id) {
            fetchStyles(parsedProject.id);
          }
        } catch (e) {
          console.error("Error parsing cached project data:", e);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [slug, supabase, fetchStyles]); // Include fetchStyles dependency now that it's defined first
  
  useEffect(() => {
    // Try to load from localStorage first for faster rendering
    const cachedProject = localStorage.getItem('projectData');
    if (cachedProject) {
      try {
        const parsedProject = JSON.parse(cachedProject);
        setProject(parsedProject);
        
        // If we have a cached project ID, try to load styles immediately
        if (parsedProject.id) {
          fetchStyles(parsedProject.id);
        }
        
        setLoading(false);
      } catch (e) {
        console.error("Error parsing cached project data:", e);
      }
    }
    
    // Always fetch fresh data
    fetchProjectData();
  }, [fetchProjectData, fetchStyles]);

  const handleStyleSelect = (style) => {
    setSelectedStyle(style);
    localStorage.setItem('selectedStyleId', style.id);
    localStorage.setItem('selectedStyleData', JSON.stringify(style)); 
    
    // Store style prompt for image generation
    localStorage.setItem('stylePrompt', style.prompt);
    
    // Store style image URL for potential reference
    localStorage.setItem('styleFix', style.preview_image);
    
    // Store style gender
    localStorage.setItem('styleGenderFix', style.gender || 'g');
    localStorage.setItem('styleGender', style.gender || 'g');
    
    // Show confirmation modal
    setShowConfirmModal(true);
  };
  
  const handleStartClick = () => {
    if (!selectedStyle) {
      setError('Please select a style before continuing');
      return;
    }
    
    // Navigate to camera page
    router.push(`/photobooth-premium/${slug}/cam`);
  };
  
  // Function to close the modal
  const closeModal = () => {
    setShowConfirmModal(false);
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-32 w-32 border-t-4 border-b-4 rounded-full"
          style={{ borderTopColor: '#E5E40A', borderBottomColor: '#811A53' }}
        />
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
      ref={scrollRef}
    >
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 py-8 lg:py-12 flex flex-col flex-grow">
        {/* Logo and welcome message */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-[280px] relative mb-8"
          >
            {project.logo_url ? (
              <Image 
                src={project.logo_url} 
                width={280} 
                height={100} 
                alt={project.name} 
                className="w-full object-contain drop-shadow-2xl" 
                priority 
              />
            ) : (
              <h1 className="text-3xl font-bold text-white">{project.name}</h1>
            )}
          </motion.div>
          
          <motion.h2 
            className="text-3xl sm:text-5xl font-bold text-center"
            style={{ color: secondaryColor }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            {project.home_message || "Choose Your Preferred Style"}
          </motion.h2>
          <motion.p 
            className="mt-6 text-white text-opacity-90 text-center max-w-3xl text-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            Choisissez un style pour votre expérience photo.
          </motion.p>
        </div>
        
        {/* Styles selection - with masonry layout */}
        <motion.div 
          className="mb-16 flex-grow flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <motion.h3 
            className="text-2xl font-semibold text-center mb-8" 
            style={{ color: secondaryColor }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            Les styles disponibles
          </motion.h3>
          
          {stylesLoading ? (
            <div className="flex justify-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-16 w-16 border-t-2 border-b-2 border-white rounded-full"
              />
            </div>
          ) : styles.length === 0 ? (
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
                                Choisissez ce style
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-300">
                            <span className="text-gray-500 text-lg">Aucune image</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Style information */}
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
                      
                      {/* Selection badge */}
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
        </motion.div>
        
        {/* "Load more" button if not all styles are displayed */}
        {visibleCount < styles.length && (
          <div className="mt-8 flex justify-center">
            <motion.button
              onClick={() => setVisibleCount(prev => Math.min(prev + 10, styles.length))}
              className="px-8 py-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-medium transition-colors text-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
            >
              Afficher plus de styles ({styles.length - visibleCount} restants)
            </motion.button>
          </div>
        )}
        
        {/* Confirmation modal - Redesigned version */}
        <AnimatePresence>
          {showConfirmModal && selectedStyle && (
            <motion.div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            >
              {/* Blurred background with glassmorphism effect */}
              <motion.div 
                className="absolute inset-0 backdrop-blur-md bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              ></motion.div>
              
              {/* Popup content */}
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
                {/* Header with colored gradient */}
                <div 
                  className="w-full h-2" 
                  style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
                ></div>
                
                {/* Style image with overlay and scale effect */}
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
                      <span className="text-gray-400">Aucune image disponible</span>
                    </div>
                  )}
                  
                  {/* Style badge */}
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
                
                {/* Popup body */}
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
                      Prêt à commencer l'expérience photo ?
                    </p>
                  </motion.div>
                  
                  {/* Action buttons - Restructured to highlight START button */}
                  <div className="flex flex-col items-center gap-4">
                    {/* START button repositioned and enlarged */}
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
                    
                    {/* Cancel button below and more discreet */}
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
