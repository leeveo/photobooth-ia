"use client";

import { useEffect, useState, useCallback } from 'react';
import Image from "next/image";
import Link from 'next/link';
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

  // Memoize fetchProjectData with useCallback
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
  }, [slug, supabase]); // Remove params.slug, keep slug

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);
  
  // Define all callback functions at the top level, BEFORE any conditional returns
  const handleGoToCam = useCallback(() => {
    router.push(`/photobooth/${slug}/cam`);
  }, [router, slug]); // Add slug to dependencies

  // Move ALL conditional useCallback hooks here
  const conditionalAction1 = useCallback(() => {
    // Implementation for the first conditional action
    console.log("Conditional action 1");
  }, []);

  const conditionalAction2 = useCallback(() => {
    // Implementation for the second conditional action
    console.log("Conditional action 2");
  }, []);

  const conditionalAction3 = useCallback(() => {
    // Implementation for the third conditional action
    console.log("Conditional action 3");
  }, []);

  const conditionalAction4 = useCallback(() => {
    // Implementation for the fourth conditional action
    console.log("Conditional action 4");
  }, []);

  const conditionalAction5 = useCallback(() => {
    // Implementation for the fifth conditional action
    console.log("Conditional action 5");
  }, []);

  const conditionalAction6 = useCallback(() => {
    // Implementation for the sixth conditional action
    console.log("Conditional action 6");
  }, []);

  const goToStyles = useCallback(() => {
    router.push(`/photobooth/${slug}/style`);
  }, [router, slug]);

  // AFTER defining all hooks, we can have conditional returns
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

  // Dynamic styles based on project colors
  const primaryColor = project.primary_color || '#811A53';
  const secondaryColor = project.secondary_color || '#E5E40A';

  // Now we can use the functions in conditional logic, but not define them
  // In your existing code, REPLACE all useCallback definitions with function calls
  // For example:
  // if (someCondition) {
  //   conditionalAction1();  // call the function, don't define it with useCallback
  // }

  return (
    <div className="relative z-10 w-full h-full">
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
            <div className="w-[250px] h-[250px] relative">
              <Image 
                src={project.logo_url} 
                alt={project.name} 
                fill
                style={{ objectFit: "contain" }}
                priority 
                className="drop-shadow-xl"
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

        <div className="relative w-full mt-[20vh]">
          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <h2 
              className="text-2xl font-bold mb-4"
              style={{ color: secondaryColor }}
            >
              Comment ça marche ?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              <div 
                className="rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: secondaryColor }}
              >
                <span className="text-3xl" style={{ color: primaryColor }}>1</span>
              </div>
              <h3 className="font-bold mb-2" style={{ color: secondaryColor }}>Choisissez votre style</h3>
              <p className="text-white">Sélectionnez un style de vêtements qui vous plaît</p>
            </motion.div>
            
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
            >
              <div 
                className="rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: secondaryColor }}
              >
                <span className="text-3xl" style={{ color: primaryColor }}>2</span>
              </div>
              <h3 className="font-bold mb-2" style={{ color: secondaryColor }}>Prenez une photo</h3>
              <p className="text-white">Positionnez-vous et prenez une photo avec la caméra</p>
            </motion.div>
            
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.9 }}
            >
              <div 
                className="rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: secondaryColor }}
              >
                <span className="text-3xl" style={{ color: primaryColor }}>3</span>
              </div>
              <h3 className="font-bold mb-2" style={{ color: secondaryColor }}>Récupérez votre création</h3>
              <p className="text-white">Admirez votre photo générée par l&apos;IA et partagez-la</p>
            </motion.div>
          </div>
        </div>

        <motion.div 
          className="fixed bottom-10 w-full"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <div className="w-[70%] mx-auto">
            <motion.button 
              onClick={goToStyles} 
              className="w-full py-4 font-bold text-xl rounded-lg"
              style={{ backgroundColor: secondaryColor, color: primaryColor }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              CONTINUER
            </motion.button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
