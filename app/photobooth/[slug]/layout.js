'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PhotoboothLayout({ children, params }) {
  const [background, setBackground] = useState({ image: null, color: null });
  const slug = params.slug;
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getBackgroundInfo() {
      // D'abord essayer de récupérer depuis localStorage
      const cached = localStorage.getItem(`photobooth_bg_${slug}`);
      
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setBackground({
            image: parsed.background_image,
            color: parsed.primary_color || null  // Utiliser primary_color comme couleur de fond
          });
        } catch (e) {
          console.error("Erreur lors de la lecture du cache:", e);
        }
        return;
      }
      
      // Sinon, requête à Supabase
      try {
        // Récupérer à la fois background_image et primary_color
        const { data, error } = await supabase
          .from('projects')
          .select('background_image, primary_color')
          .eq('slug', slug)
          .single();
          
        if (!error && data) {
          setBackground({
            image: data.background_image,
            color: data.primary_color
          });
          
          // Mettre en cache
          localStorage.setItem(`photobooth_bg_${slug}`, JSON.stringify({
            background_image: data.background_image,
            primary_color: data.primary_color
          }));
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'arrière-plan:", error);
      }
    }
    
    getBackgroundInfo();
  }, [slug, supabase]);

  // Ne pas appliquer le style à la page de redirection
  if (pathname === `/photobooth/${slug}`) {
    return children;
  }

  // L'image de fond sera au-dessus de la couleur si les deux sont spécifiées
  const backgroundStyle = {
    backgroundImage: background.image ? `url(${background.image})` : 'none',
    backgroundColor: background.color || 'transparent',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    minHeight: '100vh',
    width: '100%',
    position: 'relative'
  };

  return (
    <div style={backgroundStyle} className="flex flex-col">
      {children}
    </div>
  );
}
