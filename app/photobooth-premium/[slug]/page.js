"use client";

import { useEffect, useRef, useState } from 'react';
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
  const fullscreenButtonRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  
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
  
  const requestFullscreen = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.mozRequestFullScreen) { // Firefox
        await element.mozRequestFullScreen();
      } else if (element.webkitRequestFullscreen) { // Chrome, Safari and Opera
        await element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) { // IE/Edge
        await element.msRequestFullscreen();
      }
      console.log("Fullscreen mode requested");
    } catch (error) {
      console.error("Fullscreen request failed:", error);
    }
  };

  // Request fullscreen automatically if enabled in settings
  useEffect(() => {
    if (settings?.enable_fullscreen && fullscreenButtonRef.current) {
      fullscreenButtonRef.current.click();
    }
  }, [settings]);

  const goToInstructions = () => {
    router.push(`/photobooth-premium/${slug}/how`);
  };

  // Afficher un message d'erreur si nécessaire
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

  if (!project) {
    return notFound();
  }

  // Dynamic styles based on project colors
  const primaryColor = project.primary_color || '#811A53';
  const secondaryColor = project.secondary_color || '#E5E40A';
  const homeMessage = project.home_message || "Transformez votre photo avec l'IA !";

  return (
    <main 
      className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 overflow-auto"
      style={{ backgroundColor: primaryColor }}
    >
      {/* Hidden fullscreen button */}
      <button 
        ref={fullscreenButtonRef} 
        onClick={requestFullscreen} 
        className="hidden"
      >
        Fullscreen
      </button>

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
            onClick={goToInstructions}
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
            <p className="text-white/80">Préparation de votre expérience photo...</p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
