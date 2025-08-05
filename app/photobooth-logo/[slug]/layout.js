'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Debug component - keep as is
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
  
  const [debugData, setDebugData] = useState(null);
  const videoRef = useRef(null);
  const slug = params.slug;
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  // Check if we're on the main page (only show video on main page)
  // Main page: /photobooth-logo/[slug] 
  // Sub-pages: /photobooth-logo/[slug]/cam, /photobooth-logo/[slug]/how, etc.
  const pathSegments = pathname.split('/').filter(Boolean);
  const isMainPage = pathSegments.length === 2 && pathSegments[0] === 'photobooth-logo' && pathSegments[1] === slug;
  
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
        const animatedBackgrounds = backgrounds.filter(bg => 
          bg.show_animated === true && bg.video_url && bg.video_url.trim() !== ''
        );
        
        logDebug('Animated backgrounds', animatedBackgrounds);
        
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
          videoUrl = selectedBackground.video_url;
          imageUrl = selectedBackground.image_url || null;
          logDebug('Selected animated background (main page)', selectedBackground);
        } 
        // Otherwise use a regular background (for sub-pages or when no video available)
        else if (backgrounds.length > 0) {
          const randomIndex = Math.floor(Math.random() * backgrounds.length);
          selectedBackground = backgrounds[randomIndex];
          imageUrl = selectedBackground.image_url;
          logDebug('Selected regular background (sub-page or no video)', selectedBackground);
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
        
        logDebug('Final background settings', {
          imageUrl,
          videoUrl,
          isAnimated
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
  }, [slug, supabase, pathname, isMainPage]);

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