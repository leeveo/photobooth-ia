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
  const [isScrollEnd, setIsScrollEnd] = useState(false);
  
  // Effect for infinite scroll - Updated to track scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        
        // Check if near bottom for infinite scroll
        if (scrollTop + clientHeight >= scrollHeight - 100) {
          setVisibleCount(prev => Math.min(prev + 10, styles.length));
          setIsScrollEnd(true);
        } else {
          setIsScrollEnd(false);
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
    // Essaie d'abord de charger depuis localStorage pour un rendu plus rapide
    const cachedProject = localStorage.getItem('projectData');
    if (cachedProject) {
      try {
        const parsedProject = JSON.parse(cachedProject);
        setProject(parsedProject);
        
        // Si nous avons un ID de projet en cache, essayons de charger les styles immédiatement
        if (parsedProject.id) {
          fetchStyles(parsedProject.id);
        }
        
        setLoading(false);
      } catch (e) {
        console.error("Error parsing cached project data:", e);
      }
    }
    
    // Toujours récupérer les données fraîches
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
      className="min-h-screen flex flex-col relative overflow-hidden"
    >
      {/* Animated gradient background */}
      <motion.div
        className="fixed inset-0 z-0"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}10, ${primaryColor}20, ${secondaryColor}15)`,
        }}
        animate={{
          background: [
            `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}10, ${primaryColor}20, ${secondaryColor}15)`,
            `linear-gradient(225deg, ${secondaryColor}20, ${primaryColor}10, ${secondaryColor}15, ${primaryColor}25)`,
            `linear-gradient(315deg, ${primaryColor}20, ${secondaryColor}15, ${primaryColor}10, ${secondaryColor}20)`,
            `linear-gradient(45deg, ${secondaryColor}15, ${primaryColor}20, ${secondaryColor}10, ${primaryColor}15)`,
          ]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Floating background elements */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* Large floating orbs */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute rounded-full opacity-20 backdrop-blur-sm"
            style={{
              backgroundColor: i % 2 === 0 ? primaryColor : secondaryColor,
              width: `${100 + Math.random() * 200}px`,
              height: `${100 + Math.random() * 200}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50, 0],
              y: [0, Math.random() * 100 - 50, 0],
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          />
        ))}

        {/* Small sparkle particles */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              backgroundColor: i % 3 === 0 ? primaryColor : secondaryColor,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}

        {/* Geometric shapes */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`shape-${i}`}
            className="absolute opacity-10"
            style={{
              width: '60px',
              height: '60px',
              borderRadius: i % 2 === 0 ? '50%' : '0%',
              backgroundColor: 'transparent',
              border: `2px solid ${i % 2 === 0 ? primaryColor : secondaryColor}`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              rotate: [0, 360],
              scale: [1, 1.5, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* Main content with enhanced backdrop */}
      <div className="relative z-10 w-full px-2 sm:px-4 md:px-6 lg:px-8 py-8 lg:py-12 flex flex-col flex-grow">
        {/* Enhanced logo and welcome message */}
        <div className="flex flex-col items-center mb-10 relative">
          {/* Animated halo behind logo */}
          <motion.div
            className="absolute top-0 left-1/2 transform -translate-x-1/2 w-64 h-64 rounded-full opacity-20"
            style={{
              background: `radial-gradient(circle, ${secondaryColor}40, transparent 70%)`
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2],
              rotate: [0, 360],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="w-[280px] relative mb-8 z-10"
          >
            {project.logo_url ? (
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ type: "spring", damping: 15 }}
              >
              
                {/* Glow effect behind logo */}
                <motion.div
                  className="absolute inset-0 blur-xl opacity-50 -z-10"
                  style={{ backgroundColor: secondaryColor }}
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            ) : (
              <motion.h1 
                className="text-3xl font-bold text-white drop-shadow-lg"
                style={{ textShadow: `0 0 20px ${primaryColor}50` }}
                whileHover={{ scale: 1.05 }}
              >
                {project.name}
              </motion.h1>
            )}
          </motion.div>
          
          {/* Enhanced main title with dynamic effects */}
          <motion.div className="relative text-center">
            <motion.h2 
              className="text-3xl sm:text-5xl font-bold text-center relative z-10"
              style={{ 
                color: secondaryColor,
                textShadow: `0 0 30px ${secondaryColor}50`
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              whileHover={{ 
                scale: 1.02,
                textShadow: `0 0 40px ${secondaryColor}80`
              }}
            >
              {project.home_message || "Choose Your Preferred Style"}
            </motion.h2>
            
            {/* Animated underline */}
            <motion.div
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-1 rounded-full"
              style={{ backgroundColor: primaryColor }}
              initial={{ width: 0 }}
              animate={{ width: "60%" }}
              transition={{ duration: 1, delay: 1 }}
            />

            {/* Floating accent dots */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={`accent-${i}`}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: i % 2 === 0 ? primaryColor : secondaryColor,
                  left: `${20 + Math.random() * 60}%`,
                  top: `${-20 + Math.random() * 40}px`,
                }}
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.3, 0.8, 0.3],
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </motion.div>

          <motion.p 
            className="mt-8 text-white text-opacity-90 text-center max-w-3xl text-xl relative z-10 backdrop-blur-sm bg-white/5 px-6 py-4 rounded-2xl border border-white/10"
            style={{ 
              boxShadow: `0 8px 32px ${primaryColor}20`
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            whileHover={{ 
              scale: 1.02,
              backgroundColor: "rgba(255,255,255,0.1)"
            }}
          >
            Choisissez un style pour votre expérience photo.
            
            {/* Animated border glow */}
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-50 -z-10"
              style={{
                background: `linear-gradient(45deg, ${primaryColor}30, ${secondaryColor}30, ${primaryColor}30)`
              }}
              animate={{
                background: [
                  `linear-gradient(45deg, ${primaryColor}30, ${secondaryColor}30, ${primaryColor}30)`,
                  `linear-gradient(135deg, ${secondaryColor}40, ${primaryColor}40, ${secondaryColor}40)`,
                  `linear-gradient(225deg, ${primaryColor}30, ${secondaryColor}30, ${primaryColor}30)`,
                ]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.p>
        </div>
        
        {/* Enhanced styles selection section */}
        <motion.div 
          className="mb-8 flex-grow flex flex-col items-center relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {/* Enhanced section title */}
          <motion.div className="relative mb-8">
            <motion.h3 
              className="text-2xl font-bold text-center relative z-10" 
              style={{ 
                color: secondaryColor,
                textShadow: `0 0 20px ${secondaryColor}40`
              }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              whileHover={{ scale: 1.05 }}
            >
              ✨ Les styles disponibles ✨
            </motion.h3>
            
            {/* Decorative elements around title */}
            <motion.div
              className="absolute -left-16 top-1/2 transform -translate-y-1/2 w-8 h-0.5"
              style={{ backgroundColor: primaryColor }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            />
            <motion.div
              className="absolute -right-16 top-1/2 transform -translate-y-1/2 w-8 h-0.5"
              style={{ backgroundColor: primaryColor }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            />
          </motion.div>
          
          {stylesLoading ? (
            <div className="flex flex-col items-center gap-4">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-16 w-16 border-t-3 border-b-3 border-white rounded-full relative"
              >
                <motion.div
                  className="absolute inset-0 border-t-3 rounded-full"
                  style={{ borderTopColor: secondaryColor }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
              <motion.p 
                className="text-white text-lg"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Chargement des styles magiques...
              </motion.p>
            </div>
          ) : styles.length === 0 ? (
            <motion.div
              className="text-center py-16 px-8 rounded-3xl backdrop-blur-md bg-white/10 border border-white/20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}20` }}
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <span className="text-4xl">🎨</span>
              </motion.div>
              <p className="text-center text-white text-xl font-medium">
                Aucun style disponible pour ce projet
              </p>
            </motion.div>
          ) : (
            <div className="w-full mx-auto relative">
              {/* Enhanced scrollable container with better styling */}
              <div 
                className={`styles-scrollable-container ${isScrollEnd ? 'scroll-end' : ''} relative backdrop-blur-sm bg-white/5 rounded-3xl border border-white/10 p-4`} 
                ref={scrollRef}
                style={{
                  boxShadow: `0 20px 60px ${primaryColor}15, inset 0 1px 0 rgba(255,255,255,0.1)`
                }}
              >
                {/* Enhanced scroll indicator */}
                <motion.div 
                  className="scroll-indicator"
                  style={{ color: secondaryColor }}
                  animate={{
                    y: [0, 5, 0],
                    opacity: isScrollEnd ? [0.3, 0.1, 0.3] : [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </motion.div>
                
                {/* Enhanced masonry grid container */}
                <div className="masonry-grid-container">
                  <div 
                    className={`masonry-grid ${
                      styles.length <= 10 ? 'few-items' : ''
                    } ${
                      styles.length <= 3 ? 'force-2-cols' : 
                      styles.length <= 6 ? 'force-3-cols' : 
                      styles.length <= 12 ? 'force-4-cols' : 
                      styles.length <= 20 ? 'force-5-cols' : ''
                    }`}
                  >
                    {styles.slice(0, visibleCount).map((style, index) => (
                      <motion.div 
                        key={style.id}
                        className="masonry-item"
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ 
                          duration: 0.5, 
                          delay: index * 0.05,
                          type: "spring",
                          damping: 15
                        }}
                        whileHover={{ 
                          y: -8,
                          transition: { duration: 0.2 }
                        }}
                      >
                        <motion.div 
                          className={`cursor-pointer overflow-hidden rounded-3xl backdrop-blur-md bg-white/10 shadow-xl hover:shadow-2xl transition-all transform duration-500 border-2 style-card group ${
                            selectedStyle?.id === style.id 
                              ? 'border-white scale-105 shadow-2xl' 
                              : 'border-white/20 hover:scale-[1.02] hover:border-white/40'
                          }`}
                          onClick={() => handleStyleSelect(style)}
                          style={{
                            boxShadow: selectedStyle?.id === style.id 
                              ? `0 25px 60px ${secondaryColor}40, 0 0 0 3px ${secondaryColor}30`
                              : `0 15px 40px ${primaryColor}20`
                          }}
                          whileHover={{
                            boxShadow: `0 30px 80px ${primaryColor}30, 0 0 0 2px ${secondaryColor}40`
                          }}
                        >
                          {/* Enhanced image container */}
                          <div 
                            className="relative overflow-hidden"
                            style={{ 
                              height: `${Math.floor(Math.random() * 50) + 180}px` 
                            }}
                          >
                            {style.preview_image ? (
                              <>
                                <motion.img 
                                  src={style.preview_image}
                                  alt={style.name}
                                  className="object-cover w-full h-full transition-all duration-700 group-hover:scale-110"
                                  onError={(e) => {
                                    console.error(`Failed to load image for style ${style.name}`);
                                    e.target.style.display = 'none';
                                  }}
                                  whileHover={{ scale: 1.05 }}
                                />
                                <motion.div 
                                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"
                                  style={{
                                    background: `linear-gradient(to top, ${primaryColor}60, transparent 50%, ${secondaryColor}10)`
                                  }}
                                />
                                <motion.div 
                                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                                  initial={{ scale: 0.8 }}
                                  whileHover={{ scale: 1 }}
                                >
                                  <motion.button 
                                    className="px-8 py-3 rounded-full font-bold shadow-2xl transform transition-all text-lg backdrop-blur-md border border-white/30"
                                    style={{ 
                                      backgroundColor: `${secondaryColor}90`, 
                                      color: primaryColor 
                                    }}
                                    whileHover={{ 
                                      scale: 1.05,
                                      boxShadow: `0 15px 30px ${secondaryColor}40`
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    ✨ Choisir ce style
                                  </motion.button>
                                </motion.div>
                              </>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-300">
                                <span className="text-gray-500 text-lg">Aucune image</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Enhanced style information */}
                          <motion.div 
                            className="p-6 relative"
                            style={{
                              background: selectedStyle?.id === style.id 
                                ? `linear-gradient(135deg, ${primaryColor}10, ${secondaryColor}05)`
                                : 'transparent'
                            }}
                          >
                            <motion.h4 
                              className="font-bold text-white text-xl tracking-tight mb-2"
                              style={{
                                textShadow: `0 2px 10px ${primaryColor}40`
                              }}
                            >
                              {style.name}
                            </motion.h4>
                            {style.description && (
                              <motion.p className="text-white/80 text-base line-clamp-2">
                                {style.description}
                              </motion.p>
                            )}
                            
                            {/* Style card accent */}
                            <motion.div
                              className="absolute bottom-0 left-0 right-0 h-1 rounded-b-3xl"
                              style={{
                                background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`
                              }}
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: selectedStyle?.id === style.id ? 1 : 0 }}
                              transition={{ duration: 0.3 }}
                            />
                          </motion.div>
                          
                          {/* Enhanced selection badge */}
                          {selectedStyle?.id === style.id && (
                            <motion.div 
                              className="absolute top-4 right-4 backdrop-blur-md text-sm font-bold px-4 py-2 rounded-full border border-white/30"
                              style={{ 
                                backgroundColor: `${secondaryColor}90`, 
                                color: primaryColor,
                                boxShadow: `0 8px 25px ${secondaryColor}40`
                              }}
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ 
                                type: "spring",
                                damping: 15,
                                stiffness: 300
                              }}
                            >
                              ✨ Sélectionné
                            </motion.div>
                          )}
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
        
        {/* Enhanced "Load more" button */}
        {visibleCount < styles.length && (
          <div className="mt-8 flex justify-center">
            <motion.button
              onClick={() => setVisibleCount(prev => Math.min(prev + 10, styles.length))}
              className="px-10 py-5 backdrop-blur-md hover:backdrop-blur-lg text-white rounded-2xl font-bold transition-all text-lg border border-white/20 relative overflow-hidden group"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}15)`,
                boxShadow: `0 15px 35px ${primaryColor}25`
              }}
              whileHover={{ 
                scale: 1.05,
                boxShadow: `0 20px 50px ${primaryColor}35`
              }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              {/* Animated background shine */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  delay: 2,
                  repeatDelay: 3
                }}
              />
              
              <span className="relative z-10">
                🎨 Afficher plus de styles ({styles.length - visibleCount} restants)
              </span>
            </motion.button>
          </div>
        )}
        
        {/* Confirmation modal - Responsive version */}
        <AnimatePresence>
          {showConfirmModal && selectedStyle && (
            <motion.div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            >
              {/* Enhanced blurred background with animated particles */}
              <motion.div 
                className="absolute inset-0 backdrop-blur-xl bg-black/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Animated background particles */}
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full opacity-30"
                    style={{ 
                      backgroundColor: i % 2 === 0 ? primaryColor : secondaryColor,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [0, -20, 0],
                      x: [0, Math.random() * 20 - 10, 0],
                      opacity: [0.3, 0.7, 0.3],
                      scale: [1, 1.5, 1],
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                    }}
                  />
                ))}
              </motion.div>
              
              {/* Enhanced popup content - Responsive layout */}
              <motion.div 
                className="relative w-full max-w-lg lg:max-w-4xl rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md bg-white/95 
                           flex flex-col lg:flex-row lg:h-[600px]"
                initial={{ scale: 0.8, y: 50, opacity: 0, rotateX: -15 }}
                animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }}
                exit={{ scale: 0.8, y: 50, opacity: 0, rotateX: 15 }}
                transition={{ 
                  type: "spring", 
                  damping: 20, 
                  stiffness: 300,
                  duration: 0.6
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Animated header - Only visible on mobile */}
                <motion.div 
                  className="lg:hidden relative w-full h-3 overflow-hidden"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1, delay: 0.3 }}
                >
                  <div 
                    className="w-full h-full relative"
                    style={{ background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor}, ${primaryColor})` }}
                  >
                    <motion.div
                      className="absolute inset-0 opacity-60"
                      style={{ background: `linear-gradient(90deg, transparent, white, transparent)` }}
                      animate={{ x: [-100, 300] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    />
                  </div>
                </motion.div>
                
                {/* Image section - Left side on desktop, top on mobile */}
                <div className="relative w-full lg:w-1/2 h-72 lg:h-full bg-gray-900 overflow-hidden lg:rounded-l-3xl">
                  {selectedStyle.preview_image ? (
                    <>
                      <motion.img 
                        src={selectedStyle.preview_image}
                        alt={selectedStyle.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        initial={{ scale: 1.2, filter: "blur(2px)" }}
                        animate={{ scale: 1, filter: "blur(0px)" }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black/90 via-black/30 to-transparent"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                      />
                      
                      {/* Floating style badge with glow */}
                      <motion.div
                        className="absolute top-6 right-6 px-4 py-2 rounded-full backdrop-blur-md shadow-lg border border-white/30"
                        style={{ backgroundColor: `${secondaryColor}20`, color: secondaryColor }}
                        initial={{ opacity: 0, scale: 0, rotate: -45 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ 
                          type: "spring",
                          damping: 15,
                          stiffness: 300,
                          delay: 0.6 
                        }}
                      >
                        <span className="text-sm font-bold">✨ Sélectionné</span>
                      </motion.div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-800">
                      <span className="text-gray-400">Aucune image disponible</span>
                    </div>
                  )}
                  
                  {/* Style information - Bottom on mobile, overlay on desktop */}
                  <div className="absolute bottom-6 left-6 right-6">
                    <motion.div
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.6 }}
                    >
                      <motion.h3 
                        className="text-white text-2xl lg:text-3xl font-bold mb-2 drop-shadow-lg"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.7, duration: 0.5 }}
                      >
                        {selectedStyle.name}
                      </motion.h3>
                      {selectedStyle.description && (
                        <motion.p 
                          className="text-white/90 text-sm lg:text-base line-clamp-2 drop-shadow-md"
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.9, duration: 0.5 }}
                        >
                          {selectedStyle.description}
                        </motion.p>
                      )}
                    </motion.div>
                  </div>
                </div>
                
                {/* Content section - Right side on desktop, bottom on mobile */}
                <div className="bg-gradient-to-br from-white to-gray-50 p-6 lg:p-8 lg:w-1/2 flex flex-col justify-center lg:rounded-r-3xl">
                  {/* Animated header - Only visible on desktop */}
                  <motion.div 
                    className="hidden lg:block absolute top-0 left-1/2 right-0 h-3 overflow-hidden"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                  >
                    <div 
                      className="w-full h-full relative"
                      style={{ background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor}, ${primaryColor})` }}
                    >
                      <motion.div
                        className="absolute inset-0 opacity-60"
                        style={{ background: `linear-gradient(90deg, transparent, white, transparent)` }}
                        animate={{ x: [-100, 300] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                      />
                    </div>
                  </motion.div>

                  {/* Desktop title - Only visible on large screens */}
                  <motion.div
                    className="hidden lg:block mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    <motion.h3 
                      className="text-3xl font-bold mb-2"
                      style={{ color: primaryColor }}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.7, duration: 0.5 }}
                    >
                      {selectedStyle.name}
                    </motion.h3>
                    {selectedStyle.description && (
                      <motion.p 
                        className="text-gray-700 text-base"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.9, duration: 0.5 }}
                      >
                        {selectedStyle.description}
                      </motion.p>
                    )}
                  </motion.div>

                  <motion.div
                    className="mb-6 lg:mb-8 p-4 lg:p-6 rounded-2xl border shadow-inner"
                    style={{ 
                      backgroundColor: `${primaryColor}08`,
                      borderColor: `${primaryColor}20`
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1, duration: 0.6 }}
                  >
                    <motion.div
                      className="flex items-center gap-3 mb-3"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.3, duration: 0.5 }}
                    >
                      <div 
                        className="w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <span className="text-white text-sm lg:text-lg">✓</span>
                      </div>
                      <h4 className="text-gray-800 font-bold text-base lg:text-lg">Style confirmé</h4>
                    </motion.div>
                    <motion.p 
                      className="text-gray-700 leading-relaxed text-sm lg:text-base"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.5, duration: 0.5 }}
                    >
                      Excellent choix ! Vous avez sélectionné{' '}
                      <span className="font-bold lg:hidden" style={{ color: primaryColor }}>
                        ce style
                      </span>
                      <span className="font-bold hidden lg:inline" style={{ color: primaryColor }}>
                        {selectedStyle.name}
                      </span>
                      . Êtes-vous prêt à vivre une expérience photo exceptionnelle ?
                    </motion.p>
                  </motion.div>
                  
                  {/* Action buttons */}
                  <div className="flex flex-col items-center gap-4 lg:gap-5">
                    {/* START button */}
                    <motion.button
                      onClick={handleStartClick}
                      className="relative w-full px-8 lg:px-10 py-4 lg:py-6 rounded-xl lg:rounded-2xl font-black text-lg lg:text-2xl flex items-center justify-center gap-2 lg:gap-3 shadow-2xl overflow-hidden group"
                      style={{ 
                        backgroundColor: secondaryColor, 
                        color: primaryColor,
                        boxShadow: `0 20px 40px ${secondaryColor}40`
                      }}
                      whileHover={{ 
                        scale: 1.05,
                        boxShadow: `0 25px 50px ${secondaryColor}60`
                      }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 30, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        delay: 1.7, 
                        duration: 0.6,
                        type: "spring",
                        damping: 15,
                        stiffness: 300
                      }}
                    >
                      {/* Animated floating bubbles */}
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={`modal-bubble-${i}`}
                          className="absolute rounded-full opacity-30"
                          style={{
                            backgroundColor: primaryColor,
                            width: `${6 + Math.random() * 12}px`,
                            height: `${6 + Math.random() * 12}px`,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                          }}
                          animate={{
                            y: [0, -15, 0],
                            x: [0, Math.random() * 15 - 7.5, 0],
                            scale: [1, 1.3, 1],
                            opacity: [0.3, 0.6, 0.3],
                          }}
                          transition={{
                            duration: 2 + Math.random() * 1.5,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                            ease: "easeInOut"
                          }}
                        />
                      ))}

                      {/* Animated wave pattern */}
                      <motion.div
                        className="absolute inset-0 opacity-15"
                        style={{
                          background: `repeating-linear-gradient(
                            45deg,
                            transparent,
                            transparent 8px,
                            ${primaryColor}30 8px,
                            ${primaryColor}30 16px
                          )`
                        }}
                        animate={{
                          backgroundPosition: ["0px 0px", "32px 32px"],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />

                      {/* Pulsing rings */}
                      {[...Array(2)].map((_, i) => (
                        <motion.div
                          key={`modal-ring-${i}`}
                          className="absolute rounded-full border-2 opacity-30"
                          style={{
                            borderColor: primaryColor,
                            width: `${30 + i * 15}px`,
                            height: `${30 + i * 15}px`,
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)'
                          }}
                          animate={{
                            scale: [0.8, 1.1, 0.8],
                            opacity: [0.3, 0.1, 0.3],
                            rotate: [0, 360]
                          }}
                          transition={{
                            duration: 2.5 + i * 0.3,
                            repeat: Infinity,
                            delay: i * 0.4,
                            ease: "easeInOut"
                          }}
                        />
                      ))}

                      {/* Rotating gradient overlay */}
                      <motion.div
                        className="absolute inset-0 opacity-20 rounded-xl lg:rounded-2xl"
                        style={{
                          background: `conic-gradient(from 0deg, transparent, ${primaryColor}30, transparent, ${primaryColor}40, transparent)`
                        }}
                        animate={{ rotate: [0, 360] }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />

                      {/* Sparkle explosion on hover */}
                      <motion.div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        {[...Array(8)].map((_, i) => (
                          <motion.div
                            key={`modal-sparkle-${i}`}
                            className="absolute w-1 h-1 rounded-full"
                            style={{
                              backgroundColor: primaryColor,
                              left: '50%',
                              top: '50%',
                            }}
                            animate={{
                              x: [0, (Math.cos(i * 45 * Math.PI / 180) * 30)],
                              y: [0, (Math.sin(i * 45 * Math.PI / 180) * 30)],
                              opacity: [1, 0],
                              scale: [0, 1.2, 0],
                            }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.1,
                              ease: "easeOut"
                            }}
                          />
                        ))}
                      </motion.div>

                      {/* Original shine effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          delay: 2,
                          repeatDelay: 3
                        }}
                      />
                      
                      <motion.span
                        className="relative z-10"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1.9, duration: 0.3 }}
                      >
                       🚀 COMMENCER L'EXPÉRIENCE
                      </motion.span>
                      
                      {/* ...existing SVG arrow... */}
                      <motion.svg 
                        className="w-6 h-6 lg:w-8 lg:h-8 relative z-10" 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 2.1, duration: 0.4 }}
                        whileHover={{ x: 5 }}
                      >
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </motion.svg>
                    </motion.button>
                    
                    {/* Cancel button */}
                    <motion.button
                      onClick={closeModal}
                      className="px-4 lg:px-6 py-2 lg:py-3 rounded-lg lg:rounded-xl text-gray-600 font-medium text-sm lg:text-base flex items-center gap-2 hover:bg-gray-100 transition-all duration-300 group"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 2.3, duration: 0.4 }}
                    >
                      <motion.svg 
                        className="w-4 h-4 lg:w-5 lg:h-5 group-hover:rotate-[-5deg] transition-transform" 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </motion.svg>
                      <span>Changer de style</span>
                    </motion.button>
                  </div>
                </div>
                
                {/* Floating decorative elements */}
                <motion.div
                  className="absolute -top-4 -right-4 w-8 h-8 rounded-full opacity-60"
                  style={{ backgroundColor: secondaryColor }}
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div
                  className="absolute -bottom-6 -left-6 w-12 h-12 rounded-full opacity-40"
                  style={{ backgroundColor: primaryColor }}
                  animate={{
                    scale: [1, 1.3, 1],
                    rotate: [0, -180, -360],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
