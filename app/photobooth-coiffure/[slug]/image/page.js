'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ImagePage({ params }) {
  const searchParams = useSearchParams();
  const imgUrl = searchParams.get('img');
  const slug = params?.slug;
  const supabase = createClientComponentClient();

  // Contenu dynamique
  const [content, setContent] = useState({
    title: "Votre photo générée",
    text1: "Voici votre photo générée par notre photobooth IA. Vous pouvez la télécharger ou la partager avec vos amis !",
    text2: "Cette image est disponible pendant 7 jours. Pensez à la sauvegarder !",
    link_text: "Visitez notre site web",
    link_url: "https://www.leeve.fr",
    background_color: "#f5f5f5"
  });
  
  // État pour la galerie publique et le swipe
  const [showPublicGallery, setShowPublicGallery] = useState(false);
  const [enableSwipe, setEnableSwipe] = useState(false);

  useEffect(() => {
    async function fetchContent() {
      // Récupère le project_id via le slug
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', slug)
        .single();

      if (project?.id) {
        // Récupérer le contenu personnalisé de la page
        const { data: pageContent } = await supabase
          .from('photobooth_image_page_content')
          .select('*')
          .eq('project_id', project.id)
          .single();

        if (pageContent) {
          setContent({
            title: pageContent.title || content.title,
            text1: pageContent.text1 || content.text1,
            text2: pageContent.text2 || content.text2,
            link_text: pageContent.link_text || content.link_text,
            link_url: pageContent.link_url || content.link_url,
            background_color: pageContent.background_color || content.background_color
          });
        }
        
        // Vérifier si la galerie publique et le swipe sont activés
        console.log('🔍 Fetching mosaic settings for project:', project.id);
        
        // Utiliser l'API avec service role pour contourner RLS
        try {
          const response = await fetch(`/api/get-mosaic-settings?projectId=${project.id}`);
          const result = await response.json();
          
          console.log('🔍 API Response:', result);
          
          if (result.success && result.data) {
            const mosaicSettings = result.data;
            console.log('✅ Mosaic Settings trouvés via API:', mosaicSettings);
            
            if (mosaicSettings.is_public) {
              console.log('✅ Setting showPublicGallery to true');
              setShowPublicGallery(true);
            } else {
              console.log('❌ is_public is false:', mosaicSettings.is_public);
            }
            
            if (mosaicSettings.enable_swipe) {
              console.log('✅ Setting enableSwipe to true');
              setEnableSwipe(true);
            } else {
              console.log('❌ enable_swipe is false:', mosaicSettings.enable_swipe);
            }
          } else {
            console.log('❌ Aucun paramètre mosaic trouvé via API');
          }
        } catch (apiError) {
          console.error('❌ Erreur API get-mosaic-settings:', apiError);
          
          // Fallback: essayer la méthode directe Supabase
          const { data: mosaicSettings, error: mosaicError } = await supabase
            .from('mosaic_settings')
            .select('*')
            .eq('project_id', project.id)
            .maybeSingle();
            
          console.log('🔍 Fallback - Project ID:', project.id);
          console.log('🔍 Fallback - Mosaic Settings (full):', mosaicSettings);
          console.log('🔍 Fallback - Mosaic Error:', mosaicError);
          
          if (mosaicSettings?.is_public) {
            console.log('✅ Fallback - Setting showPublicGallery to true');
            setShowPublicGallery(true);
          } else {
            console.log('❌ Fallback - is_public is false or undefined:', mosaicSettings?.is_public);
          }
          
          if (mosaicSettings?.enable_swipe) {
            console.log('✅ Fallback - Setting enableSwipe to true');
            setEnableSwipe(true);
          } else {
            console.log('❌ Fallback - enable_swipe is false or undefined:', mosaicSettings?.enable_swipe);
          }
        }
      }
    }
    fetchContent();
    // eslint-disable-next-line
  }, [slug]);

  if (!imgUrl) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 via-pink-50 to-yellow-50">
        <h1 className="text-3xl font-bold text-indigo-700 mb-4">Aucune image à afficher</h1>
        <p className="text-lg text-gray-600">Veuillez scanner un QR code valide ou revenir à la page d'accueil.</p>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background: content.background_color || "#f5f5f5"
      }}
    >
      {/* Titre dynamique */}
      <h1 className="text-4xl md:text-5xl font-extrabold text-indigo-700 mb-4 text-center drop-shadow-lg">
        {content.title}
      </h1>
      {/* Description dynamique */}
      <p className="text-lg md:text-xl text-gray-700 mb-8 text-center max-w-xl">
        {content.text1}
      </p>
      {/* Image */}
      <div className="rounded-2xl overflow-hidden shadow-2xl mb-6 border-4 border-indigo-200 bg-white">
        <img
          src={imgUrl}
          alt="Votre photo"
          className="w-full max-w-md max-h-[60vh] object-contain"
        />
      </div>
      {/* Texte sous l'image dynamique */}
      <p className="text-base md:text-lg text-gray-600 mb-6 text-center">
        {content.text2}
      </p>
      {/* Boutons d'action */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <a
          href={imgUrl}
          className="inline-block px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg text-lg transition-all"
        >
          Voir en grand
        </a>
        <a
          href={imgUrl}
          download
          className="inline-block px-8 py-4 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg text-lg transition-all"
        >
          Télécharger
        </a>
      </div>
      
      {/* Liens vers les galeries publiques si activées */}
      {(showPublicGallery || enableSwipe) && (
        <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-center">
          {showPublicGallery && (
            <a
              href={`/photobooth-coiffure/${slug}/gallery`}
              className="inline-block px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-lg transition-all"
            >
              🖼️ Voir toutes les photos de l'événement
            </a>
          )}
          {enableSwipe && (
            <a
              href={`/photobooth-coiffure/${slug}/swipe`}
              className="inline-block px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-semibold shadow-lg transition-all"
            >
              ❤️ Évaluer les photos (Swipe)
            </a>
          )}
        </div>
      )}
      {/* Boutons de partage */}
      <div className="flex flex-row gap-4 mb-8">
        {/* Facebook */}
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(imgUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow transition-all"
        >
          <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24h11.495v-9.294H9.691v-3.622h3.13V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0"></path></svg>
          
        </a>
        {/* Instagram */}
        <a
          href="https://www.instagram.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600 text-white font-semibold shadow transition-all"
        >
          <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.974 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.974-1.246-2.242-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.974-.975 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.771.131 4.659.396 3.678 1.378c-.982.982-1.247 2.094-1.306 3.374C2.013 5.668 2 6.077 2 12c0 5.923.013 6.332.072 7.612.059 1.28.324 2.392 1.306 3.374.981.982 2.093 1.247 3.374 1.306C8.332 23.987 8.741 24 12 24s3.668-.013 4.948-.072c1.281-.059 2.393-.324 3.374-1.306.982-.982 1.247-2.094 1.306-3.374.059-1.28.072-1.689.072-7.612 0-5.923-.013-6.332-.072-7.612-.059-1.28-.324-2.392-1.306-3.374-.981-.982-2.093-1.247-3.374-1.306C15.668.013 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"></path></svg>
         
        </a>
        {/* X (Twitter) */}
        <a
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(imgUrl)}&text=Découvrez%20ma%20photo%20générée%20par%20Photobooth%20IA!`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-black hover:bg-gray-800 text-white font-semibold shadow transition-all"
        >
          <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M17.53 7.477l-4.477 4.477 6.477 6.477h-2.477l-5.477-5.477-4.477 4.477h-2.477l6.477-6.477-6.477-6.477h2.477l5.477 5.477 4.477-4.477z"></path></svg>
         
        </a>
      </div>
      {/* Texte avec lien externe dynamique */}
      <p className="text-sm text-gray-500 text-center">
        {content.link_text}&nbsp;
        <a
          href={content.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 underline hover:text-indigo-800 font-semibold"
        >
          {content.link_url}
        </a>
      </p>
    </main>
  );
}
