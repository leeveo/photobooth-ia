'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PhotoboothAvatar({ params }) {
  const { slug } = params;
  const supabase = createClientComponentClient();
  const router = useRouter();
  
  const [project, setProject] = useState(null);
  const [styles, setStyles] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gender, setGender] = useState("male"); // Default gender selection
  
  useEffect(() => {
    async function fetchProjectAndStyles() {
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
        
        // Fetch styles for this project
        const { data: stylesData, error: stylesError } = await supabase
          .from('styles')
          .select('*')
          .eq('project_id', projectData.id)
          .eq('is_active', true);
          
        if (stylesError) {
          throw stylesError;
        }
        
        // Save project and styles to state and localStorage
        setProject(projectData);
        localStorage.setItem('projectData', JSON.stringify(projectData));
        localStorage.setItem('currentProjectId', projectData.id);
        localStorage.setItem('currentProjectSlug', slug);
        
        // Set available styles
        const availableStyles = stylesData || [];
        setStyles(availableStyles);
      } catch (error) {
        console.error('Error loading project data:', error);
        setError('Impossible de charger le projet');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProjectAndStyles();
  }, [slug, supabase]);
  
  const handleStyleSelect = (style) => {
    setSelectedStyle(style);
    localStorage.setItem('selectedStyleId', style.id);
    localStorage.setItem('selectedStyleData', JSON.stringify(style)); 
    
    // Store the selected style gender for avatar generation
    const styleGender = style.gender || "male";
    localStorage.setItem('styleGender', styleGender);
    
    // Store prompt for avatar generation
    localStorage.setItem('stylePrompt', style.prompt || "portrait photo");
  };

  const handleGenderChange = (selectedGender) => {
    setGender(selectedGender);
    localStorage.setItem('styleGender', selectedGender);
  };
  
  const handleStartClick = () => {
    if (!selectedStyle) {
      setError('Veuillez sélectionner un style avant de continuer');
      return;
    }
    
    // Navigate to camera page
    router.push(`/photobooth-avatar/${slug}/cam`);
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-500">
        {error}
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
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Logo or title */}
        <div className="flex justify-center mb-8">
          {project.logo_url ? (
            <Image 
              src={project.logo_url} 
              width={300} 
              height={100} 
              alt={project.name} 
              className="max-w-xs w-full"
            />
          ) : (
            <h1 className="text-3xl font-bold text-white">{project.name}</h1>
          )}
        </div>
        
        {/* Welcome message */}
        <div className="text-center mb-12">
          <h2 
            className="text-2xl sm:text-4xl font-bold"
            style={{ color: secondaryColor }}
          >
            {project.home_message || "C'est vous le mannequin !"}
          </h2>
          <p className="mt-4 text-white text-opacity-90">
            Sélectionnez un style et transformez-vous avec notre IA
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Découvrez l&apos;expérience unique de création d&apos;avatars personnalisés.
          </p>
        </div>
        
        {/* Gender selection */}
        <div className="mb-10">
          <h3 
            className="text-xl font-semibold text-center mb-4"
            style={{ color: secondaryColor }}
          >
            Choisissez votre genre
          </h3>
          <div className="flex justify-center gap-4">
            <button
              className={`px-6 py-2 rounded-full ${gender === 'male' 
                ? `bg-white text-black font-bold` 
                : 'bg-white bg-opacity-30 text-white'}`}
              onClick={() => handleGenderChange('male')}
            >
              Homme
            </button>
            <button
              className={`px-6 py-2 rounded-full ${gender === 'female' 
                ? `bg-white text-black font-bold` 
                : 'bg-white bg-opacity-30 text-white'}`}
              onClick={() => handleGenderChange('female')}
            >
              Femme
            </button>
          </div>
        </div>
        
        {/* Styles grid */}
        <div className="mb-12">
          <h3 
            className="text-xl font-semibold text-center mb-4"
            style={{ color: secondaryColor }}
          >
            Choisissez votre style
          </h3>
          
          {styles.length === 0 ? (
            <p className="text-center text-white">Aucun style disponible</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {styles.map(style => (
                <div 
                  key={style.id}
                  className={`cursor-pointer rounded-lg overflow-hidden transition-all transform hover:scale-105 ${
                    selectedStyle?.id === style.id 
                      ? 'ring-4 ring-offset-2 ring-offset-transparent' 
                      : ''
                  }`}
                  style={{ 
                    borderColor: selectedStyle?.id === style.id ? secondaryColor : 'transparent',
                    boxShadow: selectedStyle?.id === style.id ? `0 0 0 4px ${secondaryColor}` : 'none'
                  }}
                  onClick={() => handleStyleSelect(style)}
                >
                  <div className="aspect-h-4 aspect-w-3 bg-gray-200 relative">
                    {style.preview_image ? (
                      <Image 
                        src={style.preview_image}
                        alt={style.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 33vw, 20vw"
                        priority={false}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-300">
                        <span className="text-gray-500">Pas d&apos;image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}>
                    <h4 className="font-medium text-sm">
                      {style.name}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Start button */}
        <div className="flex justify-center">
          <button
            onClick={handleStartClick}
            className="px-8 py-3 text-lg font-bold rounded-lg"
            style={{ backgroundColor: secondaryColor, color: primaryColor }}
            disabled={!selectedStyle}
          >
            COMMENCER
          </button>
        </div>
      </div>
    </main>
  );
}
