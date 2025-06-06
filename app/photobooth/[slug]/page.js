'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function Photobooth({ params }) {
  const { slug } = params;
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchProject() {
      try {
        console.log('Fetching project data for slug:', slug);
        
        // Fetch project data by slug
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();
          
        if (projectError || !projectData) {
          console.error('Project not found or inactive:', projectError);
          setError('Projet non trouvé ou inactif');
          return;
        }
        
        console.log('Project data fetched successfully:', projectData.id);
        
        // Ensure we have a valid project ID before proceeding
        if (!projectData.id) {
          console.error('Project ID is missing');
          setError('ID du projet manquant');
          return;
        }
        
        // Save project to state and localStorage
        setProject(projectData);
        localStorage.setItem('projectData', JSON.stringify(projectData));
        localStorage.setItem('currentProjectId', projectData.id);
        localStorage.setItem('currentProjectSlug', slug);
        
      } catch (error) {
        console.error('Error loading project data:', error);
        setError('Impossible de charger les données du projet');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProject();
  }, [slug, supabase]);
  
  const handleStartClick = () => {
    // Rediriger vers le bon type de photobooth
    if (project.photobooth_type === 'standard' || !project.photobooth_type) {
      router.push(`/photobooth/${slug}/style`);
    } else if (project.photobooth_type === 'premium') {
      router.push(`/photobooth-premium/${slug}/how`);
    } else if (project.photobooth_type === 'photobooth2') {
      router.push(`/photobooth2/${slug}/how`);
    } else {
      // Fallback pour tout autre type
      router.push(`/photobooth/${slug}/style`);
    }
  };

  // Afficher un message d'erreur si nécessaire
  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col text-center px-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-md mb-4">
          <h2 className="text-lg font-bold mb-2">Erreur</h2>
          <p>{error}</p>
        </div>
        <button 
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }
  
  if (loading || !project) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner 
          text="Préparation de votre expérience..." 
          size="large" 
          color="purple" 
        />
      </div>
    );
  }

  // Récupérer les couleurs du projet
  const primaryColor = project.primary_color || '#811A53';
  const secondaryColor = project.secondary_color || '#E5E40A';
  const homeMessage = project.home_message || "C'est vous le mannequin !";
  
  return (
    <main 
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="max-w-6xl mx-auto text-center">
        {/* Logo ou titre */}
        {project.logo_url && (
          <motion.div 
            className="mb-8 flex justify-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-[280px] h-[180px] relative">
              <Image 
                src={project.logo_url} 
                alt={project.name} 
                fill
                style={{ objectFit: "contain" }}
                priority 
                className="drop-shadow-2xl"
              />
            </div>
          </motion.div>
        )}
        
        {/* Message d'accueil animé */}
        <motion.h1 
          className="text-4xl md:text-5xl font-bold text-center mb-8 text-white drop-shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          {homeMessage}
        </motion.h1>
        
        {/* Sous-titre explicatif */}
        <motion.p
          className="text-xl text-white/90 mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          Découvrez une expérience photo unique où l'intelligence artificielle transforme votre portrait.
        </motion.p>
        
        {/* Bouton de démarrage moderne */}
        <motion.div 
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <div 
            className="relative group cursor-pointer"
            onClick={handleStartClick}
          >
            <div 
              className="absolute -inset-1 bg-gradient-to-r from-white/30 to-white/60 blur-md opacity-75 group-hover:opacity-100 transition duration-500"
              style={{ 
                borderRadius: '0.75rem', 
              }}
            ></div>
            <button 
              className="relative px-16 py-5 text-xl font-bold rounded-xl transition-all duration-300 transform group-hover:scale-105 shadow-xl"
              style={{ 
                backgroundColor: secondaryColor, 
                color: primaryColor 
              }}
            >
              COMMENCER L&apos;EXPÉRIENCE
            </button>
          </div>
        </motion.div>
        
        {/* Animation de chargement */}
        <motion.div 
          className="mt-12 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <div className="flex space-x-3 items-center">
            <div className="flex space-x-1">
              <div className="w-3 h-3 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-3 h-3 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className="text-white/80">Préparation de votre expérience photo...</p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}