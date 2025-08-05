"use client";

import { useEffect, useState, useCallback } from 'react';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';

export default function HowToUse({ params }) {
  const slug = params.slug;
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);

  const fetchProjectData = useCallback(async () => {
    try {
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
      
      setProject(projectData);
      
      // Ensure the project info is in localStorage
      localStorage.setItem('currentProjectId', projectData.id);
      localStorage.setItem('currentProjectSlug', slug);
      localStorage.setItem('projectData', JSON.stringify(projectData));
      
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  }, [slug, supabase]);

  useEffect(() => {
    // Try to load from localStorage first for faster rendering
    const cachedProject = localStorage.getItem('projectData');
    if (cachedProject) {
      try {
        setProject(JSON.parse(cachedProject));
        setLoading(false);
      } catch (e) {
        console.error("Error parsing cached project data:", e);
      }
    }
    
    // Always fetch fresh data from the server to ensure it's up-to-date
    fetchProjectData();
  }, [fetchProjectData]);
  
  const goToStyles = () => {
    router.push(`/photobooth-coiffure/${slug}/cam`);
  };
  
  if (loading) {
    return (
      <div className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center">
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
      className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-5 px-3 sm:px-5 relative"
      style={{
        paddingTop: '140px', // Plus d'espace pour éviter le chevauchement
      }}
    >
      {/* Header avec logo/titre - optimisé pour mobile */}
      <motion.div 
        className="fixed top-0 left-0 right-0 flex justify-center pt-2 sm:pt-4 z-20 bg-gradient-to-b from-black/20 to-transparent"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {project.logo_url ? (
          <motion.div
            className="w-[180px] h-[70px] sm:w-[250px] sm:h-[100px] relative z-10"
            whileHover={{ scale: 1.05, rotate: 2 }}
            transition={{ type: "spring", damping: 15 }}
          >
            <Image 
              src={project.logo_url} 
              fill
              alt={project.name} 
              className="object-contain drop-shadow-2xl" 
              priority 
            />
          </motion.div>
        ) : (
          <motion.h1 
            className="text-2xl sm:text-4xl font-bold text-center z-10 px-4" 
            style={{ 
              color: secondaryColor,
              textShadow: `0 0 20px ${primaryColor}50`
            }}
            whileHover={{ scale: 1.05 }}
          >
            {project.name}
          </motion.h1>
        )}
      </motion.div>

      {/* Section des étapes - design simplifié pour mobile */}
      <div className="relative w-full flex justify-center items-center z-10 mt-4 sm:mt-8">
        <div className="w-full max-w-4xl px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center space-y-6 sm:space-y-0 sm:space-x-4 md:space-x-8">
            
            {/* Étape 1 - Design simplifié pour mobile */}
            <motion.div 
              className="flex flex-col items-center text-center w-full sm:w-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              <motion.div 
                className="rounded-full h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 flex items-center justify-center mb-3 shadow-lg border-3 sm:border-4"
                style={{ backgroundColor: secondaryColor, borderColor: primaryColor }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <span className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: primaryColor }}>1</span>
              </motion.div>
              <h3 className="font-bold text-base sm:text-lg md:text-xl mb-1 px-2" style={{ color: secondaryColor }}>
                Choisissez votre style
              </h3>
              <p className="text-xs sm:text-sm text-white/80 px-4 sm:px-2">Sélectionnez le style qui vous plaît</p>
            </motion.div>

            {/* Flèche ou séparateur pour mobile */}
            <motion.div 
              className="flex justify-center sm:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <div className="w-1 h-8 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
            </motion.div>

            {/* Étape 2 */}
            <motion.div 
              className="flex flex-col items-center text-center w-full sm:w-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
            >
              <motion.div 
                className="rounded-full h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 flex items-center justify-center mb-3 shadow-lg border-3 sm:border-4"
                style={{ backgroundColor: secondaryColor, borderColor: primaryColor }}
                whileHover={{ scale: 1.1, rotate: -5 }}
              >
                <span className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: primaryColor }}>2</span>
              </motion.div>
              <h3 className="font-bold text-base sm:text-lg md:text-xl mb-1 px-2" style={{ color: secondaryColor }}>
                Prenez une photo
              </h3>
              <p className="text-xs sm:text-sm text-white/80 px-4 sm:px-2">Capturez votre plus beau sourire</p>
            </motion.div>

            {/* Flèche ou séparateur pour mobile */}
            <motion.div 
              className="flex justify-center sm:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <div className="w-1 h-8 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
            </motion.div>

            {/* Étape 3 */}
            <motion.div 
              className="flex flex-col items-center text-center w-full sm:w-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.9 }}
            >
              <motion.div 
                className="rounded-full h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 flex items-center justify-center mb-3 shadow-lg border-3 sm:border-4"
                style={{ backgroundColor: secondaryColor, borderColor: primaryColor }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <span className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: primaryColor }}>3</span>
              </motion.div>
              <h3 className="font-bold text-base sm:text-lg md:text-xl mb-1 px-2" style={{ color: secondaryColor }}>
                Récupérez votre création
              </h3>
              <p className="text-xs sm:text-sm text-white/80 px-4 sm:px-2">Téléchargez votre photo transformée</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bouton continuer - optimisé pour mobile */}
      <motion.div 
        className="fixed bottom-6 sm:bottom-8 md:bottom-12 lg:bottom-20 w-full z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <div className="w-[85%] sm:w-[75%] md:w-[80%] max-w-lg mx-auto px-4">
          {project.is_active ? (
            <motion.button 
              onClick={goToStyles} 
              className="w-full py-4 sm:py-4 md:py-6 font-bold text-base sm:text-lg md:text-xl lg:text-3xl rounded-lg shadow-xl border-2"
              style={{ 
                backgroundColor: secondaryColor, 
                color: primaryColor,
                borderColor: primaryColor,
                boxShadow: `0 15px 35px ${primaryColor}25`
              }}
              whileHover={{ 
                scale: 1.05, 
                boxShadow: `0 20px 50px ${primaryColor}35`
              }}
              whileTap={{ scale: 0.95 }}
            >
              CONTINUER
            </motion.button>
          ) : (
            <div className="w-full py-4 sm:py-6 text-center rounded-lg bg-red-50 border border-red-200 text-red-700 font-bold text-lg sm:text-xl shadow-xl">
              Photbooth désactivé. À bientôt !
            </div>
          )}
        </div>
      </motion.div>
    </main>
  );
}
