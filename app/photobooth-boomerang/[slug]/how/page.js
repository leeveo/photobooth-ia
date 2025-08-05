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
    router.push(`/photobooth-boomerang/${slug}/cam`);
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
      className="flex fixed h-full w-full flex-col items-center justify-center pt-2 pb-5 px-3 sm:px-5 relative overflow-hidden"
      style={{
        paddingTop: '140px', // Plus d'espace pour éviter le chevauchement
      }}
    >
      {/* Animated gradient background - moins complexe sur mobile */}
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

      {/* Floating background elements - simplifiés sur mobile */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* Large floating orbs - réduits sur mobile */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute rounded-full opacity-10 lg:opacity-20 backdrop-blur-sm"
            style={{
              backgroundColor: i % 2 === 0 ? primaryColor : secondaryColor,
              width: `${60 + Math.random() * 100}px`,
              height: `${60 + Math.random() * 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 50 - 25, 0],
              y: [0, Math.random() * 50 - 25, 0],
              scale: [1, 1.1, 1],
              opacity: [0.05, 0.15, 0.05],
            }}
            transition={{
              duration: 8 + Math.random() * 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 3,
            }}
          />
        ))}

        {/* Small sparkle particles - réduits sur mobile */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute w-1 h-1 rounded-full hidden lg:block"
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
      </div>

      {/* Header avec logo/titre - optimisé pour mobile */}
      <motion.div 
        className="fixed top-0 left-0 right-0 flex justify-center pt-2 sm:pt-4 z-20 bg-gradient-to-b from-black/20 to-transparent"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Animated halo behind logo - réduit sur mobile */}
        <motion.div
          className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-40 sm:w-64 sm:h-64 rounded-full opacity-10 sm:opacity-20"
          style={{
            background: `radial-gradient(circle, ${secondaryColor}40, transparent 70%)`
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.3, 0.1],
            rotate: [0, 360],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

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
            {/* Glow effect behind logo - réduit sur mobile */}
            <motion.div
              className="absolute inset-0 blur-xl opacity-30 sm:opacity-50 -z-10"
              style={{ backgroundColor: secondaryColor }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.4, 0.2],
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

      {/* Section des étapes - Design adaptatif */}
      <div className="relative w-full flex justify-center items-center z-10 mt-4 sm:mt-8 lg:mt-12">
        <div className="w-full max-w-4xl lg:max-w-5xl px-3 sm:px-4 md:px-6">
          
          {/* Version Mobile et Tablette - Design simple */}
          <div className="block lg:hidden">
            <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center space-y-6 sm:space-y-0 sm:space-x-4 md:space-x-8">
              
              {/* Étape 1 - Mobile/Tablette */}
              <motion.div 
                className="flex flex-col items-center text-center w-full sm:w-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
              >
                <motion.div 
                  className="rounded-full h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center mb-3 shadow-lg border-3 sm:border-4"
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
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <div className="w-1 h-8 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
              </motion.div>

              {/* Étape 2 - Mobile/Tablette */}
              <motion.div 
                className="flex flex-col items-center text-center w-full sm:w-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.7 }}
              >
                <motion.div 
                  className="rounded-full h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center mb-3 shadow-lg border-3 sm:border-4"
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
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                <div className="w-1 h-8 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
              </motion.div>

              {/* Étape 3 - Mobile/Tablette */}
              <motion.div 
                className="flex flex-col items-center text-center w-full sm:w-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.9 }}
              >
                <motion.div 
                  className="rounded-full h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center mb-3 shadow-lg border-3 sm:border-4"
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

          {/* Version Desktop - Design Web 3.0 avec animations boomerang */}
          <div className="hidden lg:block">
            {/* Conteneur principal avec effet glassmorphism */}
            <motion.div 
              className="relative backdrop-blur-xl bg-white/5 rounded-3xl border border-white/20 p-8 shadow-2xl overflow-hidden"
              style={{
                background: `linear-gradient(135deg, 
                  ${primaryColor}08 0%, 
                  ${secondaryColor}12 35%, 
                  transparent 70%),
                  linear-gradient(45deg, 
                  rgba(255,255,255,0.05) 0%, 
                  rgba(255,255,255,0.02) 100%)`
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              
              {/* Particules boomerang flottantes */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={`boomerang-${i}`}
                  className="absolute w-4 h-1 rounded-full opacity-20"
                  style={{
                    backgroundColor: i % 2 === 0 ? primaryColor : secondaryColor,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    x: [0, 100, 0],
                    y: [0, -50, 0],
                    rotate: [0, 720, 0],
                    opacity: [0.1, 0.4, 0.1],
                  }}
                  transition={{
                    duration: 4 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 3,
                    ease: "easeInOut"
                  }}
                />
              ))}
              
              {/* Titre section avec effet néon */}
              <motion.div 
                className="text-center mb-12"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <h2 
                  className="text-4xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(45deg, ${secondaryColor}, ${primaryColor}, ${secondaryColor})`,
                    filter: 'drop-shadow(0 0 20px rgba(229, 228, 10, 0.3))'
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

              {/* Grille des étapes avec animations boomerang */}
              <div className="grid grid-cols-3 gap-6 relative">
                
                {/* Lignes de connexion animées */}
                <motion.div 
                  className="absolute top-1/2 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent transform -translate-y-1/2 z-0"
                  animate={{
                    opacity: [0.3, 0.8, 0.3],
                    scaleX: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                
                {/* Étape 1 - Web 3.0 Card avec effet boomerang */}
                <motion.div 
                  className="relative group"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                >
                  <div 
                    className="relative backdrop-blur-lg bg-white/10 rounded-2xl border border-white/30 p-6 text-center transition-all duration-500 hover:scale-105 hover:bg-white/15"
                    style={{
                      boxShadow: `0 8px 32px ${primaryColor}20, 
                                 0 0 0 1px ${secondaryColor}30 inset,
                                 0 0 20px rgba(255,255,255,0.1) inset`
                    }}
                  >
                    {/* Effet boomerang rotatif */}
                    <motion.div 
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      animate={{
                        background: [
                          `conic-gradient(from 0deg, transparent 0deg, ${secondaryColor}40 60deg, transparent 120deg)`,
                          `conic-gradient(from 120deg, transparent 0deg, ${secondaryColor}40 60deg, transparent 120deg)`,
                          `conic-gradient(from 240deg, transparent 0deg, ${secondaryColor}40 60deg, transparent 120deg)`,
                        ]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      style={{ filter: 'blur(1px)' }}
                    />
                    
                    {/* Numéro avec effet holographique et boomerang */}
                    <motion.div 
                      className="relative mx-auto mb-4 w-20 h-20 rounded-full flex items-center justify-center border-2"
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
                      animate={{
                        boxShadow: [
                          `0 0 30px ${secondaryColor}50, 0 0 60px ${primaryColor}30 inset`,
                          `0 0 40px ${secondaryColor}60, 0 0 80px ${primaryColor}40 inset`,
                          `0 0 30px ${secondaryColor}50, 0 0 60px ${primaryColor}30 inset`
                        ]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <span 
                        className="text-2xl font-bold z-10 relative"
                        style={{ 
                          color: primaryColor,
                          textShadow: `0 0 10px ${primaryColor}80`
                        }}
                      >
                        1
                      </span>
                      
                      {/* Particules boomerang */}
                      <div className="absolute inset-0 rounded-full overflow-hidden">
                        {[...Array(4)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full"
                            style={{ 
                              top: '50%', 
                              left: '50%',
                            }}
                            animate={{
                              x: [0, Math.cos(i * 90 * Math.PI / 180) * 25, 0],
                              y: [0, Math.sin(i * 90 * Math.PI / 180) * 25, 0],
                              opacity: [0, 1, 0],
                              scale: [0, 1.5, 0]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: i * 0.5,
                              ease: "easeInOut"
                            }}
                          />
                        ))}
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
                    
                    {/* Indicateur de progression avec effet boomerang */}
                    <div className="mt-4 w-full bg-white/10 rounded-full h-1">
                      <motion.div 
                        className="h-1 rounded-full"
                        style={{ backgroundColor: secondaryColor }}
                        animate={{
                          width: ['0%', '33%', '0%', '33%']
                        }}
                        transition={{ 
                          duration: 4, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Étape 2 et 3 avec des variations similaires... */}
                {/* (code similaire avec des animations adaptées) */}
                
              </div>
              
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bouton continuer - version simplifiée pour mobile */}
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
              className="w-full py-4 sm:py-4 md:py-6 font-bold text-base sm:text-lg md:text-xl lg:text-3xl rounded-lg shadow-xl border-2 relative overflow-hidden group"
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
              {/* Effets animés simplifiés pour mobile, complets pour desktop */}
              <div className="hidden lg:block">
                {/* Animated floating bubbles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`bubble-${i}`}
                    className="absolute rounded-full opacity-30"
                    style={{
                      backgroundColor: primaryColor,
                      width: `${8 + Math.random() * 12}px`,
                      height: `${8 + Math.random() * 12}px`,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [0, -20, 0],
                      x: [0, Math.random() * 20 - 10, 0],
                      scale: [1, 1.3, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>

              {/* Simple shine effect for all devices */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
              />
              
              <span className="relative z-10">CONTINUER</span>
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