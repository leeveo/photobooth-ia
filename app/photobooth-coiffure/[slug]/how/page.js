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
    router.push(`/photobooth-coiffure/${slug}/style`);
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
      className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-5 px-5 relative"
      // Ajout d'un padding-top responsive pour éviter le chevauchement
      style={{
        paddingTop: '120px', // espace pour le titre/logo sur mobile
      }}
    >
      <motion.div 
        className="fixed top-0 left-0 right-0 flex justify-center mt-4 z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {project.logo_url ? (
          <motion.div
            className="w-[250px] h-[100px] relative z-10"
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
            className="text-4xl font-bold text-center z-10" 
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

      <div className="relative w-full flex justify-center items-center z-10">
        <div className="w-full max-w-5xl px-4 md:px-6 lg:px-8">
          {/* Centrage vertical et horizontal de la grille */}
          <div
            className="flex items-center justify-center min-h-[60vh]"
            // Ajout d'une marge supérieure responsive pour la grille
            style={{
              marginTop: '0.5rem', // petite marge sur mobile
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mx-auto">
              {/* Cadre 1 */}
              <motion.div 
                className="relative text-center rounded-3xl p-7 border-2 shadow-2xl bg-white/20 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_40px_10px_rgba(0,0,0,0.15)]"
                style={{
                  borderColor: secondaryColor,
                  boxShadow: `0 8px 40px 0 ${primaryColor}22, 0 1.5px 0 ${secondaryColor}33 inset`
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                whileHover={{ 
                  y: -12,
                  boxShadow: `0 16px 60px 0 ${primaryColor}44, 0 0 0 4px ${secondaryColor}55`
                }}
              >
                {/* Décor design */}
                <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-gradient-to-br from-white/60 to-transparent border-2 border-dashed" style={{borderColor: primaryColor, opacity:0.5}} />
                <div className="absolute -bottom-4 -right-4 w-10 h-10 rounded-full bg-gradient-to-tl from-white/60 to-transparent border-2 border-dashed" style={{borderColor: secondaryColor, opacity:0.5}} />
                <motion.div 
                  className="rounded-full h-20 w-20 md:h-24 md:w-24 flex items-center justify-center mx-auto mb-4 shadow-lg border-4"
                  style={{ backgroundColor: secondaryColor, borderColor: primaryColor }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <span className="text-2xl md:text-3xl font-bold" style={{ color: primaryColor }}>1</span>
                </motion.div>
                <h3 className="font-bold text-lg md:text-xl mb-2" style={{ color: secondaryColor }}>Choisissez votre style</h3>
              </motion.div>
              {/* Cadre 2 */}
              <motion.div 
                className="relative text-center rounded-3xl p-7 border-2 shadow-2xl bg-white/20 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_40px_10px_rgba(0,0,0,0.15)]"
                style={{
                  borderColor: secondaryColor,
                  boxShadow: `0 8px 40px 0 ${primaryColor}22, 0 1.5px 0 ${secondaryColor}33 inset`
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.7 }}
                whileHover={{ 
                  y: -12,
                  boxShadow: `0 16px 60px 0 ${primaryColor}44, 0 0 0 4px ${secondaryColor}55`
                }}
              >
                <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-gradient-to-bl from-white/60 to-transparent border-2 border-dashed" style={{borderColor: secondaryColor, opacity:0.5}} />
                <div className="absolute -bottom-4 -left-4 w-10 h-10 rounded-full bg-gradient-to-tr from-white/60 to-transparent border-2 border-dashed" style={{borderColor: primaryColor, opacity:0.5}} />
                <motion.div 
                  className="rounded-full h-20 w-20 md:h-24 md:w-24 flex items-center justify-center mx-auto mb-4 shadow-lg border-4"
                  style={{ backgroundColor: secondaryColor, borderColor: primaryColor }}
                  whileHover={{ scale: 1.1, rotate: -5 }}
                >
                  <span className="text-2xl md:text-3xl font-bold" style={{ color: primaryColor }}>2</span>
                </motion.div>
                <h3 className="font-bold text-lg md:text-xl mb-2" style={{ color: secondaryColor }}>Prenez une photo</h3>
              </motion.div>
              {/* Cadre 3 */}
              <motion.div 
                className="relative text-center rounded-3xl p-7 border-2 shadow-2xl bg-white/20 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_40px_10px_rgba(0,0,0,0.15)] sm:col-span-2 md:col-span-1 sm:max-w-xs sm:mx-auto md:mx-0 md:max-w-none"
                style={{
                  borderColor: secondaryColor,
                  boxShadow: `0 8px 40px 0 ${primaryColor}22, 0 1.5px 0 ${secondaryColor}33 inset`
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.9 }}
                whileHover={{ 
                  y: -12,
                  boxShadow: `0 16px 60px 0 ${primaryColor}44, 0 0 0 4px ${secondaryColor}55`
                }}
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-b from-white/60 to-transparent border-2 border-dashed" style={{borderColor: primaryColor, opacity:0.5}} />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-t from-white/60 to-transparent border-2 border-dashed" style={{borderColor: secondaryColor, opacity:0.5}} />
                <motion.div 
                  className="rounded-full h-20 w-20 md:h-24 md:w-24 flex items-center justify-center mx-auto mb-4 shadow-lg border-4"
                  style={{ backgroundColor: secondaryColor, borderColor: primaryColor }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <span className="text-2xl md:text-3xl font-bold" style={{ color: primaryColor }}>3</span>
                </motion.div>
                <h3 className="font-bold text-lg md:text-xl mb-2" style={{ color: secondaryColor }}>Récupérez votre création</h3>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <motion.div 
        className="fixed bottom-8 sm:bottom-12 md:bottom-20 w-full z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <div className="w-[75%] sm:w-[80%] max-w-lg mx-auto">
          {project.is_active ? (
            <motion.button 
              onClick={goToStyles} 
              className="w-full py-3 sm:py-4 md:py-6 font-bold text-lg sm:text-xl md:text-3xl rounded-lg shadow-xl border-2"
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
            <div className="w-full py-6 text-center rounded-lg bg-red-50 border border-red-200 text-red-700 font-bold text-xl shadow-xl">
              Photbooth désactivé. À bientôt !
            </div>
          )}
        </div>
      </motion.div>
    </main>
  );
}