"use client";

import { useEffect, useState, useCallback } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';

export default function HowToUse({ params }) {
  const slug = params.slug;
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);

  // Define fetchProjectData with useCallback BEFORE any useEffect that depends on it
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
  }, [slug, supabase]); // Keep only the real dependencies
  
  // Define goToStyles before using it
  const goToStyles = useCallback(() => {
    router.push(`/photobooth2/${slug}/style`);
  }, [router, slug]);

  // Handle go to camera
  const handleGoToCam = useCallback(() => {
    router.push(`/photobooth2/${slug}/cam`);
  }, [router, slug]);

  // useEffect hooks after all useCallbacks are defined
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
    
    // Always fetch fresh data
    fetchProjectData();
  }, [fetchProjectData]); // Now fetchProjectData is defined before being used here

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

  return (
    <main 
      className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-5 px-5"
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

      <div className="relative w-full mt-[20vh]">
        <div className="text-center mb-10">
          <h2 
            className="text-2xl font-bold mb-4"
            style={{ color: secondaryColor }}
          >
            Comment ça marche ?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div 
              className="rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: secondaryColor }}
            >
              <span className="text-3xl" style={{ color: primaryColor }}>1</span>
            </div>
            <h3 className="font-bold mb-2" style={{ color: secondaryColor }}>Choisissez votre style</h3>
            <p className="text-white">Sélectionnez un style de vêtements qui vous plaît</p>
          </div>
          
          <div className="text-center">
            <div 
              className="rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: secondaryColor }}
            >
              <span className="text-3xl" style={{ color: primaryColor }}>2</span>
            </div>
            <h3 className="font-bold mb-2" style={{ color: secondaryColor }}>Prenez une photo</h3>
            <p className="text-white">Positionnez-vous et prenez une photo avec la caméra</p>
          </div>
          
          <div className="text-center">
            <div 
              className="rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: secondaryColor }}
            >
              <span className="text-3xl" style={{ color: primaryColor }}>3</span>
            </div>
            <h3 className="font-bold mb-2" style={{ color: secondaryColor }}>Récupérez votre création</h3>
            <p className="text-white">Admirez votre photo générée par IA et partagez-la</p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-10 w-full">
        <div className="w-[70%] mx-auto">
          <button 
            onClick={goToStyles} 
            className="w-full py-4 font-bold text-xl rounded-lg"
            style={{ backgroundColor: secondaryColor, color: primaryColor }}
          >
            CONTINUER
          </button>
        </div>
      </div>

      <p className="text-gray-600 text-center mt-6">
        L&apos;appareil photo s&apos;ouvrira à l&apos;étape suivante. Vous pourrez alors prendre une photo.
      </p>
    </main>
  );
}
