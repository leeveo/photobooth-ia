"use client";

import { useEffect, useRef, useState } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';

export default function PhotoboothProject({ params }) {
  const slug = params.slug;
  const router = useRouter();
  const supabase = createClientComponentClient();
  const fullscreenButtonRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null); // État pour le style sélectionné
  const [error, setError] = useState(null); // État pour les erreurs
  const [styles, setStyles] = useState([]); // État pour les styles disponibles

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
            
            // Fetch styles with limited fields
            const { data: stylesData, error: stylesError } = await supabase
              .from('styles')
              .select('id, name, description, preview_image, prompt')
              .eq('project_id', projectData.id)
              .eq('is_active', true);

            if (stylesError) {
              throw stylesError;
            }
            
            // Set available styles
            setStyles(stylesData || []);
            
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

  const handleStyleSelect = (style) => {
    setSelectedStyle(style);
    localStorage.setItem('selectedStyleId', style.id);
    localStorage.setItem('selectedStyleData', JSON.stringify(style)); 
    
    // Stocker le prompt pour la génération d'image
    localStorage.setItem('stylePrompt', style.prompt);
    
    // Stocker un genre neutre par défaut
    localStorage.setItem('styleGender', 'g');
  };

  if (loading) {
    return (
      <div className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return notFound();
  }

  const goToInstructions = () => {
    router.push(`/photobooth-premium/${slug}/how`);
  };

  // Dynamic styles based on project colors
  const primaryColor = project.primary_color || '#811A53';
  const secondaryColor = project.secondary_color || '#E5E40A';
  const homeMessage = project.home_message || "Transformez votre photo avec l'IA !";

  return (
    <main 
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Logo or title */}
        <div className="fixed top-0 mx-auto w-full flex justify-center mt-4">
          {project.logo_url ? (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="w-[280px] relative"
            >
              <Image 
                src={project.logo_url} 
                width={280} 
                height={100} 
                alt={project.name} 
                className="w-full object-contain" 
                priority 
              />
            </motion.div>
          ) : (
            <motion.h1 
              className="text-4xl font-bold text-center" 
              style={{ color: secondaryColor }}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {project.name}
            </motion.h1>
          )}
        </div>

        {/* Welcome message */}
        <motion.div 
          className="mt-32 text-center mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <h2 
            className="text-3xl sm:text-5xl font-bold"
            style={{ color: secondaryColor }}
          >
            {homeMessage}
          </h2>
          <p className="mt-6 text-white text-opacity-90 max-w-3xl mx-auto text-xl">
            Choisissez un style artistique, prenez une photo et découvrez le résultat généré par l'intelligence artificielle
          </p>
        </motion.div>
        
        {/* Styles selection - with improved grid layout */}
        <div className="mb-12">
          <motion.h3 
            className="text-xl font-semibold text-center mb-8" 
            style={{ color: secondaryColor }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            Sélectionnez un style artistique
          </motion.h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {styles.map((style, index) => (
              <motion.div 
                key={style.id} 
                className={`rounded-lg cursor-pointer transition-all duration-300 ease-in-out overflow-hidden backdrop-blur-sm bg-white/10 shadow-lg hover:shadow-xl ${
                  selectedStyle?.id === style.id ? 'ring-2 ring-white scale-105' : 'hover:scale-[1.03]'
                }`}
                onClick={() => handleStyleSelect(style)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 + (index * 0.1) }}
              >
                <div className="relative aspect-square overflow-hidden">
                  <Image 
                    src={style.preview_image} 
                    width={200} 
                    height={200} 
                    alt={style.name} 
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-70 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-white text-lg">{style.name}</h4>
                  <p className="mt-1 text-white/80 text-sm line-clamp-2">{style.description}</p>
                </div>
                
                {/* Badge de sélection */}
                {selectedStyle?.id === style.id && (
                  <div className="absolute top-4 right-4 bg-white/90 text-purple-900 text-sm font-bold px-3 py-1.5 rounded-full">
                    Sélectionné
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Start button */}
        <motion.div 
          className="relative w-full flex justify-center items-center mt-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <motion.div 
            id="btn-taptostart" 
            className="relative mx-auto flex w-[75%] max-w-md justify-center items-center cursor-pointer py-5 rounded-xl"
            onClick={goToInstructions}
            style={{ backgroundColor: secondaryColor }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span 
              className="text-2xl font-bold"
              style={{ color: primaryColor }}
            >
              COMMENCER
            </span>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
