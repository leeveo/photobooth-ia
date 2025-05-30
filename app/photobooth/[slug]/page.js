'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function PhotoboothRedirect({ params }) {
  const slug = params.slug;
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function redirectBasedOnType() {
      try {
        // Récupérer le type de photobooth pour ce projet ainsi que l'image de fond et la couleur primaire
        const { data: project, error } = await supabase
          .from('projects')
          .select('photobooth_type, background_image, primary_color, logo_url, home_message, secondary_color, name')
          .eq('slug', slug)
          .single();
        
        if (error || !project) {
          console.error("Projet non trouvé:", error);
          setError("Projet non trouvé. Vérifiez l'URL ou contactez l'administrateur.");
          return;
        }
        
        setProject(project);
        
        // Stocker les informations de background dans localStorage
        localStorage.setItem(`photobooth_bg_${slug}`, JSON.stringify({
          background_image: project.background_image,
          primary_color: project.primary_color
        }));
        
        // Après un délai pour montrer l'animation d'entrée, rediriger
        setTimeout(() => {
          // Rediriger vers le bon type de photobooth
          if (project.photobooth_type === 'standart') {
            router.replace(`/photobooth/${slug}`);
          } else {
            // Continuer avec le photobooth standard
            router.push(`/photobooth/${slug}/how`);
          }
        }, 5000); // Délai augmenté à 5 secondes pour l'animation
        
      } catch (error) {
        console.error('Erreur lors de la redirection:', error);
        setError("Une erreur est survenue lors du chargement. Veuillez réessayer ultérieurement.");
      } finally {
        setLoading(false);
      }
    }
    
    redirectBasedOnType();
  }, [slug, router, supabase]);
  
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
  
  // Style du background
  const backgroundStyle = {
    backgroundImage: project.background_image ? `url(${project.background_image})` : 'none',
    backgroundColor: primaryColor,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };
  
  return (
    <div 
      className="flex h-screen w-full items-center justify-center overflow-hidden"
      style={backgroundStyle}
    >
      <div className="absolute inset-0 bg-black bg-opacity-40 z-0"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 flex flex-col items-center justify-center w-full max-w-3xl p-8"
      >
        {/* Logo avec animation */}
        {project.logo_url && (
          <motion.div 
            className="mb-8"
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ 
              duration: 1,
              delay: 0.3,
              type: "spring",
              stiffness: 100 
            }}
          >
            <div className="w-[280px] h-[280px] relative">
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
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          {homeMessage}
        </motion.h1>
        
        {/* Bouton de démarrage moderne */}
        <motion.div 
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          <div 
            className="relative group cursor-pointer"
            onClick={() => router.push(`/photobooth/${slug}/how`)}
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
        
        {/* Indicateur de chargement animé au bas de l'écran */}
        <motion.div 
          className="absolute bottom-10 left-0 right-0 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <div className="flex space-x-2 items-center text-white/80 text-sm">
            <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
            <p>Chargement de votre expérience...</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}