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
  const [gender, setGender] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [error, setError] = useState(null);

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
          // Définir le genre par défaut depuis les paramètres
          setGender(parsedSettings.default_gender || 'm');
        }
        
        setLoading(false);
      } catch (e) {
        console.error("Erreur lors de l'analyse des données en cache:", e);
      }
    }
    
    // Toujours récupérer les données fraîches
    fetchProjectData();
  }, [fetchProjectData]);
  
  useEffect(() => {
    // Charger les styles quand l'ID du projet est disponible et qu'un genre est sélectionné
    if (project?.id && gender) {
      fetchStyles();
    }
  }, [project?.id, gender, fetchStyles]);
  
  // Use useCallback to memoize fetch functions to avoid recreation
  const fetchProjectData = useCallback(async () => {
    try {
      // Récupérer les données du projet par slug
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (projectError || !projectData) {
        console.error('Projet non trouvé ou inactif:', projectError);
        return notFound();
      }
      
      setProject(projectData);
      
      // Récupérer les paramètres du projet
      const { data: settingsData } = await supabase
        .from('project_settings')
        .select('*')
        .eq('project_id', projectData.id)
        .single();
      
      const projectSettings = settingsData || { default_gender: 'm' };
      setSettings(projectSettings);
      
      // Définir le genre par défaut s'il n'est pas déjà sélectionné
      if (!gender) {
        setGender(projectSettings.default_gender || 'm');
      }
      
      // Stocker les infos du projet dans localStorage
      localStorage.setItem('currentProjectId', projectData.id);
      localStorage.setItem('currentProjectSlug', slug);
      localStorage.setItem('projectData', JSON.stringify(projectData));
      localStorage.setItem('projectSettings', JSON.stringify(projectSettings));
      
    } catch (error) {
      console.error('Erreur lors du chargement du projet:', error);
      setError("Impossible de charger les données du projet");
    } finally {
      setLoading(false);
    }
  }, [slug, supabase]);
  
  const fetchStyles = useCallback(async () => {
    setStylesLoading(true);
    try {
      console.log(`Chargement des styles pour projet=${project.id}, genre=${gender}`);
      
      // Récupérer les styles pour ce projet et ce genre
      const { data, error } = await supabase
        .from('styles')
        .select('*')
        .eq('project_id', project.id)
        .eq('gender', gender)
        .eq('is_active', true)
        .order('style_key');
        
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
  }, [supabase]);

  // Fix useEffect missing fetchProjectData dependency
  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]); // Add fetchProjectData to dependency array

  // Fix useEffect missing fetchStyles dependency
  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]); // Add fetchStyles to dependency array

  // Updates to use the S3 URL if available when selecting a style
  const handleStyleSelect = useCallback((style) => {
    setSelectedStyle(style);
    
    // Prefer S3 URL if available, otherwise use the main preview_image
    const imageUrl = style.s3_url || style.preview_image;
    
    // Stocker dans localStorage pour la page caméra
    localStorage.setItem('styleGeneral', style.style_key);
    localStorage.setItem('styleGenderFix', gender);
    localStorage.setItem('styleFix', imageUrl);
    localStorage.setItem('selectedStyleId', style.id);
    
    console.log("Style sélectionné:", {
      styleKey: style.style_key,
      gender: gender,
      previewImage: imageUrl,
      styleId: style.id
    });
  }, [gender]); // Add gender to dependency array

  const handleContinue = useCallback(() => {
    if (selectedStyle) {
      router.push(`/photobooth/${slug}/cam`);
    } else {
      setError("Veuillez sélectionner un style");
    }
  }, [router, slug, selectedStyle, gender, project?.id]); // Add gender and project.id

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
    <div className="relative z-10 w-full h-full">
      <main 
        className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-20 px-5"
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

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-20 mb-4 w-4/5 mx-auto"
          >
            <span className="block sm:inline">{error}</span>
          </motion.div>
        )}

        <div className="w-full mt-[20vh]">
          {/* Sélection du genre */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <motion.h2 
              className="text-xl font-bold text-center mb-6"
              style={{ color: secondaryColor }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              Choisissez votre catégorie
            </motion.h2>
            
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 max-w-3xl mx-auto">
              {['m', 'f', 'ag', 'af'].map((g, idx) => (
                <motion.button 
                  key={g}
                  onClick={() => setGender(g)}
                  className={`p-3 rounded-lg transition-all ${gender === g ? 'ring-4' : 'opacity-70'}`}
                  style={{ 
                    backgroundColor: gender === g ? secondaryColor : 'rgba(255,255,255,0.2)',
                    color: gender === g ? primaryColor : 'white',
                    ringColor: 'white'
                  }}
                  initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + idx * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {g === 'm' ? 'Homme' : g === 'f' ? 'Femme' : g === 'ag' ? 'Ado Garçon' : 'Ado Fille'}
                </motion.button>
              ))}
            </div>
          </motion.div>
          
          {/* Sélection du style */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
          >
            <motion.h2 
              className="text-xl font-bold text-center mb-6"
              style={{ color: secondaryColor }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              Choisissez votre style
            </motion.h2>
            
            {stylesLoading ? (
              <div className="flex justify-center">
                <motion.div 
                  className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                ></motion.div>
              </div>
            ) : styles.length === 0 ? (
              <motion.p 
                className="text-center text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                Aucun style disponible pour cette catégorie
              </motion.p>
            ) : (
              <div className="flex justify-center w-full">
                <div className="flex flex-wrap justify-center gap-4 max-w-6xl">
                  {styles.map((style, idx) => (
                    <motion.div 
                      key={style.id} 
                      onClick={() => handleStyleSelect(style)}
                      className={`cursor-pointer rounded-lg overflow-hidden transition-all shadow-md hover:shadow-lg w-[100px] h-[160px] ${
                        selectedStyle?.id === style.id 
                          ? 'ring-[3px] ring-white ring-offset-2 ring-opacity-100' 
                          : ''
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        scale: selectedStyle?.id === style.id ? 1.1 : 1,
                        boxShadow: selectedStyle?.id === style.id 
                          ? '0 0 0 3px white, 0 10px 25px -5px rgba(0, 0, 0, 0.3)' 
                          : 'none'
                      }}
                      transition={{ 
                        duration: 0.5,
                        delay: 1 + (idx % 8) * 0.05,
                        opacity: { duration: 0.5 },
                        y: { duration: 0.5 },
                        scale: { 
                          duration: 0.4,  // Augmenté légèrement pour plus de fluidité
                          ease: [0.19, 1.0, 0.22, 1.0]  // Easing personnalisé de type "expo out" pour une décélération plus naturelle
                        },
                        boxShadow: { duration: 0.5 }  // Ajouter une transition spécifique pour l'ombre
                      }}
                      whileHover={{ 
                        scale: selectedStyle?.id === style.id ? 1.1 : 1.05, 
                        y: -5,
                        transition: {
                          scale: { duration: 0.2, ease: "easeOut" },
                          y: { duration: 0.2, ease: "easeOut" }
                        }
                      }}
                      whileTap={{ 
                        scale: 0.95,
                        transition: { duration: 0.1 }
                      }}
                    >
                      <div className="h-[130px] w-full relative">
                        <Image
                          src={style.preview_image}
                          alt={style.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div 
                        className="p-1 text-center text-xs h-[30px] flex items-center justify-center w-full"
                        style={{ backgroundColor: secondaryColor, color: primaryColor }}
                      >
                        <span className="truncate w-full">{style.name}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Bouton Continuer */}
        <motion.div 
          className="fixed bottom-10 w-full"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <div className="w-[40%] mx-auto">
            <motion.button 
              onClick={handleContinue}
              disabled={!selectedStyle}
              className={`w-full py-4 font-bold text-xl rounded-lg transition-all ${!selectedStyle ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ 
                backgroundColor: secondaryColor, 
                color: primaryColor 
              }}
              whileHover={!selectedStyle ? {} : { scale: 1.03 }}
              whileTap={!selectedStyle ? {} : { scale: 0.97 }}
            >
              CONTINUER
            </motion.button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
