'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';

export default function StyleSelection({ params }) {
  const slug = params.slug;
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [stylesLoading, setStylesLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [styles, setStyles] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [error, setError] = useState(null);

  // Define fetchStyles first - without any dependencies on fetchProjectData
  const fetchStyles = useCallback(async (projectId) => {
    setStylesLoading(true);
    try {
      console.log(`Chargement des styles pour projet=${projectId}`);
      
      // Récupérer tous les styles pour ce projet
      const { data, error } = await supabase
        .from('styles')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('name');
        
      if (error) {
        console.error("Erreur lors du chargement des styles:", error);
        throw error;
      }
      
      console.log(`${data?.length || 0} styles trouvés`);
      setStyles(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des styles:', error);
      setError("Impossible de charger les styles");
    } finally {
      setStylesLoading(false);
    }
  }, [supabase]); // Only depends on supabase
  
  // Now define fetchProjectData separately
  const fetchProjectData = useCallback(async () => {
    try {
      // Retry logic for Supabase
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Récupérer les données du projet par slug
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, name, slug, logo_url, primary_color, secondary_color, is_active')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

          if (projectError || !projectData) {
            console.error('Projet non trouvé ou inactif:', projectError);
            throw projectError;
          }
          
          setProject(projectData);
          
          // Récupérer les paramètres du projet
          const { data: settingsData } = await supabase
            .from('project_settings')
            .select('default_gender')
            .eq('project_id', projectData.id)
            .single();
          
          const projectSettings = settingsData || { default_gender: 'g' };
          setSettings(projectSettings);
          
          // Stocker les infos du projet dans localStorage
          localStorage.setItem('currentProjectId', projectData.id);
          localStorage.setItem('currentProjectSlug', slug);
          localStorage.setItem('projectData', JSON.stringify(projectData));
          localStorage.setItem('projectSettings', JSON.stringify(projectSettings));
          
          // Récupérer les styles disponibles
          fetchStyles(projectData.id);
          
          // Success - break the retry loop
          break;
        } catch (retryError) {
          retryCount++;
          console.warn(`Tentative ${retryCount} échouée:`, retryError);
          
          if (retryCount >= maxRetries) {
            throw retryError;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du projet:', error);
      setError("Impossible de charger les données du projet. Veuillez réessayer.");
      
      // Use cached data if available
      const cachedProject = localStorage.getItem('projectData');
      if (cachedProject) {
        try {
          const parsedProject = JSON.parse(cachedProject);
          setProject(parsedProject);
          console.log('Utilisation des données en cache comme solution de secours');
          
          // Also try to load styles from cache
          if (parsedProject.id) {
            fetchStyles(parsedProject.id);
          }
        } catch (e) {
          console.error("Error parsing cached project data:", e);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [slug, supabase, fetchStyles]); // Include fetchStyles dependency now that it's defined first
  
  useEffect(() => {
    // Essayer de charger depuis localStorage pour un rendu plus rapide
    const cachedProject = localStorage.getItem('projectData');
    if (cachedProject) {
      try {
        const parsedProject = JSON.parse(cachedProject);
        setProject(parsedProject);
        
        // Récupérer les paramètres en cache
        const cachedSettings = localStorage.getItem('projectSettings');
        if (cachedSettings) {
          const parsedSettings = JSON.parse(cachedSettings);
          setSettings(parsedSettings);
        }
        
        // If we have a cached project ID, try to load styles immediately
        if (parsedProject.id) {
          fetchStyles(parsedProject.id);
        }
        
        setLoading(false);
      } catch (e) {
        console.error("Erreur lors de l'analyse des données en cache:", e);
      }
    }
    
    // Always fetch fresh data
    fetchProjectData();
  }, []); // Empty dependency array to run only once

  // Mise à jour pour sélectionner un style
  const handleSelectStyle = useCallback((style) => {
    setSelectedStyle(style);
    
    // Stocker le style et son prompt dans localStorage
    localStorage.setItem('selectedStyleId', style.id);
    localStorage.setItem('stylePrompt', style.prompt);
    localStorage.setItem('styleFix', style.preview_image); // Pour l'affichage de l'aperçu
    
    console.log("Style sélectionné:", {
      styleId: style.id,
      styleName: style.name,
      stylePrompt: style.prompt
    });
  }, []);

  const handleContinue = useCallback(() => {
    if (selectedStyle) {
      router.push(`/photobooth-premium/${slug}/cam`);
    } else {
      setError("Veuillez sélectionner un style");
    }
  }, [selectedStyle, router, slug]);

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

  // Styles dynamiques basés sur les couleurs du projet
  const primaryColor = project.primary_color || '#811A53';
  const secondaryColor = project.secondary_color || '#E5E40A';

  return (
    <main 
      className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-20 px-5"
      style={{ backgroundColor: primaryColor }}
    >
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
            className="text-xl font-bold text-center" 
            style={{ color: secondaryColor }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {project.name}
          </motion.h1>
        )}
      </div>

      {error && (
        <motion.div 
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-20 mb-4 w-4/5 mx-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <span className="block sm:inline">{error}</span>
        </motion.div>
      )}

      <div className="w-full mt-[20vh]">
        {/* Sélection du style */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <h2 
            className="text-xl font-bold text-center mb-6"
            style={{ color: secondaryColor }}
          >
            Choisissez votre style artistique
          </h2>
          
          {stylesLoading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : styles.length === 0 ? (
            <p className="text-center text-white">Aucun style disponible</p>
          ) : (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 max-w-4xl mx-auto">
              {styles.map((style, index) => (
                <motion.div 
                  key={style.id} 
                  onClick={() => handleSelectStyle(style)}
                  className={`cursor-pointer rounded-lg overflow-hidden transition-all backdrop-blur-sm bg-white/10 shadow-lg hover:shadow-xl ${
                    selectedStyle?.id === style.id ? 'ring-2 ring-white scale-105' : 'hover:scale-[1.03]'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.5 + (index * 0.1) }}
                >
                  <div className="aspect-square relative overflow-hidden">
                    <Image
                      src={style.preview_image}
                      alt={style.name}
                      fill
                      className="object-cover transition-transform duration-700 hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-70 group-hover:opacity-100 transition-opacity"></div>
                    
                    {/* Badge de sélection */}
                    {selectedStyle?.id === style.id && (
                      <div className="absolute top-4 right-4 bg-white/90 text-purple-900 text-sm font-bold px-3 py-1.5 rounded-full">
                        Sélectionné
                      </div>
                    )}
                  </div>
                  <div 
                    className="p-4"
                  >
                    <h4 className="font-bold text-white text-lg">{style.name}</h4>
                    <p className="mt-1 text-white/80 text-sm line-clamp-2">{style.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Bouton Continuer */}
      <motion.div 
        className="fixed bottom-10 w-full"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        <div className="w-[70%] max-w-md mx-auto">
          <motion.button 
            onClick={handleContinue}
            disabled={!selectedStyle}
            className={`w-full py-4 font-bold text-xl rounded-lg transition-all ${!selectedStyle ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ 
              backgroundColor: secondaryColor, 
              color: primaryColor 
            }}
            whileHover={selectedStyle ? { scale: 1.05 } : {}}
            whileTap={selectedStyle ? { scale: 0.95 } : {}}
          >
            CONTINUER
          </motion.button>
        </div>
      </motion.div>
    </main>
  );
}
