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
      className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-5 px-5 relative"
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

      <motion.div 
        className="fixed top-0 left-0 right-0 flex justify-center mt-4 z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
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

      <div className="relative w-full flex justify-center items-center mt-8 md:mt-[12vh] lg:mt-[10vh] z-10">
        <div className="w-full max-w-5xl px-4 md:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-8 md:mb-10 relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <motion.h2 
              className="text-4xl md:text-6xl font-bold mb-4 relative z-10"
              style={{ 
                color: secondaryColor,
                textShadow: `0 0 30px ${secondaryColor}50`
              }}
              whileHover={{ 
                scale: 1.02,
                textShadow: `0 0 40px ${secondaryColor}80`
              }}
            >
              Comment ça marche ?
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mx-auto">
            <motion.div 
              className="text-center backdrop-blur-md bg-white/10 rounded-xl p-5 border border-white/20 shadow-xl"
              style={{
                boxShadow: `0 20px 60px ${primaryColor}15, inset 0 1px 0 rgba(255,255,255,0.1)`
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              whileHover={{ 
                y: -8,
                boxShadow: `0 30px 80px ${primaryColor}30, 0 0 0 2px ${secondaryColor}40`
              }}
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
              className="text-center backdrop-blur-md bg-white/10 rounded-xl p-5 border border-white/20 shadow-xl"
              style={{
                boxShadow: `0 20px 60px ${primaryColor}15, inset 0 1px 0 rgba(255,255,255,0.1)`
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              whileHover={{ 
                y: -8,
                boxShadow: `0 30px 80px ${primaryColor}30, 0 0 0 2px ${secondaryColor}40`
              }}
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
              className="text-center backdrop-blur-md bg-white/10 rounded-xl p-5 border border-white/20 shadow-xl sm:col-span-2 md:col-span-1 sm:max-w-xs sm:mx-auto md:mx-0 md:max-w-none"
              style={{
                boxShadow: `0 20px 60px ${primaryColor}15, inset 0 1px 0 rgba(255,255,255,0.1)`
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.9 }}
              whileHover={{ 
                y: -8,
                boxShadow: `0 30px 80px ${primaryColor}30, 0 0 0 2px ${secondaryColor}40`
              }}
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
        className="fixed bottom-8 sm:bottom-12 md:bottom-20 w-full z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <div className="w-[75%] sm:w-[80%] max-w-lg mx-auto">
          <motion.button 
            onClick={goToStyles} 
            className="w-full py-3 sm:py-4 md:py-6 font-bold text-lg sm:text-xl md:text-3xl rounded-lg shadow-xl border-2 relative overflow-hidden group"
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
            {/* Animated floating bubbles */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`bubble-${i}`}
                className="absolute rounded-full opacity-30"
                style={{
                  backgroundColor: primaryColor,
                  width: `${8 + Math.random() * 16}px`,
                  height: `${8 + Math.random() * 16}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  x: [0, Math.random() * 20 - 10, 0],
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "easeInOut"
                }}
              />
            ))}

            {/* Animated wave pattern */}
            <motion.div
              className="absolute inset-0 opacity-20"
              style={{
                background: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 10px,
                  ${primaryColor}40 10px,
                  ${primaryColor}40 20px
                )`
              }}
              animate={{
                backgroundPosition: ["0px 0px", "40px 40px"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />

            {/* Pulsing rings */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`ring-${i}`}
                className="absolute rounded-full border-2 opacity-40"
                style={{
                  borderColor: primaryColor,
                  width: `${40 + i * 20}px`,
                  height: `${40 + i * 20}px`,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
                animate={{
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.4, 0.1, 0.4],
                  rotate: [0, 360]
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeInOut"
                }}
              />
            ))}

            {/* Shooting stars */}
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  x: [0, 60],
                  y: [0, -30],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.8,
                  ease: "easeOut"
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
                <motion.div
                  className="absolute top-0 left-0 w-8 h-0.5 origin-left"
                  style={{ backgroundColor: primaryColor }}
                  animate={{ scaleX: [0, 1, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.8,
                  }}
                />
              </motion.div>
            ))}

            {/* Animated background shine */}
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

            {/* Sparkle explosion on hover */}
            <motion.div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={`sparkle-${i}`}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: primaryColor,
                    left: '50%',
                    top: '50%',
                  }}
                  animate={{
                    x: [0, (Math.cos(i * 30 * Math.PI / 180) * 40)],
                    y: [0, (Math.sin(i * 30 * Math.PI / 180) * 40)],
                    opacity: [1, 0],
                    scale: [0, 1.5, 0],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </motion.div>

            {/* Rotating gradient overlay */}
            <motion.div
              className="absolute inset-0 opacity-30 rounded-lg"
              style={{
                background: `conic-gradient(from 0deg, transparent, ${primaryColor}40, transparent, ${primaryColor}60, transparent)`
              }}
              animate={{ rotate: [0, 360] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            
            <span className="relative z-10">CONTINUER</span>
          </motion.button>
        </div>
      </motion.div>
    </main>
  );
}
