'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import NextImage from 'next/image'; // Renamed to avoid conflict with global Image

// Debug component to diagnose background issues
function BackgroundDebugger({ backgroundUrl, projectData, backgroundsData }) {
  if (process.env.NODE_ENV !== 'development') return null;
  
  const testImageLoad = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      };
    } catch (error) {
      return {
        error: error.message,
        ok: false
      };
    }
  };

  const checkImage = async () => {
    if (!backgroundUrl) return;
    
    console.log('Testing image URL:', backgroundUrl);
    const result = await testImageLoad(backgroundUrl);
    console.log('Image load test result:', result);
    
    // Use window.Image to access the global Image constructor
    const img = new window.Image();
    img.onload = () => console.log('Test image loaded successfully!', img.width, img.height);
    img.onerror = (e) => console.error('Test image failed to load:', e);
    img.src = backgroundUrl;
  };

  return (
    <div className="fixed top-0 right-0 z-50 bg-black bg-opacity-80 text-white text-xs p-3 max-w-md max-h-full overflow-auto">
      <h3 className="font-bold mb-2">Background Debugger</h3>
      <button 
        onClick={checkImage} 
        className="px-2 py-1 bg-blue-700 text-white mb-2 rounded"
      >
        Test Image Load
      </button>
      <div>
        <div><strong>Background URL:</strong> {backgroundUrl || 'None'}</div>
        <div><strong>Project ID:</strong> {projectData?.id}</div>
        <div><strong>Project Color:</strong> {projectData?.primary_color}</div>
        <div><strong>Found Backgrounds:</strong> {backgroundsData?.length || 0}</div>
        {backgroundsData && backgroundsData.length > 0 && (
          <div>
            <div className="font-bold mt-2">Background Records:</div>
            {backgroundsData.map((bg, i) => (
              <div key={i} className="mt-1 border-t border-gray-700 pt-1">
                <div>{bg.name}: {bg.image_url}</div>
                <button 
                  onClick={() => {
                    // Try applying this background directly - safer approach
                    const element = document.getElementById('debug-bg-img');
                    if (element) {
                      console.log('Applying background directly:', bg.image_url);
                      // Make sure URL is wrapped in quotes and use !important
                      element.style.cssText = `background-image: url('${bg.image_url}') !important; background-size: cover !important; background-position: center !important;`;
                      
                      // Also create and preload the image to force browser to load it
                      const preloadImg = new window.Image();
                      preloadImg.src = bg.image_url;
                    } else {
                      console.error('Background element not found');
                    }
                  }}
                  className="text-xs bg-green-800 px-1 py-0.5 mt-1 rounded"
                >
                  Apply directly
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PremiumPhotoboothLayout({ children, params }) {
  const [background, setBackground] = useState({
    imageUrl: null,
    videoUrl: null,
    isAnimated: false,
    color: '#000000',
    loading: true,
    error: null
  });
  const [debugData, setDebugData] = useState({
    project: null,
    backgrounds: []
  });
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef(null);
  const slug = params.slug;
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  // Check if we're on the main page (only show video on main page)
  // Main page: /photobooth-boomerang/[slug] (corresponds to page.tsx)
  // Sub-pages: /photobooth-boomerang/[slug]/cam, /photobooth-boomerang/[slug]/how, etc.
  const pathSegments = pathname.split('/').filter(Boolean);
  const isMainPage = pathSegments.length === 2 && 
                     pathSegments[0] === 'photobooth-boomerang' && 
                     pathSegments[1] === slug;
  
  // Debug logging - more detailed
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Page detection (photobooth-boomerang):', {
      pathname,
      pathSegments,
      slug,
      isMainPage,
      pathLength: pathSegments.length,
      isCorrectPrefix: pathSegments[0] === 'photobooth-boomerang',
      isCorrectSlug: pathSegments[1] === slug,
      pageType: isMainPage ? 'MAIN PAGE (page.tsx) - VIDEOS ALLOWED' : 'SUB-PAGE - IMAGES ONLY'
    });
  }

  // Function to log debug info to console
  const logDebug = (msg, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 ${msg}:`, data);
    }
  };

  // Detect mobile/desktop screen orientation
  useEffect(() => {
    const checkScreenSize = () => {
      const isMobileScreen = window.innerWidth <= 768 || window.innerHeight > window.innerWidth;
      setIsMobile(isMobileScreen);
      logDebug('Screen detection', {
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: isMobileScreen,
        orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      });
    };

    // Check on mount
    checkScreenSize();

    // Listen for orientation/resize changes
    window.addEventListener('resize', checkScreenSize);
    window.addEventListener('orientationchange', () => {
      setTimeout(checkScreenSize, 100); // Delay for orientation change
    });

    return () => {
      window.removeEventListener('resize', checkScreenSize);
      window.removeEventListener('orientationchange', checkScreenSize);
    };
  }, []);

  useEffect(() => {
    async function loadBackground() {
      try {
        logDebug('Fetching background for slug', slug);
        
        // 1. Get project data
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('id, background_image, primary_color')
          .eq('slug', slug)
          .single();
          
        if (projectError) throw projectError;
        logDebug('Project data', project);
        
        // 2. Get backgrounds
        const { data: backgrounds, error: backgroundsError } = await supabase
          .from('backgrounds')
          .select('*')
          .eq('project_id', project.id)
          .eq('is_active', true);
          
        if (backgroundsError) throw backgroundsError;
        logDebug('Available backgrounds', backgrounds);
        
        setDebugData({
          project,
          backgrounds
        });
        
        // 3. Filter animated backgrounds with valid video URLs
        const animatedBackgrounds = backgrounds.filter(bg => {
          if (isMobile) {
            // For mobile: check vertical video first, fallback to horizontal
            return bg.show_animated === true && 
                   ((bg.video_url_vertical && bg.video_url_vertical.trim() !== '') ||
                    (bg.video_url && bg.video_url.trim() !== ''));
          } else {
            // For desktop: check horizontal video first, fallback to vertical
            return bg.show_animated === true && 
                   ((bg.video_url && bg.video_url.trim() !== '') ||
                    (bg.video_url_vertical && bg.video_url_vertical.trim() !== ''));
          }
        });
        
        logDebug('Animated backgrounds (orientation-aware)', { 
          animatedBackgrounds, 
          isMobile,
          total: animatedBackgrounds.length 
        });
        
        // 4. Select a background - PRIORITÉ : Vidéos uniquement sur page principale
        let selectedBackground;
        let isAnimated = false;
        let imageUrl = null;
        let videoUrl = null;
        
        logDebug('Background selection logic', {
          isMainPage,
          animatedBackgroundsCount: animatedBackgrounds.length,
          regularBackgroundsCount: backgrounds.length,
          strategy: isMainPage && animatedBackgrounds.length > 0 ? 'VIDEO (main page)' : 'IMAGE_ONLY'
        });
        
        // PRIORITÉ 1: Vidéos animées SEULEMENT sur la page principale (page.tsx)
        if (isMainPage && animatedBackgrounds.length > 0) {
          const randomIndex = Math.floor(Math.random() * animatedBackgrounds.length);
          selectedBackground = animatedBackgrounds[randomIndex];
          isAnimated = true;
          
          // Select video URL based on screen orientation
          if (isMobile) {
            // Mobile: prefer vertical video, fallback to horizontal
            videoUrl = selectedBackground.video_url_vertical || selectedBackground.video_url;
            imageUrl = selectedBackground.image_url_vertical || selectedBackground.image_url || null;
          } else {
            // Desktop: prefer horizontal video, fallback to vertical
            videoUrl = selectedBackground.video_url || selectedBackground.video_url_vertical;
            imageUrl = selectedBackground.image_url || selectedBackground.image_url_vertical || null;
          }
          
          logDebug('✅ SELECTED: Animated background for MAIN PAGE', { 
            selectedBackground: selectedBackground.name || 'Unnamed',
            isMobile,
            videoUrl,
            imageUrl,
            reason: 'Main page + animated backgrounds available'
          });
        } 
        // PRIORITÉ 2: Images statiques pour toutes les autres pages OU si pas de vidéo
        else if (backgrounds.length > 0) {
          const randomIndex = Math.floor(Math.random() * backgrounds.length);
          selectedBackground = backgrounds[randomIndex];
          isAnimated = false; // Force pas d'animation
          
          // Select image URL based on screen orientation
          if (isMobile) {
            // Mobile: prefer vertical image, fallback to horizontal
            imageUrl = selectedBackground.image_url_vertical || selectedBackground.image_url;
          } else {
            // Desktop: prefer horizontal image, fallback to vertical
            imageUrl = selectedBackground.image_url || selectedBackground.image_url_vertical;
          }
          
          logDebug('✅ SELECTED: Static background', { 
            selectedBackground: selectedBackground.name || 'Unnamed',
            isMobile,
            imageUrl,
            reason: isMainPage ? 'Main page but no animated backgrounds' : 'Sub-page (images only)'
          });
        } 
        // PRIORITÉ 3: Fallback sur l'image de projet
        else if (project.background_image) {
          imageUrl = project.background_image;
          isAnimated = false; // Force pas d'animation pour le fallback
          logDebug('✅ SELECTED: Project fallback background', { 
            imageUrl,
            reason: 'No backgrounds found, using project default'
          });
        }
        
        // Process image URL if needed
        if (imageUrl && !imageUrl.startsWith('http')) {
          const { data: urlData } = supabase.storage
            .from('backgrounds')
            .getPublicUrl(imageUrl);
          imageUrl = urlData.publicUrl;
        }
        
        // Process video URL if needed
        if (videoUrl && !videoUrl.startsWith('http')) {
          const { data: urlData } = supabase.storage
            .from('backgrounds')
            .getPublicUrl(videoUrl);
          videoUrl = urlData.publicUrl;
        }
        
        // 5. Set final background state
        setBackground({
          imageUrl,
          videoUrl,
          isAnimated,
          color: project.primary_color || '#000000',
          loading: false,
          error: null
        });
        
        logDebug('🎯 FINAL SELECTION (photobooth-boomerang)', {
          pageType: isMainPage ? 'MAIN PAGE (page.tsx)' : 'SUB-PAGE',
          imageUrl,
          videoUrl,
          isAnimated,
          isMobile,
          orientation: isMobile ? 'portrait/mobile' : 'landscape/desktop',
          videoAllowed: isMainPage,
          actualResult: isAnimated ? 'VIDEO BACKGROUND' : 'IMAGE BACKGROUND'
        });
        
      } catch (error) {
        console.error('Error loading background:', error);
        setBackground(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    }
    
    loadBackground();
  }, [slug, supabase, pathname, isMainPage, isMobile]);

  // Handle video loading errors
  useEffect(() => {
    if (videoRef.current && background.videoUrl) {
      const video = videoRef.current;
      
      const handleVideoError = (e) => {
        console.error('❌ Video error:', e);
        console.error('❌ Video error details:', e.target.error);
        // If video fails, fall back to just showing the image
        setBackground(prev => ({
          ...prev,
          isAnimated: false,
          error: `Video failed to load: ${e.target.error?.message || 'Unknown error'}`
        }));
      };

      const handleVideoLoaded = () => {
        console.log('✅ Video loaded successfully:', background.videoUrl);
        console.log('✅ Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      };

      const handleVideoCanPlay = () => {
        console.log('✅ Video can start playing');
      };
      
      video.addEventListener('error', handleVideoError);
      video.addEventListener('loadeddata', handleVideoLoaded);
      video.addEventListener('canplay', handleVideoCanPlay);
      
      return () => {
        if (video) {
          video.removeEventListener('error', handleVideoError);
          video.removeEventListener('loadeddata', handleVideoLoaded);
          video.removeEventListener('canplay', handleVideoCanPlay);
        }
      };
    }
  }, [background.videoUrl]);

  return (
    <>
      {/* Video Background Layer - PRIORITÉ ABSOLUE (z-index le plus élevé) */}
      {background.isAnimated && background.videoUrl && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          zIndex: 1, // Plus élevé que l'image
          backgroundColor: 'black'
        }}>
          <video
            ref={videoRef}
            key={background.videoUrl} // Force reload if URL changes
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          >
            <source src={background.videoUrl} type="video/mp4" />
          </video>
        </div>
      )}
      
      {/* Background Image Layer - FALLBACK (z-index plus bas) */}
      {background.imageUrl && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 0, // Plus bas que la vidéo
              backgroundImage: `url('${background.imageUrl}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          
          {/* Fallback direct image - ne s'affiche que si pas de vidéo */}
          <img 
            src={background.imageUrl}
            alt="Background"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0.5,
              opacity: background.isAnimated ? 0 : 0.9, // Cachée si vidéo active
              display: background.isAnimated ? 'none' : 'block' // Complètement cachée si vidéo
            }}
          />
        </>
      )}
      
      {/* Overlay Layer */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          zIndex: 2 // Au-dessus de tout le fond
        }}
      />
      
      {/* Content Layer */}
      <div style={{ position: 'relative', zIndex: 3 }}>
        {children}
      </div>
      
      {/* Debug component */}
      <BackgroundDebugger 
        backgroundUrl={background.imageUrl} 
        projectData={debugData.project} 
        backgroundsData={debugData.backgrounds} 
      />
    </>
  );
}
