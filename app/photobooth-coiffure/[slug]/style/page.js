'use client';

import { useState, useEffect, useCallback } from 'react';
import { notFound } from 'next/navigation';
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import './style.css'; // Import CSS for masonry grid

// Ajout des imports react-slick
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function PhotoboothStyles({ params }) {
  const { slug } = params;
  const supabase = createClientComponentClient();
  const router = useRouter();
  
  const [project, setProject] = useState(null);
  const [styles, setStyles] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stylesLoading, setStylesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Ajoute ces hooks d'état en haut du composant, avant tout usage :
  const [genderFilter, setGenderFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  // New: user-selected hair color for prompt enrichment
  const [hairColor, setHairColor] = useState('');
  // New: selected hair color category (brun, blond, roux, fantaisie)
  const [selectedTeinteCategory, setSelectedTeinteCategory] = useState('');

  // Define fetchStyles first - without dependencies on fetchProjectData
  const fetchStyles = useCallback(async (projectId) => {
    setStylesLoading(true);
    try {
      const { data, error } = await supabase
        .from('styles')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Utilise les styles tels qu'ils sont dans la base
      setStyles(data || []);
    } catch (error) {
      setError("Unable to load styles");
    } finally {
      setStylesLoading(false);
    }
  }, [supabase]);
  
  // Now define fetchProjectData separately
  const fetchProjectData = useCallback(async () => {
    try {
      // Retry logic for Supabase
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Fetch project data by slug
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, name, slug, logo_url, primary_color, secondary_color, home_message, is_active')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

          if (projectError || !projectData) {
            console.error('Project not found or inactive:', projectError);
            throw projectError;
          }
          
          setProject(projectData);
          
          // Récupère les settings depuis la base uniquement
          const { data: settingsData } = await supabase
            .from('project_settings')
            .select('default_gender')
            .eq('project_id', projectData.id)
            .single();
          
          const projectSettings = settingsData || { default_gender: 'g' };
          
          // Store project info in localStorage
          localStorage.setItem('currentProjectId', projectData.id);
          localStorage.setItem('currentProjectSlug', slug);
          localStorage.setItem('projectData', JSON.stringify(projectData));
          localStorage.setItem('projectSettings', JSON.stringify(projectSettings));
          
          // Fetch styles for this project
          fetchStyles(projectData.id);
          
          // Success - break the retry loop
          break;
        } catch (retryError) {
          retryCount++;
          console.warn(`Attempt ${retryCount} failed:`, retryError);
          
          if (retryCount >= maxRetries) {
            throw retryError;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
      setError("Unable to load project data. Please try again.");
      
      // Use cached data if available
      const cachedProject = localStorage.getItem('projectData');
      if (cachedProject) {
        try {
          const parsedProject = JSON.parse(cachedProject);
          setProject(parsedProject);
          console.log('Using cached project data as fallback');
          
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
  }, [slug, supabase, fetchStyles]);
  
  useEffect(() => {
    // Essaie d'abord de charger depuis localStorage pour un rendu plus rapide
    const cachedProject = localStorage.getItem('projectData');
    if (cachedProject) {
      try {
        const parsedProject = JSON.parse(cachedProject);
        setProject(parsedProject);
        
        // Si nous avons un ID de projet en cache, essayons de charger les styles immédiatement
        if (parsedProject.id) {
          fetchStyles(parsedProject.id);
        }
        
        setLoading(false);
      } catch (e) {
        console.error("Error parsing cached project data:", e);
      }
    }
    
    // Toujours récupérer les données fraîches
    fetchProjectData();
  }, [fetchProjectData, fetchStyles]);

  const handleStyleSelect = (style) => {
    setSelectedStyle(style);
    localStorage.setItem('selectedStyleId', style.id);
    localStorage.setItem('selectedStyleData', JSON.stringify(style)); 
    
    // Store style prompt for image generation
    localStorage.setItem('stylePrompt', style.prompt);
    
    // Store style image URL for potential reference
    localStorage.setItem('styleFix', style.preview_image);
    
    // Store style gender
    localStorage.setItem('styleGenderFix', style.gender || 'g');
    localStorage.setItem('styleGender', style.gender || 'g');
    
    // Reset hair color selection when changing style
    setHairColor('');
    setSelectedTeinteCategory('');
    
    // Show confirmation modal
    setShowConfirmModal(true);
  };
  
  const handleStartClick = () => {
    if (!selectedStyle) {
      setError('Please select a style before continuing');
      return;
    }
    
    // If a hair color is chosen, append it to the prompt before navigating
    try {
      if (hairColor) {
        const basePrompt = (localStorage.getItem('stylePrompt') || selectedStyle.prompt || '').trim();
        const needsSeparator = basePrompt && !/[,.]$/.test(basePrompt);
        const separator = needsSeparator ? ', ' : ' ';
        const finalPrompt = `${basePrompt}${separator}cheveux ${hairColor}`;
        localStorage.setItem('stylePrompt', finalPrompt);
        localStorage.setItem('selectedHairColor', hairColor);
      } else {
        // Clear previous selection if any
        localStorage.removeItem('selectedHairColor');
      }
    } catch (_) {
      // noop if localStorage fails
    }
    // Navigate to camera page
    router.push(`/photobooth-coiffure/${slug}/cam`);
  };
  
  // Function to close the modal
  const closeModal = () => {
    setShowConfirmModal(false);
  };
  
  useEffect(() => {
    // Masque les flèches slick par défaut (petits boutons transparents)
    const style = document.createElement('style');
    style.innerHTML = `
      .slick-arrow.slick-hidden { display: none !important; }
      .slick-arrow:not(button) { display: none !important; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
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

  // Hair color swatches for user selection (optional)
  // Hair color swatches for user selection (optional)
  const hairColorOptions = [
    { label: 'Noir', value: 'black', bg: '/teinte/1_black_haire_tint.jpg', teinte: 'brun' },
    { label: 'Brun très foncé', value: 'very dark brown', bg: '/teinte/2_very_dark_brown_tint_hair.jpg', teinte: 'brun' },
    { label: 'Brun foncé', value: 'dark brown', bg: '/teinte/3_dark_brown_tint_hair.jpg', teinte: 'brun' },
    { label: 'Brun', value: 'brown', bg: '/teinte/4_brown_tint_hair.jpg', teinte: 'brun' },
    { label: 'Brun clair', value: 'light brown', bg: '/teinte/5_light_brown_tint_hair.jpg', teinte: 'brun' },
    { label: 'Châtain foncé', value: 'dark chestnut', bg: '/teinte/6_dark_chesnut_tint_hair.jpg', teinte: 'brun' },
    { label: 'Châtain', value: 'chestnut', bg: '/teinte/7_chesnut_tint_hair.jpg', teinte: 'brun' },
    { label: 'Châtain clair', value: 'light chestnut', bg: '/teinte/8_light_chesnut_tint_hair.jpg', teinte: 'brun' },
    { label: 'Blond foncé', value: 'dark blond', bg: '/teinte/9_dark_blond_tint_hair.jpg', teinte: 'blond' },
    { label: 'Blond', value: 'blond', bg: '/teinte/10_blond_tint_hair.jpg', teinte: 'blond' },
    { label: 'Blond clair', value: 'light blond', bg: '/teinte/11_light_blond_tint_hair.jpg', teinte: 'blond' },
    { label: 'Blond très clair', value: 'very light blond', bg: '/teinte/12_very_light_blond_tint_hair.jpg', teinte: 'blond' },
    { label: 'Blond platine', value: 'platinum blond', bg: '/teinte/13_platinum_blond_tint_hair.jpg', teinte: 'blond' },
    { label: 'Blond cendré', value: 'ash blond', bg: '/teinte/14_ash_blond_tint_hair.jpg', teinte: 'blond' },
    { label: 'Blond doré', value: 'golden blond', bg: '/teinte/15_golden_blond_tint_hair.jpg', teinte: 'blond' },
    { label: 'Blond fraise', value: 'strawberry blond', bg: '/teinte/16_strawberry_blond_tint_hair.jpg', teinte: 'blond' },
    { label: 'Cerise', value: 'strawberry', bg: '/teinte/17_strawberry_tint_hair.jpg', teinte: 'roux' },
    { label: 'Roux', value: 'redhead hair', bg: '/teinte/18_redhead_hair_tint_hair.jpg', teinte: 'roux' },
    { label: 'Cuivré', value: 'copper hair', bg: '/teinte/19_copper_hair_tint_hair.jpg', teinte: 'roux' },
    { label: 'Gris', value: 'grey', bg: '/teinte/20_grey_hair_tint_hair.jpg', teinte: 'fantaisie' },
    { label: 'Poivre et sel', value: 'salt and pepper', bg: '/teinte/21_salt_and_pepper_tint_hair.jpg', teinte: 'fantaisie' },
    { label: 'Blanc', value: 'white', bg: '/teinte/22_white_tint_hair.jpg', teinte: 'fantaisie' },
    { label: 'Mèches blondes', value: 'blonde highlights', bg: '/teinte/23_blonde_highlights_tint_hair.jpg', teinte: 'blond' },
    { label: 'Mèches caramel', value: 'caramel highlights', bg: '/teinte/24_caramel_highlights_tint_hair.jpg', teinte: 'brun' },
    { label: 'Mèches cuivrées', value: 'copper highlights', bg: '/teinte/25_copper_highlights_tint_hair.jpg', teinte: 'roux' },
    { label: 'Mèches rousses', value: 'red highlights', bg: '/teinte/26_red_highlights_tint_hair.jpg', teinte: 'roux' },
    { label: 'Dip dye / tie and dye', value: 'dip dye / tie and dye', bg: '/teinte/27_dip_dye_tie_and_dye_tint_hair.jpg', teinte: 'fantaisie' }
  ];

  // Catégories de teintes avec images et couleurs
  const teinteCategories = [
    { 
      name: 'brun', 
      label: 'Brun', 
      image: '/teinte/2_very_dark_brown_tint_hair.jpg',
      color: '#8B4513',
      gradient: 'linear-gradient(135deg, #8B4513, #A0522D, #CD853F)',
      description: 'Tons bruns et châtains'
    },
    { 
      name: 'blond', 
      label: 'Blond', 
      image: '/teinte/12_very_light_blond_tint_hair.jpg',
      color: '#FFD700',
      gradient: 'linear-gradient(135deg, #FFD700, #FFA500, #F0E68C)',
      description: 'Tons blonds et dorés'
    },
    { 
      name: 'roux', 
      label: 'Roux', 
      image: '/teinte/18_redhead_hair_tint_hair.jpg',
      color: '#CD853F',
      gradient: 'linear-gradient(135deg, #CD853F, #D2691E, #FF6347)',
      description: 'Tons roux et cuivrés'
    },
    { 
      name: 'fantaisie', 
      label: 'Fantaisie', 
      image: '/teinte/27_dip_dye_tie_and_dye_tint_hair.jpg',
      color: '#9370DB',
      gradient: 'linear-gradient(135deg, #9370DB, #8A2BE2, #DA70D6)',
      description: 'Couleurs originales'
    }
  ];

  // Récupérer toutes les valeurs possibles pour les filtres
  const genderOptions = [...new Set(styles.map(s => s.gender).filter(Boolean))];
  // Ajout: options de type selon le genre sélectionné
  const typeOptions = [...new Set(
    styles
      .filter(s => !genderFilter || s.gender === genderFilter)
      .map(s => s.type)
      .filter(Boolean)
  )];

  // Filtrer les styles selon les filtres sélectionnés
  const filteredStyles = styles.filter(style => {
    const genderMatch = genderFilter ? style.gender === genderFilter : true;
    const typeMatch = typeFilter ? style.type === typeFilter : true;
    return genderMatch && typeMatch;
  });

  // Flèches personnalisées pour react-slick (centrées, sans doublon visuel)
  function ArrowLeft(props) {
    const { className, style, onClick } = props;
    return (
      <button
        type="button"
        className={className}
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          left: "-40px",
          zIndex: 2,
          width: 56,
          height: 56,
          background: "rgba(255,255,255,1)",
          borderRadius: "50%",
          border: "2px solid #fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          padding: 0
        }}
        onClick={onClick}
        aria-label="Précédent"
      >
        <svg width="32" height="32" viewBox="8 0 24 24" fill="none" style={{display: "block"}}>
          <path d="M15.5 19L9.5 12L15.5 5" stroke="#811A53" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    );
  }

  function ArrowRight(props) {
    const { className, style, onClick } = props;
    return (
      <button
        type="button"
        className={className}
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          right: "-40px",
          zIndex: 2,
          width: 56,
          height: 56,
          background: "rgba(255,255,255,1)",
          borderRadius: "50%",
          border: "2px solid #fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          padding: 0
        }}
        onClick={onClick}
        aria-label="Suivant"
      >
        <svg width="32" height="32" viewBox="6 0 24 24" fill="none" style={{display: "block"}}>
          <path d="M8.5 5L14.5 12L8.5 19" stroke="#811A53" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    );
  }

  // Configuration du carrousel react-slick
  const sliderSettings = {
    dots: false,
    infinite: filteredStyles.length > 1,
    speed: 500,
    slidesToShow: Math.min(filteredStyles.length, 4),
    slidesToScroll: 1, // Changé de 4 à 1 pour un meilleur contrôle
    swipeToSlide: true,
    touchThreshold: 10, // Ajouté pour une meilleure sensibilité tactile
    swipe: true,
    touchMove: true,
    draggable: true,
    accessibility: true,
    useTransform: true,
    centerMode: false,
    variableWidth: false,
    nextArrow: <ArrowRight />,
    prevArrow: <ArrowLeft />,
    appendArrows: (container) => (
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, width: "100%", zIndex: 2, pointerEvents: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", pointerEvents: "auto" }}>
          {container.props.children}
        </div>
      </div>
    ),
    responsive: [
      {
        breakpoint: 1280,
        settings: {
          slidesToShow: Math.min(filteredStyles.length, 3),
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 900,
        settings: {
          slidesToShow: Math.min(filteredStyles.length, 2),
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        }
      }
    ]
  };

  return (
    <main 
      className="min-h-screen flex flex-col relative overflow-hidden"
    >
      {/* Static gradient background instead of animated motion.div */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}10, ${primaryColor}20, ${secondaryColor}15)`,
        }}
      />

      {/* Main content with enhanced backdrop */}
      <div className="relative z-10 w-full px-2 sm:px-4 md:px-6 lg:px-8 py-8 lg:py-12 flex flex-col flex-grow">
        {/* Enhanced logo and welcome message */}
        <div className="flex flex-col items-center mb-10 relative">
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="w-[280px] relative mb-8 z-10"
          >
            {project.logo_url ? (
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ type: "spring", damping: 15 }}
              >
                {/* Remove glow effect behind logo */}
              </motion.div>
            ) : (
              <motion.h1 
                className="text-3xl font-bold text-white drop-shadow-lg text-center w-full flex justify-center"
                style={{ textShadow: `0 0 20px ${primaryColor}50` }}
                whileHover={{ scale: 1.05 }}
              >
                {project.name}
              </motion.h1>
            )}
          </motion.div>
          
          {/* Enhanced main title with dynamic effects */}
          <motion.div className="relative text-center">
            <motion.h2 
              className="text-3xl sm:text-5xl font-bold text-center relative z-10"
              style={{ 
                color: secondaryColor,
                textShadow: `0 0 30px ${secondaryColor}50`
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              whileHover={{ 
                scale: 1.02,
                textShadow: `0 0 40px ${secondaryColor}80`
              }}
            >
              {project.home_message || "Choose Your Preferred Style"}
            </motion.h2>
            
       

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
        </div>
        
        {/* Filtres au-dessus de l'affichage des styles */}
        <div className="flex flex-col items-center gap-6 mb-8">
          {/* Boutons pour chaque gender */}
          <div className="flex gap-4 flex-wrap justify-center">
            {genderOptions.map(g => (
              <button
                key={g}
                onClick={() => {
                  setGenderFilter(g);
                  setTypeFilter(''); // reset type on gender change
                }}
                className={`px-6 py-3 rounded-full font-bold border-2 transition-all duration-300 backdrop-blur-md text-lg min-w-[120px] ${
                  genderFilter === g
                    ? 'bg-gray-800/80 text-white border-gray-600 scale-105 shadow-lg'
                    : 'bg-gray-300/20 text-white border-gray-400/40 hover:bg-gray-400/30 hover:border-gray-300/60 hover:scale-102'
                }`}
                style={{
                  backdropFilter: 'blur(10px)',
                  boxShadow: genderFilter === g 
                    ? '0 8px 25px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                    : '0 4px 15px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)'
                }}
              >
                {g}
              </button>
            ))}
            {/* Bouton pour réinitialiser le filtre */}
            <button
              onClick={() => {
                setGenderFilter('');
                setTypeFilter('');
              }}
              className={`px-6 py-3 rounded-full font-bold border-2 transition-all duration-300 backdrop-blur-md text-lg min-w-[120px] ${
                genderFilter === ''
                  ? 'bg-gray-800/80 text-white border-gray-600 scale-105 shadow-lg'
                  : 'bg-gray-300/20 text-white border-gray-400/40 hover:bg-gray-400/30 hover:border-gray-300/60 hover:scale-102'
              }`}
              style={{
                backdropFilter: 'blur(10px)',
                boxShadow: genderFilter === '' 
                  ? '0 8px 25px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                  : '0 4px 15px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)'
              }}
            >
              Tous
            </button>
          </div>
          {/* Boutons pour chaque type, affichés seulement si un genre est choisi */}
          {genderFilter && (
            <div className="flex gap-3 mt-2 flex-wrap justify-center">
              {typeOptions.map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-5 py-2.5 rounded-full font-bold border-2 transition-all duration-300 backdrop-blur-md text-base min-w-[100px] ${
                    typeFilter === t
                      ? 'bg-gray-700/80 text-white border-gray-500 scale-105 shadow-lg'
                      : 'bg-gray-200/20 text-white border-gray-400/30 hover:bg-gray-300/30 hover:border-gray-300/50 hover:scale-102'
                  }`}
                  style={{
                    backdropFilter: 'blur(8px)',
                    boxShadow: typeFilter === t 
                      ? '0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
                      : '0 3px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)'
                  }}
                >
                  {t}
                </button>
              ))}
              {/* Bouton pour réinitialiser le type */}
              <button
                onClick={() => setTypeFilter('')}
                className={`px-5 py-2.5 rounded-full font-bold border-2 transition-all duration-300 backdrop-blur-md text-base min-w-[100px] ${
                  typeFilter === ''
                    ? 'bg-gray-700/80 text-white border-gray-500 scale-105 shadow-lg'
                    : 'bg-gray-200/20 text-white border-gray-400/30 hover:bg-gray-300/30 hover:border-gray-300/50 hover:scale-102'
                }`}
                style={{
                  backdropFilter: 'blur(8px)',
                  boxShadow: typeFilter === '' 
                    ? '0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
                    : '0 3px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)'
                }}
              >
                Tous
              </button>
            </div>
          )}
        </div>

        {/* Section styles - remplacer styles par filteredStyles */}
        <motion.div 
          className="mb-8 flex-grow flex flex-col justify-center items-center relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          style={{ minHeight: '60vh' }} // Assure une hauteur minimum pour le centrage
        >
     
          
          {stylesLoading ? (
            <div className="flex flex-col items-center gap-4">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-16 w-16 border-t-3 border-b-3 border-white rounded-full relative"
              >
                <motion.div
                  className="absolute inset-0 border-t-3 rounded-full"
                  style={{ borderTopColor: secondaryColor }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
              <motion.p 
                className="text-white text-lg"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Chargement des styles magiques...
              </motion.p>
            </div>
          ) : filteredStyles.length === 0 ? (
            <motion.div
              className="text-center py-16 px-8 rounded-3xl backdrop-blur-md bg-white/10 border border-white/20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}20` }}
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <span className="text-4xl">🎨</span>
              </motion.div>
              <p className="text-center text-white text-xl font-medium">
                Aucun style disponible pour ce projet
              </p>
            </motion.div>
          ) : (
            // Bloc modifié : encart plus haut et centré verticalement
            <div className="w-full mx-auto relative flex items-center justify-center" style={{ minHeight: 500 }}>
              <div 
                className="relative backdrop-blur-sm bg-white/5 rounded-3xl border border-white/10 p-4 w-full max-w-7xl"
                style={{
                  boxShadow: `0 20px 60px ${primaryColor}15, inset 0 1px 0 rgba(255,255,255,0.1)`,
                  minHeight: 600 // hauteur augmentée pour l'encart du carrousel
                }}
              >
                <Slider {...sliderSettings}>
                  {filteredStyles.map((style, index) => (
                    <div key={style.id} className="px-2">
                      <motion.div 
                        className={`cursor-pointer overflow-hidden rounded-3xl backdrop-blur-md bg-white/10 shadow-xl hover:shadow-2xl transition-all transform duration-500 border-2 style-card group ${
                          selectedStyle?.id === style.id 
                            ? 'border-white scale-105 shadow-2xl' 
                            : 'border-white/20 hover:scale-[1.02] hover:border-white/40'
                        }`}
                        onClick={() => handleStyleSelect(style)}
                        style={{
                          boxShadow: selectedStyle?.id === style.id 
                            ? `0 25px 60px ${secondaryColor}40, 0 0 0 3px ${secondaryColor}30`
                            : `0 15px 40px ${primaryColor}20`
                        }}
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ 
                          duration: 0.5, 
                          delay: index * 0.05,
                          type: "spring",
                          damping: 15
                        }}
                        whileHover={{ 
                          y: -8,
                          transition: { duration: 0.2 }
                        }}
                      >
                        {/* Image agrandie et non croppée */}
                        <div 
                          className="relative overflow-hidden"
                          style={{ 
                            height: 350, // hauteur légèrement réduite pour un meilleur équilibre
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#222"
                          }}
                        >
                          {style.preview_image ? (
                            <>
                              <motion.img 
                                src={style.preview_image}
                                alt={style.name}
                                className="object-contain w-full h-full transition-all duration-700 group-hover:scale-105"
                                style={{ maxHeight: "100%", maxWidth: "100%" }}
                                onError={(e) => {
                                  console.error(`Failed to load image for style ${style.name}`);
                                  e.target.style.display = 'none';
                                }}
                                whileHover={{ scale: 1.08 }}
                              />
                              <motion.div 
                                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"
                                style={{
                                  background: `linear-gradient(to top, ${primaryColor}60, transparent 50%, ${secondaryColor}10)`
                                }}
                              />
                              <motion.div 
                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                                initial={{ scale: 0.8 }}
                                whileHover={{ scale: 1 }}
                              >
                                <motion.button 
                                  className="px-4 py-2 text-base md:px-8 md:py-3 md:text-lg rounded-full font-bold shadow-2xl transform transition-all backdrop-blur-md border border-white/30"
                                  style={{ 
                                    backgroundColor: `${secondaryColor}90`, 
                                    color: primaryColor 
                                  }}
                                  whileHover={{ 
                                    scale: 1.05,
                                    boxShadow: `0 15px 30px ${secondaryColor}40`
                                  }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                 Choisir ce style
                                </motion.button>
                              </motion.div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-300">
                              <span className="text-gray-500 text-lg">Aucune image</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Enhanced style information */}
                        <motion.div 
                          className="p-6 relative"
                          style={{
                            background: selectedStyle?.id === style.id 
                              ? `linear-gradient(135deg, ${primaryColor}10, ${secondaryColor}05)`
                              : 'transparent'
                          }}
                        >
                          {style.description && (
                            <motion.p className="text-white/80 text-base line-clamp-2">
                              {style.description}
                            </motion.p>
                          )}
                          <motion.div
                            className="absolute bottom-0 left-0 right-0 h-1 rounded-b-3xl"
                            style={{
                              background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`
                            }}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: selectedStyle?.id === style.id ? 1 : 0 }}
                            transition={{ duration: 0.3 }}
                          />
                        </motion.div>
                        {/* Enhanced selection badge */}
                        {selectedStyle?.id === style.id && (
                          <motion.div 
                            className="absolute top-4 right-4 backdrop-blur-md text-sm font-bold px-4 py-2 rounded-full border border-white/30"
                            style={{ 
                              backgroundColor: `${secondaryColor}90`, 
                              color: primaryColor,
                              boxShadow: `0 8px 25px ${secondaryColor}40`
                            }}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ 
                              type: "spring",
                              damping: 15,
                              stiffness: 300
                            }}
                          >
                            ✨ Sélectionné
                          </motion.div>
                        )}
                      </motion.div>
                    </div>
                  ))}
                </Slider>
              </div>
            </div>
          )}
        </motion.div>
        
        {/* Confirmation modal - Responsive version */}
        <AnimatePresence>
          {showConfirmModal && selectedStyle && (
            <motion.div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            >
              {/* Ajout effet blur et transparence sur le fond du popup */}
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-md"
                style={{
                  zIndex: 0
                }}
              />
              
              {/* Enhanced popup content - Responsive layout */}
              <motion.div 
                className="relative w-full max-w-lg lg:max-w-6xl rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md bg-white/95 
                           flex flex-col lg:flex-row lg:h-[900px] xl:h-[950px] 2xl:h-[1000px]"
                initial={{ scale: 0.8, y: 50, opacity: 0, rotateX: -15 }}
                animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }}
                exit={{ scale: 0.8, y: 50, opacity: 0, rotateX: 15 }}
                transition={{ 
                  type: "spring", 
                  damping: 20, 
                  stiffness: 300,
                  duration: 0.6
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Animated header - Only visible on mobile */}
                <motion.div 
                  className="lg:hidden relative w-full h-3 overflow-hidden"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1, delay: 0.3 }}
                >
                  <div 
                    className="w-full h-full relative"
                    style={{ background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor}, ${primaryColor})` }}
                  >
                    <motion.div
                      className="absolute inset-0 opacity-60"
                      style={{ background: `linear-gradient(90deg, transparent, white, transparent)` }}
                      animate={{ x: [-100, 300] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    />
                  </div>
                </motion.div>
                
                {/* Image section - Left side on desktop, top on mobile */}
                <div className="relative w-full lg:w-1/2 h-72 lg:h-full bg-gray-900 overflow-hidden lg:rounded-l-3xl">
                  {selectedStyle.preview_image ? (
                    <>
                      <motion.img 
                        src={selectedStyle.preview_image}
                        alt={selectedStyle.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        initial={{ scale: 1.2, filter: "blur(2px)" }}
                        animate={{ scale: 1, filter: "blur(0px)" }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black/90 via-black/30 to-transparent"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                      />
                      
                      {/* Floating style badge with glow */}
                      <motion.div
                        className="absolute top-6 right-6 px-4 py-2 rounded-full backdrop-blur-md shadow-lg border border-white/30"
                        style={{ backgroundColor: `${secondaryColor}20`, color: secondaryColor }}
                        initial={{ opacity: 0, scale: 0, rotate: -45 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ 
                          type: "spring",
                          damping: 15,
                          stiffness: 300,
                          delay: 0.6 
                        }}
                      >
                        <span className="text-sm font-bold">✨ Sélectionné</span>
                      </motion.div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-800">
                      <span className="text-gray-400">Aucune image disponible</span>
                    </div>
                  )}
                  
                  {/* Style information - Bottom on mobile, overlay on desktop */}
                  <div className="absolute bottom-6 left-6 right-6">
                    <motion.div
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.6 }}
                    >
                      {selectedStyle.description && (
                        <motion.p 
                          className="text-white/90 text-sm lg:text-base line-clamp-2 drop-shadow-md"
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.9, duration: 0.5 }}
                        >
                          {selectedStyle.description}
                        </motion.p>
                      )}
                    </motion.div>
                  </div>
                </div>
                
                {/* Content section - Right side on desktop, bottom on mobile */}
                <div className="bg-gradient-to-br from-white to-gray-50 p-6 lg:p-8 xl:p-10 2xl:p-12 lg:w-1/2 flex flex-col justify-start lg:rounded-r-3xl overflow-y-auto lg:max-h-full">
                  {/* Animated header - Only visible on desktop */}
                  <motion.div 
                    className="hidden lg:block absolute top-0 left-1/2 right-0 h-3 overflow-hidden"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                  >
                    <div 
                      className="w-full h-full relative"
                      style={{ background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor}, ${primaryColor})` }}
                    >
                      <motion.div
                        className="absolute inset-0 opacity-60"
                        style={{ background: `linear-gradient(90deg, transparent, white, transparent)` }}
                        animate={{ x: [-100, 300] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                      />
                    </div>
                  </motion.div>


                  
                  {/* New: Hair color selector with two-step selection */}
                  <div className="mb-3 lg:mb-4 xl:mb-5 2xl:mb-6">
                    <h4 className="text-gray-800 font-bold text-base lg:text-lg xl:text-xl 2xl:text-2xl mb-3 lg:mb-4 xl:mb-4">Couleur des cheveux (optionnel)</h4>
                    
                    {/* Step 1: Category selection or None */}
                    <div className="mb-2 lg:mb-3">
                      {/* "Aucune teinte" option - Enhanced Web 3.0 Design */}
                      <div className="flex justify-center mb-4">
                        <motion.button
                          type="button"
                          onClick={() => {
                            setSelectedTeinteCategory('');
                            setHairColor('');
                          }}
                          className={`relative px-8 py-5 rounded-3xl transition-all duration-500 backdrop-blur-xl border-2 overflow-hidden group ${
                            selectedTeinteCategory === '' && hairColor === ''
                              ? 'bg-gradient-to-br from-white via-gray-50 to-white border-gray-300 shadow-2xl scale-105' 
                              : 'bg-white/90 border-gray-200 hover:bg-white hover:border-gray-300 hover:scale-102 shadow-xl'
                          }`}
                          style={{
                            boxShadow: selectedTeinteCategory === '' && hairColor === ''
                              ? '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.8), inset 0 2px 4px rgba(255,255,255,0.9)'
                              : '0 15px 35px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.6), inset 0 1px 2px rgba(255,255,255,0.7)'
                          }}
                          whileHover={{ 
                            scale: selectedTeinteCategory === '' && hairColor === '' ? 1.08 : 1.05,
                            y: -2,
                            transition: { duration: 0.3, type: "spring", damping: 15 }
                          }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {/* Multi-layered animated background */}
                          <motion.div
                            className="absolute inset-0 opacity-10"
                            style={{
                              background: 'conic-gradient(from 0deg, #667eea, #764ba2, #f093fb, #f5576c, #4facfe, #00f2fe, #667eea)',
                            }}
                            animate={{
                              rotate: selectedTeinteCategory === '' && hairColor === '' ? [0, 360] : 0,
                            }}
                            transition={{
                              duration: 8,
                              repeat: selectedTeinteCategory === '' && hairColor === '' ? Infinity : 0,
                              ease: "linear"
                            }}
                          />

                          {/* Gradient pulse overlay */}
                          <motion.div
                            className="absolute inset-0 rounded-3xl"
                            style={{
                              background: 'radial-gradient(circle at center, rgba(103,126,234,0.1) 0%, transparent 70%)',
                            }}
                            animate={{
                              scale: selectedTeinteCategory === '' && hairColor === '' ? [1, 1.2, 1] : 1,
                              opacity: selectedTeinteCategory === '' && hairColor === '' ? [0.1, 0.3, 0.1] : 0.1,
                            }}
                            transition={{
                              duration: 2.5,
                              repeat: selectedTeinteCategory === '' && hairColor === '' ? Infinity : 0,
                              ease: "easeInOut"
                            }}
                          />

                          {/* Content */}
                          <div className="relative z-10 flex items-center gap-4">
                            <motion.div
                              className="relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
                              style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                              }}
                              animate={{
                                rotate: selectedTeinteCategory === '' && hairColor === '' ? [0, 10, -10, 0] : 0,
                                scale: selectedTeinteCategory === '' && hairColor === '' ? [1, 1.1, 1] : 1,
                              }}
                              transition={{
                                duration: 3,
                                repeat: selectedTeinteCategory === '' && hairColor === '' ? Infinity : 0,
                                ease: "easeInOut"
                              }}
                            >
                              {/* Inner glow */}
                              <motion.div
                                className="absolute inset-1 rounded-xl bg-white/20 backdrop-blur-sm"
                                animate={{
                                  opacity: selectedTeinteCategory === '' && hairColor === '' ? [0.2, 0.5, 0.2] : 0.2,
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: selectedTeinteCategory === '' && hairColor === '' ? Infinity : 0,
                                  ease: "easeInOut"
                                }}
                              />
                              
                              <motion.span 
                                className="text-white text-2xl font-bold relative z-10"
                                animate={{
                                  scale: selectedTeinteCategory === '' && hairColor === '' ? [1, 1.2, 1] : 1,
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: selectedTeinteCategory === '' && hairColor === '' ? Infinity : 0,
                                  ease: "easeInOut"
                                }}
                              >
                                ×
                              </motion.span>
                            </motion.div>
                            
                            <div className="flex flex-col">
                              <motion.span 
                                className="text-lg font-bold text-gray-800 tracking-wide leading-none"
                                animate={{
                                  color: selectedTeinteCategory === '' && hairColor === '' 
                                    ? ['#1f2937', '#4f46e5', '#1f2937'] 
                                    : '#1f2937',
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: selectedTeinteCategory === '' && hairColor === '' ? Infinity : 0,
                                  ease: "easeInOut"
                                }}
                              >
                                Aucune teinte
                              </motion.span>
                              <span className="text-xs text-gray-500 mt-1">Style naturel</span>
                            </div>
                          </div>

                          {/* Advanced shine effect with multiple layers */}
                          <motion.div
                            className="absolute inset-0 opacity-0 group-hover:opacity-40 pointer-events-none rounded-3xl"
                            style={{
                              background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%)',
                            }}
                            animate={{
                              x: [-300, 300],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              repeatDelay: 3,
                              ease: "easeInOut"
                            }}
                          />

                          {/* Floating particles */}
                          {selectedTeinteCategory === '' && hairColor === '' && (
                            <div className="absolute inset-0 pointer-events-none">
                              {[...Array(8)].map((_, i) => (
                                <motion.div
                                  key={`no-tint-particle-${i}`}
                                  className="absolute w-1.5 h-1.5 rounded-full opacity-40"
                                  style={{
                                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                                    left: `${15 + Math.random() * 70}%`,
                                    top: `${15 + Math.random() * 70}%`,
                                  }}
                                  animate={{
                                    y: [0, -20, 0],
                                    x: [0, Math.random() * 20 - 10, 0],
                                    scale: [1, 1.5, 1],
                                    opacity: [0.4, 0.8, 0.4],
                                  }}
                                  transition={{
                                    duration: 3 + Math.random() * 2,
                                    repeat: Infinity,
                                    delay: i * 0.3,
                                    ease: "easeInOut"
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </motion.button>
                      </div>

                      {/* Category selection - Web 3.0 Design */}
                      <div className="grid grid-cols-2 gap-2 lg:gap-2 xl:gap-3">
                        {teinteCategories.map((category, index) => (
                          <motion.button
                            key={category.name}
                            type="button"
                            onClick={() => {
                              setSelectedTeinteCategory(category.name);
                              setHairColor(''); // Reset specific color when changing category
                            }}
                            className={`relative p-2 lg:p-3 rounded-2xl transition-all duration-500 overflow-hidden backdrop-blur-md border-2 group ${
                              selectedTeinteCategory === category.name
                                ? 'border-white shadow-2xl scale-105' 
                                : 'border-white/30 hover:border-white/60 hover:scale-102 shadow-lg'
                            }`}
                            style={{
                              background: selectedTeinteCategory === category.name 
                                ? category.gradient
                                : `linear-gradient(135deg, ${category.color}15, ${category.color}05)`,
                              boxShadow: selectedTeinteCategory === category.name
                                ? `0 15px 30px ${category.color}40, inset 0 1px 0 rgba(255,255,255,0.3)`
                                : `0 8px 15px ${category.color}20, inset 0 1px 0 rgba(255,255,255,0.2)`
                            }}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ 
                              duration: 0.6, 
                              delay: index * 0.1,
                              type: "spring",
                              damping: 15
                            }}
                            whileHover={{ 
                              y: -3,
                              scale: 1.02,
                              transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {/* Animated background overlay */}
                            <motion.div
                              className="absolute inset-0 opacity-30"
                              style={{
                                background: category.gradient,
                              }}
                              animate={{
                                scale: selectedTeinteCategory === category.name ? [1, 1.05, 1] : 1,
                                opacity: selectedTeinteCategory === category.name ? [0.3, 0.5, 0.3] : 0.3,
                              }}
                              transition={{
                                duration: 2,
                                repeat: selectedTeinteCategory === category.name ? Infinity : 0,
                                ease: "easeInOut"
                              }}
                            />

                            {/* Hair image with advanced styling */}
                            <div className="relative z-10 mb-2">
                              <motion.div
                                className={`w-10 h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 mx-auto rounded-xl overflow-hidden border-2 ${
                                  selectedTeinteCategory === category.name
                                    ? 'border-white shadow-2xl'
                                    : 'border-white/50 shadow-lg'
                                }`}
                                style={{
                                  background: `linear-gradient(45deg, ${category.color}20, transparent)`,
                                }}
                                animate={{
                                  rotate: selectedTeinteCategory === category.name ? [0, 2, -2, 0] : 0,
                                  scale: selectedTeinteCategory === category.name ? [1, 1.05, 1] : 1,
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: selectedTeinteCategory === category.name ? Infinity : 0,
                                  ease: "easeInOut"
                                }}
                              >
                                <motion.img
                                  src={category.image}
                                  alt={category.label}
                                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                                  style={{
                                    filter: selectedTeinteCategory === category.name 
                                      ? 'brightness(1.1) contrast(1.1) saturate(1.2)'
                                      : 'brightness(1) contrast(1) saturate(1)',
                                  }}
                                  whileHover={{
                                    scale: 1.1,
                                    filter: 'brightness(1.2) contrast(1.2) saturate(1.3)',
                                  }}
                                />
                                
                                {/* Glow overlay */}
                                <motion.div
                                  className="absolute inset-0 opacity-0 group-hover:opacity-20"
                                  style={{
                                    background: `radial-gradient(circle, ${category.color}80, transparent 70%)`,
                                  }}
                                  animate={{
                                    opacity: selectedTeinteCategory === category.name ? [0, 0.3, 0] : 0,
                                  }}
                                  transition={{
                                    duration: 2,
                                    repeat: selectedTeinteCategory === category.name ? Infinity : 0,
                                    ease: "easeInOut"
                                  }}
                                />
                              </motion.div>
                            </div>

                            {/* Text content */}
                            <div className="relative z-10 text-center">
                              <motion.h3 
                                className={`font-bold text-sm lg:text-base xl:text-lg mb-1 ${
                                  selectedTeinteCategory === category.name
                                    ? 'text-white drop-shadow-lg'
                                    : 'text-gray-800'
                                }`}
                                style={{
                                  textShadow: selectedTeinteCategory === category.name 
                                    ? `0 2px 10px ${category.color}60`
                                    : 'none',
                                }}
                                animate={{
                                  scale: selectedTeinteCategory === category.name ? [1, 1.05, 1] : 1,
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: selectedTeinteCategory === category.name ? Infinity : 0,
                                  ease: "easeInOut"
                                }}
                              >
                                {category.label}
                              </motion.h3>
                              <motion.p 
                                className={`text-xs lg:text-sm leading-tight ${
                                  selectedTeinteCategory === category.name
                                    ? 'text-white/90 drop-shadow-md'
                                    : 'text-gray-600'
                                }`}
                                initial={{ opacity: 0.8 }}
                                animate={{ opacity: selectedTeinteCategory === category.name ? 1 : 0.8 }}
                              >
                                {category.description}
                              </motion.p>
                            </div>

                            {/* Selection indicator */}
                            {selectedTeinteCategory === category.name && (
                              <motion.div
                                className="absolute top-2 right-2 w-5 h-5 lg:w-6 lg:h-6 bg-white rounded-full flex items-center justify-center shadow-lg"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ 
                                  type: "spring",
                                  damping: 15,
                                  stiffness: 300
                                }}
                              >
                                <motion.svg 
                                  className="w-3 h-3 lg:w-4 lg:h-4"
                                  style={{ color: category.color }}
                                  fill="currentColor" 
                                  viewBox="0 0 20 20"
                                  animate={{
                                    scale: [1, 1.2, 1],
                                  }}
                                  transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                  }}
                                >
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </motion.svg>
                              </motion.div>
                            )}

                            {/* Floating particles effect */}
                            {selectedTeinteCategory === category.name && (
                              <div className="absolute inset-0 pointer-events-none">
                                {[...Array(4)].map((_, i) => (
                                  <motion.div
                                    key={`particle-${i}`}
                                    className="absolute w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full opacity-60"
                                    style={{
                                      backgroundColor: category.color,
                                      left: `${20 + Math.random() * 60}%`,
                                      top: `${20 + Math.random() * 60}%`,
                                    }}
                                    animate={{
                                      y: [0, -15, 0],
                                      x: [0, Math.random() * 15 - 7.5, 0],
                                      scale: [1, 1.3, 1],
                                      opacity: [0.6, 0.2, 0.6],
                                    }}
                                    transition={{
                                      duration: 3 + Math.random() * 2,
                                      repeat: Infinity,
                                      delay: i * 0.5,
                                      ease: "easeInOut"
                                    }}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Shine effect on hover */}
                            <motion.div
                              className="absolute inset-0 opacity-0 group-hover:opacity-30 pointer-events-none"
                              style={{
                                background: 'linear-gradient(135deg, transparent, rgba(255,255,255,0.8), transparent)',
                              }}
                              animate={{
                                x: [-100, 300],
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                repeatDelay: 3,
                              }}
                            />
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Step 2: Specific color selection within category */}
                    {selectedTeinteCategory && (
                      <div className="bg-gray-50 p-2 lg:p-3 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-700 mb-2 lg:mb-3 text-center">
                          Choisissez votre teinte {selectedTeinteCategory} :
                        </h5>
                        <div className="relative px-2 py-2 lg:py-3">
                          <Slider 
                            {...{
                              dots: false,
                              infinite: hairColorOptions.filter(opt => opt.teinte === selectedTeinteCategory).length > 6,
                              speed: 500,
                              rows: 2,
                              slidesPerRow: 2,
                              slidesToShow: Math.min(2, Math.ceil(hairColorOptions.filter(opt => opt.teinte === selectedTeinteCategory).length / 4)),
                              slidesToScroll: 1,
                              swipeToSlide: true,
                              arrows: hairColorOptions.filter(opt => opt.teinte === selectedTeinteCategory).length > 8,
                              prevArrow: (
                                <button
                                  type="button"
                                  className="absolute left-[-35px] top-1/2 transform -translate-y-1/2 z-30 w-10 h-10 bg-white rounded-full shadow-lg border flex items-center justify-center hover:bg-gray-50 transition-all duration-300"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M15 18L9 12L15 6" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                              ),
                              nextArrow: (
                                <button
                                  type="button"
                                  className="absolute right-[-35px] top-1/2 transform -translate-y-1/2 z-30 w-10 h-10 bg-white rounded-full shadow-lg border flex items-center justify-center hover:bg-gray-50 transition-all duration-300"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 6L15 12L9 18" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                              ),
                              responsive: [
                                {
                                  breakpoint: 1024,
                                  settings: {
                                    rows: 2,
                                    slidesPerRow: 2,
                                    slidesToShow: Math.min(2, Math.ceil(hairColorOptions.filter(opt => opt.teinte === selectedTeinteCategory).length / 4)),
                                    arrows: hairColorOptions.filter(opt => opt.teinte === selectedTeinteCategory).length > 8
                                  }
                                },
                                {
                                  breakpoint: 768,
                                  settings: {
                                    rows: 2,
                                    slidesPerRow: 1,
                                    slidesToShow: Math.min(2, Math.ceil(hairColorOptions.filter(opt => opt.teinte === selectedTeinteCategory).length / 2)),
                                    arrows: hairColorOptions.filter(opt => opt.teinte === selectedTeinteCategory).length > 4
                                  }
                                },
                                {
                                  breakpoint: 480,
                                  settings: {
                                    rows: 2,
                                    slidesPerRow: 1,
                                    slidesToShow: 1,
                                    arrows: hairColorOptions.filter(opt => opt.teinte === selectedTeinteCategory).length > 2
                                  }
                                }
                              ]
                            }}
                          >
                            {hairColorOptions
                              .filter(opt => opt.teinte === selectedTeinteCategory)
                              .map(opt => {
                                const isSelected = hairColor === opt.value;
                                const isImage = opt.bg.startsWith('/');
                                
                                return (
                                  <div key={opt.value} className="px-1 py-1">
                                    <div className="flex flex-col items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setHairColor(opt.value)}
                                        className={`w-14 h-14 lg:w-16 lg:h-16 xl:w-18 xl:h-18 border-2 transition-all duration-200 overflow-hidden relative focus:outline-none ${
                                          isSelected 
                                            ? 'border-gray-500 ring-2 ring-gray-400 scale-105' 
                                            : 'border-gray-300 hover:border-gray-400 hover:scale-102'
                                        }`}
                                        style={{ 
                                          borderRadius: '8px',
                                          backgroundColor: isImage ? 'transparent' : opt.bg,
                                          backgroundImage: isImage ? `url(${opt.bg})` : 'none',
                                          backgroundSize: isImage ? 'cover' : 'auto',
                                          backgroundPosition: isImage ? 'center' : 'initial'
                                        }}
                                        title={opt.label}
                                      >
                                        {isSelected && (
                                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                            <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          </div>
                                        )}
                                      </button>
                                      <span className="text-xs text-gray-600 text-center leading-tight max-w-[56px] lg:max-w-[64px] xl:max-w-[72px] truncate">
                                        {opt.label}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                          </Slider>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col items-center gap-3 lg:gap-0 xl:gap-0 2xl:gap-6 mt-3 lg:mt-4 xl:mt-6 2xl:mt-8">
                    {/* START button */}
                    <motion.button
                      onClick={handleStartClick}
                      className="relative w-full px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 lg:py-5 xl:py-6 2xl:py-8 rounded-lg lg:rounded-xl xl:rounded-2xl font-black text-base lg:text-xl xl:text-2xl 2xl:text-3xl flex items-center justify-center gap-3 lg:gap-4 xl:gap-5 shadow-lg overflow-hidden group"
                      style={{ 
                        backgroundColor: secondaryColor, 
                        color: primaryColor,
                        boxShadow: `0 20px 40px ${secondaryColor}40`
                      }}
                      whileHover={{ 
                        scale: 1.05,
                        boxShadow: `0 25px 50px ${secondaryColor}60`
                      }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 30, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        delay: 1.7, 
                        duration: 0.6,
                        type: "spring",
                        damping: 15,
                        stiffness: 300
                      }}
                    >
                      {/* Animated floating bubbles */}
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={`modal-bubble-${i}`}
                          className="absolute rounded-full opacity-30"
                          style={{
                            backgroundColor: primaryColor,
                            width: `${6 + Math.random() * 12}px`,
                            height: `${6 + Math.random() * 12}px`,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                          }}
                          animate={{
                            y: [0, -15, 0],
                            x: [0, Math.random() * 15 - 7.5, 0],
                            scale: [1, 1.3, 1],
                            opacity: [0.3, 0.6, 0.3],
                          }}
                          transition={{
                            duration: 2 + Math.random() * 1.5,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                            ease: "easeInOut"
                          }}
                        />
                      ))}

                      {/* Pulsing rings */}
                      {[...Array(2)].map((_, i) => (
                        <motion.div
                          key={`modal-ring-${i}`}
                          className="absolute rounded-full border-2 opacity-30"
                          style={{
                            borderColor: primaryColor,
                            width: `${30 + i * 15}px`,
                            height: `${30 + i * 15}px`,
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)'
                          }}
                          animate={{
                            scale: [0.8, 1.1, 0.8],
                            opacity: [0.3, 0.1, 0.3],
                            rotate: [0, 360]
                          }}
                          transition={{
                            duration: 2.5 + i * 0.3,
                            repeat: Infinity,
                            delay: i * 0.4,
                            ease: "easeInOut"
                          }}
                        />
                      ))}

                      {/* Rotating gradient overlay */}
                     

                    

                      {/* Original shine effect */}
                 
                      
                      <motion.span
                        className="relative z-10"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1.9, duration: 0.3 }}
                      >
                       VALIDER
                      </motion.span>
                      
                      {/* ...existing SVG arrow... */}
                      <motion.svg 
                        className="w-4 h-4 lg:w-6 lg:h-6 relative z-10" 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 2.1, duration: 0.4 }}
                        whileHover={{ x: 5 }}
                      >
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </motion.svg>
                    </motion.button>
                    
                    {/* Cancel button */}
                    <motion.button
                      onClick={closeModal}
                      className="px-4 lg:px-6 xl:px-8 2xl:px-10 py-3 lg:py-4 xl:py-5 2xl:py-6 rounded-lg lg:rounded-xl text-gray-600 font-medium text-base lg:text-lg xl:text-xl 2xl:text-2xl flex items-center gap-2 lg:gap-3 xl:gap-4 hover:bg-gray-100 transition-all duration-300 group"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 2.3, duration: 0.4 }}
                    >
                      <motion.svg 
                        className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7 group-hover:rotate-[-5deg] transition-transform" 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </motion.svg>
                      <span>Changer de style</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}