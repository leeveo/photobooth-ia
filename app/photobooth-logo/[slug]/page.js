"use client";

import { useEffect, useState } from 'react';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

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
    if (project?.photobooth_type === 'logo') {
      router.push(`/photobooth-logo/${slug}/cam`);
    } else if (project?.photobooth_type === 'logo') {
      router.push(`/photobooth-logo/${slug}/style`);
    } else {
      router.push(`/photobooth-logo/${slug}/how`);
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
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner 
          text="Préparation de votre expérience premium..." 
          size="large" 
          color="purple" 
        />
      </div>
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
    <div className="relative z-10 w-full h-full">
      {/* Fullscreen button - ONLY show if not already in fullscreen */}
      {settings?.enable_fullscreen && !isFullscreen && (
        <button 
          onClick={enterFullscreen}
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

          {/* Start button with modern hover effect */}
          <motion.div 
            className="flex justify-center items-center mt-12 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <div 
              className="relative group cursor-pointer"
              onClick={handleStartExperience}
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
                COMMENCER L&apos;EXPÉRIENCE
              </button>
            </div>
          </motion.div>
          
          {/* Animation de chargement en bas */}
          <motion.div 
            className="mt-12 flex justify-center mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
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

