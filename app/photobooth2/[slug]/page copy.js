"use client";

import { useEffect, useRef, useState } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';

export default function PhotoboothProject({ params }) {
  const slug = params.slug;
  const router = useRouter();
  const supabase = createClientComponentClient();
  const fullscreenButtonRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);

  useEffect(() => {
    async function fetchProjectData() {
      setLoading(true);
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

        // Fetch project settings
        const { data: settingsData } = await supabase
          .from('project_settings')
          .select('*')
          .eq('project_id', projectData.id)
          .single();
          
        setSettings(settingsData || {
          enable_fullscreen: true,
          default_gender: 'm'
        });
        
        // Fetch project background - prendre le premier disponible
        const { data: backgroundsData } = await supabase
          .from('backgrounds')
          .select('*')
          .eq('project_id', projectData.id)
          .eq('is_active', true)
          .limit(1);
        
        if (backgroundsData && backgroundsData.length > 0) {
          setBackgroundImage(backgroundsData[0].image_url);
        }
        
        // Store project data in localStorage for other pages
        localStorage.setItem('currentProjectId', projectData.id);
        localStorage.setItem('currentProjectSlug', slug);
        localStorage.setItem('projectData', JSON.stringify(projectData));
        localStorage.setItem('projectSettings', JSON.stringify(settingsData || {}));

      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjectData();
  }, [slug, supabase]);

  const requestFullscreen = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.mozRequestFullScreen) { // Firefox
        await element.mozRequestFullScreen();
      } else if (element.webkitRequestFullscreen) { // Chrome, Safari and Opera
        await element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) { // IE/Edge
        await element.msRequestFullscreen();
      }
      console.log("Fullscreen mode requested");
    } catch (error) {
      console.error("Fullscreen request failed:", error);
    }
  };

  // Request fullscreen automatically if enabled in settings
  useEffect(() => {
    if (settings?.enable_fullscreen && fullscreenButtonRef.current) {
      fullscreenButtonRef.current.click();
    }
  }, [settings]);

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

  const goToInstructions = () => {
    router.push(`/photobooth/${slug}/how`);
  };

  // Dynamic styles based on project colors
  const primaryColor = project.primary_color || '#811A53';
  const secondaryColor = project.secondary_color || '#E5E40A';
  const homeMessage = project.home_message || "C'est vous le mannequin !";

  return (
    <main 
      className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-5 px-5 lg:pt-0 lg:px-20 mt-0"
      style={{ 
        backgroundColor: primaryColor,
        color: secondaryColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none', // Utiliser l'arrière-plan s'il existe
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <button 
        ref={fullscreenButtonRef} 
        onClick={requestFullscreen} 
        style={{ display: 'none' }}
      >
        Go Fullscreen
      </button>

      <div 
        className="fixed z-10 w-full h-full top-0 left-0 cursor-pointer"
        onClick={goToInstructions}
      ></div>

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
          <h1 className="text-4xl font-bold text-center" style={{ color: secondaryColor }}>
            {project.name}
          </h1>
        )}
      </div>

      <div className="relative w-full flex justify-center items-center mt-[4vh] mb-[5vh]">
        <div className='animate-upDown relative w-[100%] mx-auto flex justify-center items-center pointer-events-none'>
          <Image 
            src='/photobooth-ia/preview.png' 
            width={744} 
            height={654} 
            alt={project.name} 
            className='w-full' 
            priority 
          />
        </div>
      </div>

      <div className="relative w-full flex justify-center items-center">
        <div 
          id="btn-taptostart" 
          className="relative mx-auto flex w-[75%] justify-center items-center cursor-pointer"
          onClick={goToInstructions}
          style={{ 
            backgroundColor: secondaryColor,
            borderRadius: '8px',
            padding: '15px 0',
          }}
        >
          <span 
            className="text-2xl font-bold"
            style={{ color: primaryColor }}
          >
            COMMENCER
          </span>
        </div>
      </div>

      <div className="mt-10 text-center">
        <p className="text-xl">{homeMessage}</p>
      </div>
    </main>
  );
}
