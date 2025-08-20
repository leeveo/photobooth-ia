"use client";

import { useEffect, useState } from 'react';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';
import LoadingSpinnerCoiffure from '../../components/ui/LoadingSpinnerCoiffure';

export default function PhotoboothProject({ params }) {
  const slug = params.slug;
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Check if we're in fullscreen mode on mount and when it changes
  useEffect(() => {
    const checkFullscreen = () => {
      const isInFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isInFullscreen);
    };
    
    // Initial check
    checkFullscreen();
    
    // Set up listeners for fullscreen changes
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    document.addEventListener('mozfullscreenchange', checkFullscreen);
    document.addEventListener('MSFullscreenChange', checkFullscreen);
    
    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
      document.removeEventListener('mozfullscreenchange', checkFullscreen);
      document.removeEventListener('MSFullscreenChange', checkFullscreen);
    };
  }, []);
  
  // Fetch project data
  useEffect(() => {
    async function fetchProjectData() {
      setLoading(true);
      try {
        // Add retry logic for Supabase connections
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            // Fetch project data by slug with a more specific query to reduce data size
            const { data: projectData, error: projectError } = await supabase
              .from('projects')
              .select('id, name, slug, logo_url, primary_color, secondary_color, home_message, is_active')
              .eq('slug', slug)
              .eq('is_active', true)
              .single();

            if (projectError) {
              console.error('Project query error:', projectError);
              throw projectError;
            }
            
            if (!projectData) {
              console.error('Project not found or inactive');
              throw new Error('Project not found');
            }
            
            console.log('Successfully fetched project:', projectData.name);
            setProject(projectData);

            // Fetch only necessary project settings to reduce data load
            const { data: settingsData } = await supabase
              .from('project_settings')
              .select('enable_fullscreen, default_gender')
              .eq('project_id', projectData.id)
              .single();
              
            setSettings(settingsData || {
              enable_fullscreen: true,
              default_gender: 'g'
            });
            
            // Store project data in localStorage for other pages
            localStorage.setItem('currentProjectId', projectData.id);
            localStorage.setItem('currentProjectSlug', slug);
            localStorage.setItem('projectData', JSON.stringify(projectData));
            localStorage.setItem('projectSettings', JSON.stringify(settingsData || {}));
            
            // Successfully completed all queries, break the retry loop
            break;
          } catch (retryError) {
            retryCount++;
            console.warn(`Fetch attempt ${retryCount} failed:`, retryError);
            
            if (retryCount >= maxRetries) {
              throw retryError;
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      } catch (error) {
        console.error('Error loading project:', error);
        setError('Impossible de charger les données du projet');
        
        // Try to use cached data if available when fetch fails
        const cachedProject = localStorage.getItem('projectData');
        if (cachedProject) {
          try {
            setProject(JSON.parse(cachedProject));
            console.log('Using cached project data as fallback');
          } catch (e) {
            console.error("Error parsing cached project data:", e);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProjectData();
  }, [slug, supabase]);
  
  // Request fullscreen on user interaction (button click)
  const enterFullscreen = () => {
    // Use a dedicated function that's called directly by a button click
    try {
      const element = document.documentElement;
      
      // Different browsers support different methods
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  const handleStartExperience = () => {
    if (project?.photobooth_type === 'standard') {
      router.push(`/photobooth-coiffure/${slug}/cam`);
    } else if (project?.photobooth_type === 'coiffure') {
      router.push(`/photobooth-coiffure/${slug}/style`);
    } else {
      router.push(`/photobooth-coiffure/${slug}/style`);
    }
  };

  // Show error state
  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col text-center px-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-md mb-4">
          <h2 className="text-lg font-bold mb-2">Erreur</h2>
          <p>{error}</p>
        </div>
        <button 
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <LoadingSpinnerCoiffure 
        message="Préparation de votre expérience coiffure..." 
        size="large" 
        primaryColor={project?.primary_color || '#811A53'}
        secondaryColor={project?.secondary_color || '#E5E40A'}
        accentColor="#C4A484"
      />
    );
  }

  // Handle missing project
  if (!project) {
    return notFound();
  }

  // Dynamic styles based on project colors
  const primaryColor = project.primary_color || '#811A53';
  const secondaryColor = project.secondary_color || '#E5E40A';
  const homeMessage = project.home_message || "Transformez votre photo avec l'IA !";

  return (
    <div className="relative z-10 w-full h-full cursor-pointer" onClick={handleStartExperience}>
      {/* Fullscreen button - ONLY show if not already in fullscreen */}
      {settings?.enable_fullscreen && !isFullscreen && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            enterFullscreen();
          }}
          className="fixed top-4 right-4 z-50 px-3 py-2 bg-black/50 text-white rounded-lg flex items-center hover:bg-black/70 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Plein écran
        </button>
      )}

      <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center relative z-10">
        {/* Header with logo */}
        <motion.div 
          className="w-full flex justify-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-[280px] h-[180px] relative">
            {project.logo_url ? (
              <Image 
                src={project.logo_url} 
                fill
                alt={project.name} 
                className="object-contain drop-shadow-2xl" 
                priority 
              />
            ) : (
              <h1 
                className="text-4xl font-bold text-center" 
                style={{ color: secondaryColor }}
              >
                {project.name}
              </h1>
            )}
          </div>
        </motion.div>

        {/* Main content */}
        <div className="max-w-6xl mx-auto">
          {/* Welcome message */}
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <motion.h2 
              className="text-4xl md:text-5xl font-bold mb-6 text-white drop-shadow-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              {homeMessage}
            </motion.h2>
            <motion.p 
              className="text-xl text-white/90 max-w-3xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              Découvrez une expérience photo unique où l'intelligence artificielle transforme votre portrait.
            </motion.p>
          </motion.div>

          {/* Section des étapes - Comment ça marche */}
          <motion.div 
            className="w-full mb-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            {/* Version Mobile et Tablette - Design simple */}
            <div className="hidden sm:block lg:hidden">
              <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 md:space-x-8">
                
                {/* Étape 1 - Mobile/Tablette */}
                <motion.div 
                  className="flex flex-col items-center text-center w-full sm:w-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 1.0 }}
                >
                  <motion.div 
                    className="rounded-full h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center mb-2 shadow-lg border-3 sm:border-4"
                    style={{ backgroundColor: secondaryColor, borderColor: primaryColor }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <span className="text-xl sm:text-2xl font-bold" style={{ color: primaryColor }}>1</span>
                  </motion.div>
                  <h3 className="font-bold text-base sm:text-lg mb-1 px-2" style={{ color: secondaryColor }}>
                    Choisissez votre style
                  </h3>
                  <p className="text-xs sm:text-sm text-white/80 px-4 sm:px-2">Sélectionnez le style qui vous plaît</p>
                </motion.div>

                {/* Séparateur mobile */}
                <motion.div 
                  className="flex justify-center sm:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                >
                  <div className="w-1 h-4 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
                </motion.div>

                {/* Étape 2 - Mobile/Tablette */}
                <motion.div 
                  className="flex flex-col items-center text-center w-full sm:w-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 1.2 }}
                >
                  <motion.div 
                    className="rounded-full h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center mb-2 shadow-lg border-3 sm:border-4"
                    style={{ backgroundColor: secondaryColor, borderColor: primaryColor }}
                    whileHover={{ scale: 1.1, rotate: -5 }}
                  >
                    <span className="text-xl sm:text-2xl font-bold" style={{ color: primaryColor }}>2</span>
                  </motion.div>
                  <h3 className="font-bold text-base sm:text-lg mb-1 px-2" style={{ color: secondaryColor }}>
                    Prenez une photo
                  </h3>
                  <p className="text-xs sm:text-sm text-white/80 px-4 sm:px-2">Capturez votre plus beau sourire</p>
                </motion.div>

                {/* Séparateur mobile */}
                <motion.div 
                  className="flex justify-center sm:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.4 }}
                >
                  <div className="w-1 h-4 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
                </motion.div>

                {/* Étape 3 - Mobile/Tablette */}
                <motion.div 
                  className="flex flex-col items-center text-center w-full sm:w-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 1.4 }}
                >
                  <motion.div 
                    className="rounded-full h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center mb-2 shadow-lg border-3 sm:border-4"
                    style={{ backgroundColor: secondaryColor, borderColor: primaryColor }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <span className="text-xl sm:text-2xl font-bold" style={{ color: primaryColor }}>3</span>
                  </motion.div>
                  <h3 className="font-bold text-base sm:text-lg mb-1 px-2" style={{ color: secondaryColor }}>
                    Récupérez votre création
                  </h3>
                  <p className="text-xs sm:text-sm text-white/80 px-4 sm:px-2">Téléchargez votre photo transformée</p>
                </motion.div>
              </div>
            </div>

            {/* Version Desktop - Design Web 3.0 */}
            <div className="hidden lg:block">
              {/* Conteneur principal avec effet glassmorphism */}
              <motion.div 
                className="relative backdrop-blur-md bg-white/3 rounded-3xl border border-white/20 p-8 shadow-2xl overflow-hidden max-w-5xl mx-auto"
                style={{
                  background: `linear-gradient(135deg, 
                    ${primaryColor}08 0%, 
                    ${secondaryColor}12 35%, 
                    transparent 90%),
                    linear-gradient(45deg, 
                    rgba(255,255,255,0.05) 0%, 
                    rgba(255,255,255,0.02) 100%)`
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 1.0 }}
              >
                
                {/* Titre section avec effet néon */}
                <motion.div 
                  className="text-center mb-8"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.2 }}
                >
                  <h2 
                    className="text-3xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent"
                    style={{
                      backgroundImage: `linear-gradient(45deg, ${secondaryColor}, ${primaryColor}, ${secondaryColor})`,
                      filter: 'drop-shadow(0 0 20px rgba(229, 228, 10, 0.8))'
                    }}
                  >
                    Comment ça marche ?
                  </h2>
                  <div 
                    className="w-16 h-1 mx-auto rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor}, ${primaryColor})`
                    }}
                  />
                </motion.div>

                {/* Grille des étapes */}
                <div className="grid grid-cols-3 gap-6 relative">
                  
                  {/* Lignes de connexion pour desktop */}
                  <div className="absolute top-1/2 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent transform -translate-y-1/2 z-0" />
                  
                  {/* Étape 1 - Web 3.0 Card */}
                  <motion.div 
                    className="relative group"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 1.4 }}
                  >
                    <div 
                      className="relative backdrop-blur-lg bg-white/5 rounded-2xl border border-white/20 p-4 text-center transition-all duration-500 hover:scale-105 hover:bg-white/8"
                      style={{
                        boxShadow: `0 8px 32px ${primaryColor}20, 
                                   0 0 0 1px ${secondaryColor}30 inset,
                                   0 0 20px rgba(255,255,255,0.1) inset`
                      }}
                    >
                      {/* Effet de brillance animé */}
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div 
                          className="absolute inset-0 rounded-2xl"
                          style={{
                            background: `conic-gradient(from 0deg, transparent 0deg, ${secondaryColor}40 60deg, transparent 120deg)`,
                            filter: 'blur(1px)'
                          }}
                        />
                      </div>
                      
                      {/* Numéro avec effet holographique */}
                      <motion.div 
                        className="relative mx-auto mb-3 w-16 h-16 rounded-full flex items-center justify-center border-2"
                        style={{ 
                          background: `radial-gradient(circle at 30% 30%, ${secondaryColor}80, ${secondaryColor}40, ${primaryColor}60)`,
                          borderColor: secondaryColor,
                          boxShadow: `0 0 30px ${secondaryColor}50, 0 0 60px ${primaryColor}30 inset`
                        }}
                        whileHover={{ 
                          scale: 1.15, 
                          rotate: 10,
                          boxShadow: `0 0 40px ${secondaryColor}70, 0 0 80px ${primaryColor}40 inset`
                        }}
                      >
                        <span 
                          className="text-xl font-bold z-10 relative"
                          style={{ 
                            color: primaryColor,
                            textShadow: `0 0 10px ${primaryColor}80`
                          }}
                        >
                          1
                        </span>
                        
                        {/* Particules flottantes */}
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                          <div 
                            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                            style={{ 
                              top: '20%', 
                              left: '25%',
                              animationDelay: '0s',
                              animationDuration: '2s'
                            }}
                          />
                          <div 
                            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                            style={{ 
                              top: '70%', 
                              right: '30%',
                              animationDelay: '1s',
                              animationDuration: '3s'
                            }}
                          />
                        </div>
                      </motion.div>
                      
                      <h3 
                        className="font-bold text-lg mb-2"
                        style={{ color: secondaryColor }}
                      >
                        Choisissez votre style
                      </h3>
                      <p className="text-sm text-white/70 leading-relaxed">
                        Explorez notre galerie d'styles IA uniques
                      </p>
                      
                      {/* Indicateur de progression */}
                      <div className="mt-3 w-full bg-white/10 rounded-full h-1">
                        <motion.div 
                          className="h-1 rounded-full"
                          style={{ backgroundColor: secondaryColor }}
                          initial={{ width: 0 }}
                          animate={{ width: '33%' }}
                          transition={{ duration: 1, delay: 1.6 }}
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* Étape 2 - Web 3.0 */}
                  <motion.div 
                    className="relative group"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.6 }}
                  >
                    <div 
                      className="relative backdrop-blur-lg bg-white/5 rounded-2xl border border-white/20 p-4 text-center transition-all duration-500 hover:scale-105 hover:bg-white/8"
                      style={{
                        boxShadow: `0 8px 32px ${primaryColor}20, 
                                   0 0 0 1px ${secondaryColor}30 inset,
                                   0 0 20px rgba(255,255,255,0.1) inset`
                      }}
                    >
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div 
                          className="absolute inset-0 rounded-2xl"
                          style={{
                            background: `conic-gradient(from 120deg, transparent 0deg, ${primaryColor}40 60deg, transparent 120deg)`,
                            filter: 'blur(1px)'
                          }}
                        />
                      </div>
                      
                      <motion.div 
                        className="relative mx-auto mb-3 w-16 h-16 rounded-full flex items-center justify-center border-2"
                        style={{ 
                          background: `radial-gradient(circle at 70% 30%, ${primaryColor}80, ${primaryColor}40, ${secondaryColor}60)`,
                          borderColor: primaryColor,
                          boxShadow: `0 0 30px ${primaryColor}50, 0 0 60px ${secondaryColor}30 inset`
                        }}
                        whileHover={{ 
                          scale: 1.15, 
                          rotate: -10,
                          boxShadow: `0 0 40px ${primaryColor}70, 0 0 80px ${secondaryColor}40 inset`
                        }}
                      >
                        <span 
                          className="text-xl font-bold z-10 relative"
                          style={{ 
                            color: secondaryColor,
                            textShadow: `0 0 10px ${secondaryColor}80`
                          }}
                        >
                          2
                        </span>
                        
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                          <div 
                            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                            style={{ 
                              top: '30%', 
                              right: '20%',
                              animationDelay: '0.5s',
                              animationDuration: '2.5s'
                            }}
                          />
                          <div 
                            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                            style={{ 
                              bottom: '25%', 
                              left: '25%',
                              animationDelay: '1.5s',
                              animationDuration: '3s'
                            }}
                          />
                        </div>
                      </motion.div>
                      
                      <h3 
                        className="font-bold text-lg mb-2"
                        style={{ color: secondaryColor }}
                      >
                        Prenez une photo
                      </h3>
                      <p className="text-sm text-white/70 leading-relaxed">
                        Capturez votre moment parfait en HD
                      </p>
                      
                      <div className="mt-3 w-full bg-white/10 rounded-full h-1">
                        <motion.div 
                          className="h-1 rounded-full"
                          style={{ backgroundColor: primaryColor }}
                          initial={{ width: 0 }}
                          animate={{ width: '66%' }}
                          transition={{ duration: 1, delay: 1.8 }}
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* Étape 3 - Web 3.0 */}
                  <motion.div 
                    className="relative group"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 1.8 }}
                  >
                    <div 
                      className="relative backdrop-blur-lg bg-white/5 rounded-2xl border border-white/20 p-4 text-center transition-all duration-500 hover:scale-105 hover:bg-white/8"
                      style={{
                        boxShadow: `0 8px 32px ${secondaryColor}20, 
                                   0 0 0 1px ${primaryColor}30 inset,
                                   0 0 20px rgba(255,255,255,0.1) inset`
                      }}
                    >
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div 
                          className="absolute inset-0 rounded-2xl"
                          style={{
                            background: `conic-gradient(from 240deg, transparent 0deg, ${secondaryColor}50 60deg, transparent 120deg)`,
                            filter: 'blur(1px)'
                          }}
                        />
                      </div>
                      
                      <motion.div 
                        className="relative mx-auto mb-3 w-16 h-16 rounded-full flex items-center justify-center border-2"
                        style={{ 
                          background: `radial-gradient(circle at 50% 20%, ${secondaryColor}90, ${primaryColor}50, ${secondaryColor}70)`,
                          borderColor: secondaryColor,
                          boxShadow: `0 0 30px ${secondaryColor}60, 0 0 60px ${primaryColor}20 inset`
                        }}
                        whileHover={{ 
                          scale: 1.15, 
                          rotate: 15,
                          boxShadow: `0 0 50px ${secondaryColor}80, 0 0 80px ${primaryColor}30 inset`
                        }}
                      >
                        <span 
                          className="text-xl font-bold z-10 relative"
                          style={{ 
                            color: primaryColor,
                            textShadow: `0 0 10px ${primaryColor}80`
                          }}
                        >
                          3
                        </span>
                        
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                          <div 
                            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                            style={{ 
                              top: '15%', 
                              left: '40%',
                              animationDelay: '0.2s',
                              animationDuration: '2.8s'
                            }}
                          />
                          <div 
                            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                            style={{ 
                              bottom: '20%', 
                              right: '35%',
                              animationDelay: '2s',
                              animationDuration: '2.2s'
                            }}
                          />
                        </div>
                      </motion.div>
                      
                      <h3 
                        className="font-bold text-lg mb-2"
                        style={{ color: secondaryColor }}
                      >
                        Récupérez votre création
                      </h3>
                      <p className="text-sm text-white/70 leading-relaxed">
                        Téléchargez votre chef-d'œuvre transformé
                      </p>
                      
                      <div className="mt-3 w-full bg-white/10 rounded-full h-1">
                        <motion.div 
                          className="h-1 rounded-full"
                          style={{ backgroundColor: secondaryColor }}
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 1, delay: 2.0 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                  
                </div>
                
                {/* Effet de brillance globale */}
                <div className="absolute inset-0 rounded-3xl pointer-events-none">
                  <motion.div 
                    className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    animate={{ 
                      x: ['-100%', '200%'],
                      opacity: [0, 1, 0]
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity, 
                      repeatDelay: 5 
                    }}
                  />
                </div>
                
              </motion.div>
            </div>
          </motion.div>

          {/* Start button with modern hover effect */}
          <motion.div 
            className="flex justify-center items-center mt-12 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2.2 }}
          >
            <div 
              className="relative group cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleStartExperience();
              }}
            >
              <div 
                className="absolute -inset-1 bg-gradient-to-r from-white/30 to-white/60 blur-md opacity-75 group-hover:opacity-100 transition duration-500"
                style={{ 
                  borderRadius: '0.75rem', 
                }}
              ></div>
              <button 
                className="relative px-16 py-5 text-xl font-bold rounded-xl transition-all duration-300 transform group-hover:scale-105 shadow-xl"
                style={{ 
                  backgroundColor: secondaryColor, 
                  color: primaryColor 
                }}
              >
                TOUCHER L&apos;ÉCRAN POUR COMMENCER
              </button>
            </div>
          </motion.div>
          
          {/* Animation de chargement en bas */}
          <motion.div 
            className="mt-12 flex justify-center mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.4, duration: 0.6 }}
          >
            <div className="flex space-x-3 items-center">
              <div className="flex space-x-1">
                <div className="w-3 h-3 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-3 h-3 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}