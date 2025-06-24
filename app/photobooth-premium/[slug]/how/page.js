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
    router.push(`/photobooth-premium/${slug}/style`);
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
      className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-5 px-5"
    >
      <motion.div 
        className="fixed top-0 left-0 right-0 flex justify-center mt-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {project.logo_url ? (
          <div className="w-[250px] h-[100px] relative">
            <Image 
              src={project.logo_url} 
              fill
              alt={project.name} 
              className="object-contain" 
              priority 
            />
          </div>
        ) : (
          <h1 
            className="text-4xl font-bold text-center" 
            style={{ color: secondaryColor }}
          >
            {project.name}
          </h1>
        )}
      </motion.div>

      <div className="relative w-full flex justify-center items-center mt-8 md:mt-[12vh] lg:mt-[10vh]">
        <div className="w-full max-w-5xl px-4 md:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-8 md:mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <h2 
              className="text-4xl md:text-6xl font-bold mb-4"
              style={{ color: secondaryColor }}
            >
              Comment ça marche ?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mx-auto">
            <motion.div 
              className="text-center bg-black bg-opacity-20 rounded-xl p-5 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              <motion.div 
                className="rounded-full h-20 w-20 md:h-24 md:w-24 flex items-center justify-center mx-auto mb-4 shadow-lg"
                style={{ backgroundColor: secondaryColor }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <span className="text-2xl md:text-3xl font-bold" style={{ color: primaryColor }}>1</span>
              </motion.div>
              <h3 className="font-bold text-lg md:text-xl mb-2" style={{ color: secondaryColor }}>Choisissez votre style</h3>
              
            </motion.div>
            
            <motion.div 
              className="text-center bg-black bg-opacity-20 rounded-xl p-5 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
            >
              <motion.div 
                className="rounded-full h-20 w-20 md:h-24 md:w-24 flex items-center justify-center mx-auto mb-4 shadow-lg"
                style={{ backgroundColor: secondaryColor }}
                whileHover={{ scale: 1.1, rotate: -5 }}
              >
                <span className="text-2xl md:text-3xl font-bold" style={{ color: primaryColor }}>2</span>
              </motion.div>
              <h3 className="font-bold text-lg md:text-xl mb-2" style={{ color: secondaryColor }}>Prenez une photo</h3>
             
            </motion.div>
            
            <motion.div 
              className="text-center bg-black bg-opacity-20 rounded-xl p-5 backdrop-blur-sm sm:col-span-2 md:col-span-1 sm:max-w-xs sm:mx-auto md:mx-0 md:max-w-none"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.9 }}
            >
              <motion.div 
                className="rounded-full h-20 w-20 md:h-24 md:w-24 flex items-center justify-center mx-auto mb-4 shadow-lg"
                style={{ backgroundColor: secondaryColor }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <span className="text-2xl md:text-3xl font-bold" style={{ color: primaryColor }}>3</span>
              </motion.div>
              <h3 className="font-bold text-lg md:text-xl mb-2" style={{ color: secondaryColor }}>Récupérez votre création</h3>
              
            </motion.div>
          </div>
        </div>
      </div>

      <motion.div 
        className="fixed bottom-8 sm:bottom-12 md:bottom-20 w-full"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <div className="w-[75%] sm:w-[80%] max-w-lg mx-auto">
          <motion.button 
            onClick={goToStyles} 
            className="w-full py-3 sm:py-4 md:py-6 font-bold text-lg sm:text-xl md:text-3xl rounded-lg shadow-xl border-2"
            style={{ 
              backgroundColor: secondaryColor, 
              color: primaryColor,
              borderColor: primaryColor 
            }}
            whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}
            whileTap={{ scale: 0.95 }}
          >
            CONTINUER
          </motion.button>
        </div>
      </motion.div>
    </main>
  );
}
