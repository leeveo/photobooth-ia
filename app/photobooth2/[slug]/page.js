'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';

export default function PhotoboothRedirect({ params }) {
  const slug = params.slug;
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [error, setError] = useState(null);
  let project = null; // Déclaration de la variable project

  useEffect(() => {
    async function redirectBasedOnType() {
      try {
        // Récupérer le type de photobooth pour ce projet
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('photobooth_type')
          .eq('slug', slug)
          .single();
        
        if (projectError || !projectData) {
          return notFound();
        }
        
        project = projectData; // Affectation des données du projet à la variable locale
        
        // Rediriger vers le bon type de photobooth
        if (project.photobooth_type === 'prompt') {
          router.replace(`/photobooth2/${slug}`);
        } else {
          // Continuer avec le photobooth FaceSwapping (anciennement standard)
          router.push(`/photobooth/${slug}/how`);
        }
      } catch (error) {
        console.error('Erreur lors de la redirection:', error);
        return notFound();
      }
    }
    
    redirectBasedOnType();
  }, [slug, router, supabase]);
  
  useEffect(() => {
    async function fetchProjectAndStyles() {
      try {
        // Récupérer les données du projet et les styles associés
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, slug, photobooth_type, styles:styles(id, name, gender, price, image_url)')
          .eq('slug', slug)
          .single();
        
        if (projectError || !projectData) {
          return notFound();
        }
        
        project = projectData; // Affectation des données du projet à la variable locale
        
        // Set available styles - No more gender filtering
        const availableStyles = projectData.styles || [];
        setStyles(availableStyles);
        
        // Si un style est déjà sélectionné, le définir comme tel
        const savedStyleId = localStorage.getItem('selectedStyleId');
        if (savedStyleId) {
          const savedStyle = availableStyles.find(style => style.id === savedStyleId);
          if (savedStyle) {
            setSelectedStyle(savedStyle);
          }
        }
        
        // Rediriger vers le bon type de photobooth
        if (project.photobooth_type === 'prompt') {
          router.replace(`/photobooth2/${slug}`);
        } else {
          // Continuer avec le photobooth FaceSwapping (anciennement standard)
          router.push(`/photobooth/${slug}/how`);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du projet et des styles:', error);
        return notFound();
      }
    }
    
    fetchProjectAndStyles();
  }, [slug, supabase]);
  
  const handleStyleSelect = (style) => {
    setSelectedStyle(style);
    localStorage.setItem('selectedStyleId', style.id);
    localStorage.setItem('selectedStyleData', JSON.stringify(style)); 
    
    // Store a default gender for style processing compatibility
    localStorage.setItem('styleGender', 'neutral');
  };

  // Ajouter ces useEffect pour le débogage
  useEffect(() => {
    // Identifier le type de photobooth
    console.log('Photobooth2 component loaded');
    console.log('Slug:', slug);
    console.log('Project type will be logged when loaded');
  }, [slug]);

  useEffect(() => {
    if (project) {
      console.log('Project loaded:', project.name);
      console.log('Photobooth type:', project.photobooth_type);
    }
  }, [project]);
  
  return (
    <main 
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Logo or title */}
        {/* ...existing code... */}
        
        {/* Welcome message */}
        {/* ...existing code... */}
        
        {/* REMOVE Gender selection section completely */}
        
        {/* Styles selection */}
        <div className="mb-12">
          <h3 className="text-xl font-semibold text-center mb-4" style={{ color: secondaryColor }}>
            Sélectionnez un style
          </h3>
          {/* ...existing code... */}
        </div>
        
        {/* Start button */}
        {/* ...existing code... */}
      </div>
    </main>
  );
}