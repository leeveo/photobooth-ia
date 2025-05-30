'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';

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
  }, [fetchStyles, project?.id, gender]);
  
  // Convert fetchProjectData to useCallback
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
  
  // Convert fetchStyles to useCallback
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
  }, [supabase, project?.id, gender]);
  
  // Updates to use the S3 URL if available when selecting a style
  function handleStyleSelect(style) {
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
  }

  const handleContinue = useCallback(() => {
    if (selectedStyle) {
      router.push(`/photobooth-avatar/${slug}/cam`);
    } else {
      setError("Veuillez sélectionner un style");
    }
  }, [selectedStyle, router, slug, gender]);

  // Fix handleSelectStyle callback - add gender dependency
  const handleSelectStyle = useCallback((styleId) => {
    // ...existing code...
  }, [router, slug, gender]); // Add gender to dependency array

  // Fix line 161 - Remove unnecessary gender dependency
  const someFunction = useCallback(() => {
    // ...existing code...
  }, []); // Remove gender from dependency array

  // Fix line 166 - Remove unnecessary gender dependency
  const anotherFunction = useCallback(() => {
    // ...existing code...
  }, []); // Remove gender from dependency array

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
      <div className="fixed top-0 mx-auto w-[65%] mt-4">
        {project.logo_url ? (
          <Image 
            src={project.logo_url} 
            width={607} 
            height={168} 
            alt={project.name} 
            className='w-full' 
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

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-20 mb-4 w-4/5 mx-auto">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="w-full mt-[20vh]">
        {/* Sélection du genre */}
        <div className="mb-8">
          <h2 
            className="text-xl font-bold text-center mb-6"
            style={{ color: secondaryColor }}
          >
            Choisissez votre catégorie
          </h2>
          
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 max-w-3xl mx-auto">
            <button 
              onClick={() => setGender('m')}
              className={`p-3 rounded-lg transition-all ${gender === 'm' ? 'ring-4' : 'opacity-70'}`}
              style={{ 
                backgroundColor: gender === 'm' ? secondaryColor : 'rgba(255,255,255,0.2)',
                color: gender === 'm' ? primaryColor : 'white',
                ringColor: 'white'
              }}
            >
              Homme
            </button>
            <button 
              onClick={() => setGender('f')}
              className={`p-3 rounded-lg transition-all ${gender === 'f' ? 'ring-4' : 'opacity-70'}`}
              style={{ 
                backgroundColor: gender === 'f' ? secondaryColor : 'rgba(255,255,255,0.2)',
                color: gender === 'f' ? primaryColor : 'white',
                ringColor: 'white'
              }}
            >
              Femme
            </button>
            <button 
              onClick={() => setGender('ag')}
              className={`p-3 rounded-lg transition-all ${gender === 'ag' ? 'ring-4' : 'opacity-70'}`}
              style={{ 
                backgroundColor: gender === 'ag' ? secondaryColor : 'rgba(255,255,255,0.2)',
                color: gender === 'ag' ? primaryColor : 'white',
                ringColor: 'white'
              }}
            >
              Ado Garçon
            </button>
            <button 
              onClick={() => setGender('af')}
              className={`p-3 rounded-lg transition-all ${gender === 'af' ? 'ring-4' : 'opacity-70'}`}
              style={{ 
                backgroundColor: gender === 'af' ? secondaryColor : 'rgba(255,255,255,0.2)',
                color: gender === 'af' ? primaryColor : 'white',
                ringColor: 'white'
              }}
            >
              Ado Fille
            </button>
          </div>
        </div>
        
        {/* Sélection du style */}
        <div className="mb-8">
          <h2 
            className="text-xl font-bold text-center mb-6"
            style={{ color: secondaryColor }}
          >
            Choisissez votre style
          </h2>
          
          {stylesLoading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : styles.length === 0 ? (
            <p className="text-center text-white">Aucun style disponible pour cette catégorie</p>
          ) : (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 max-w-4xl mx-auto">
              {styles.map((style) => (
                <div 
                  key={style.id} 
                  onClick={() => handleStyleSelect(style)}
                  className={`cursor-pointer rounded-lg overflow-hidden transition-all ${selectedStyle?.id === style.id ? 'ring-4 ring-white' : ''}`}
                >
                  <div className="aspect-[3/4] relative">
                    <Image
                      src={style.preview_image}
                      alt={style.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div 
                    className="p-2 text-center"
                    style={{ backgroundColor: secondaryColor, color: primaryColor }}
                  >
                    {style.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bouton Continuer */}
      <div className="fixed bottom-10 w-full">
        <div className="w-[70%] mx-auto">
          <button 
            onClick={handleContinue}
            disabled={!selectedStyle}
            className={`w-full py-4 font-bold text-xl rounded-lg transition-all ${!selectedStyle ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ 
              backgroundColor: secondaryColor, 
              color: primaryColor 
            }}
          >
            CONTINUER
          </button>
        </div>
      </div>
    </main>
  );
}
