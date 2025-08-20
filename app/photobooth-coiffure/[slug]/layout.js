'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PremiumPhotoboothLayout({ children, params }) {
  const [background, setBackground] = useState({
    imageUrl: null,
    videoUrl: null,
    isAnimated: false,
    color: '#000000',
    loading: true,
    error: null
  });
  
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef(null);
  const slug = params.slug;
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  // Check if we're on the main page (only show video on main page)
  // Main page: /photobooth-coiffure/[slug] 
  // Sub-pages: /photobooth-coiffure/[slug]/cam, /photobooth-coiffure/[slug]/how, etc.
  const pathSegments = pathname.split('/').filter(Boolean);
  const isMainPage = pathSegments.length === 2 && pathSegments[0] === 'photobooth-coiffure' && pathSegments[1] === slug;
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Page detection:', {
      pathname,
      pathSegments,
      slug,
      isMainPage
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
        
        // 4. Select a background
        let selectedBackground;
        let isAnimated = false;
        let imageUrl = null;
        let videoUrl = null;
        
        // Only allow video on main page, force image-only on sub-pages
        if (isMainPage && animatedBackgrounds.length > 0) {
          // Prioritize animated backgrounds if available and on main page
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
          
          logDebug('Selected animated background (orientation-aware)', { 
            selectedBackground, 
            isMobile,
            videoUrl,
            imageUrl 
          });
        } 
        // Otherwise use a regular background (for sub-pages or when no video available)
        else if (backgrounds.length > 0) {
          const randomIndex = Math.floor(Math.random() * backgrounds.length);
          selectedBackground = backgrounds[randomIndex];
          
          // Select image URL based on screen orientation
          if (isMobile) {
            // Mobile: prefer vertical image, fallback to horizontal
            imageUrl = selectedBackground.image_url_vertical || selectedBackground.image_url;
          } else {
            // Desktop: prefer horizontal image, fallback to vertical
            imageUrl = selectedBackground.image_url || selectedBackground.image_url_vertical;
          }
          
          logDebug('Selected regular background (orientation-aware)', { 
            selectedBackground, 
            isMobile,
            imageUrl 
          });
        } 
        // Fallback to project background
        else if (project.background_image) {
          imageUrl = project.background_image;
          logDebug('Using project background', imageUrl);
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
        
        // ENHANCED DEBUG LOGGING
        console.log('🎬 FINAL BACKGROUND SETTINGS:', {
          imageUrl,
          videoUrl,
          isAnimated,
          isMobile,
          isMainPage,
          orientation: isMobile ? 'portrait/mobile' : 'landscape/desktop',
          animatedBackgroundsCount: animatedBackgrounds.length,
          totalBackgroundsCount: backgrounds.length
        });
        
        if (isAnimated && videoUrl) {
          console.log('✅ VIDEO SHOULD BE DISPLAYED:', videoUrl);
        } else if (imageUrl) {
          console.log('📷 IMAGE BACKGROUND:', imageUrl);
        } else {
          console.log('❌ NO BACKGROUND AVAILABLE');
        }
        
        logDebug('Final background settings (orientation-aware)', {
          imageUrl,
          videoUrl,
          isAnimated,
          isMobile,
          orientation: isMobile ? 'portrait/mobile' : 'landscape/desktop'
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
      const handleVideoError = (e) => {
        console.error('Video error:', e);
        // If video fails, fall back to just showing the image
        setBackground(prev => ({
          ...prev,
          isAnimated: false,
          error: `Video failed to load: ${e.target.error?.message || 'Unknown error'}`
        }));
      };
      
      videoRef.current.addEventListener('error', handleVideoError);
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('error', handleVideoError);
        }
      };
    }
  }, [background.videoUrl]);

  // CONSOLE LOG CURRENT BACKGROUND STATE
  console.log('🎯 CURRENT BACKGROUND STATE:', {
    loading: background.loading,
    isAnimated: background.isAnimated,
    hasVideoUrl: !!background.videoUrl,
    hasImageUrl: !!background.imageUrl,
    videoUrl: background.videoUrl,
    imageUrl: background.imageUrl,
    error: background.error,
    isMainPage,
    pathname
  });

  return (
    <>
      {/* Background Image Layer */}
      {background.imageUrl && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 0,
              backgroundImage: `url('${background.imageUrl}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          
          {/* Fallback direct image */}
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
              opacity: background.isAnimated ? 0 : 0.9 // Hide if video is playing
            }}
          />
        </>
      )}
      
      {/* Video Background Layer - Simplified for reliability */}
      {background.isAnimated && background.videoUrl && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          zIndex: 1,
          backgroundColor: 'black'
        }}>
          <video
            ref={videoRef}
            key={background.videoUrl} // Force reload if URL changes
            autoPlay
            loop
            muted
            playsInline
            onLoadStart={() => console.log('🎬 Video loading started:', background.videoUrl)}
            onCanPlay={() => console.log('✅ Video can play:', background.videoUrl)}
            onPlaying={() => console.log('▶️ Video is playing:', background.videoUrl)}
            onError={(e) => console.error('❌ Video error:', e, background.videoUrl)}
            onLoadedData={() => console.log('📹 Video data loaded:', background.videoUrl)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          >
            <source src={background.videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
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
          zIndex: 2
        }}
      />
      
      {/* Content Layer */}
      <div style={{ position: 'relative', zIndex: 3 }}>
        {children}
      </div>
    </>
  );
}