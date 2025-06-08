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
  const [backgroundInfo, setBackgroundInfo] = useState({
    url: null,
    color: '#000000',
    loading: true,
    error: null
  });
  const [debugData, setDebugData] = useState({
    projectData: null,
    backgroundsData: []
  });
  const bgContainerRef = useRef(null);
  const [directImageVisible, setDirectImageVisible] = useState(false);
  const slug = params.slug;
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchBackground() {
      console.log('🔍 Fetching background for slug:', slug);
      
      try {
        // 1. Get project data
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, background_image, primary_color')
          .eq('slug', slug)
          .single();
          
        if (projectError) {
          throw projectError;
        }
        
        console.log('📋 Project data:', projectData);
        
        // 2. Get backgrounds from backgrounds table
        const { data: backgroundsData, error: backgroundsError } = await supabase
          .from('backgrounds')
          .select('*')
          .eq('project_id', projectData.id)
          .eq('is_active', true);
          
        if (backgroundsError) {
          throw backgroundsError;
        }
        
        console.log(`📋 Found ${backgroundsData?.length || 0} backgrounds:`, backgroundsData);
        
        // 3. Determine which background to use
        let backgroundUrl = null;
        
        if (backgroundsData && backgroundsData.length > 0) {
          // Use a random background from the backgrounds table
          const randomIndex = Math.floor(Math.random() * backgroundsData.length);
          backgroundUrl = backgroundsData[randomIndex].image_url;
          
          // Handle case where the URL might be a relative path
          if (backgroundUrl && !backgroundUrl.startsWith('http')) {
            // Try to get the full URL
            const { data: urlData } = supabase.storage
              .from('backgrounds')
              .getPublicUrl(backgroundUrl);
            
            backgroundUrl = urlData.publicUrl;
          }
          
          console.log('🎯 Selected background URL:', backgroundUrl);
        } else if (projectData.background_image) {
          // Fallback to project's background image
          backgroundUrl = projectData.background_image;
          
          // Handle case where the URL might be a relative path
          if (backgroundUrl && !backgroundUrl.startsWith('http')) {
            // Try to get the full URL
            const { data: urlData } = supabase.storage
              .from('backgrounds')
              .getPublicUrl(backgroundUrl);
            
            backgroundUrl = urlData.publicUrl;
          }
          
          console.log('🎯 Using project background URL:', backgroundUrl);
        }
        
        // Store debug data
        setDebugData({
          projectData,
          backgroundsData
        });
        
        // 4. Update background state
        setBackgroundInfo({
          url: backgroundUrl,
          color: projectData.primary_color || '#000000',
          loading: false,
          error: null
        });
        
        // 5. Force direct application of background to the DOM
        setTimeout(() => {
          if (bgContainerRef.current && backgroundUrl) {
            console.log('Directly applying background:', backgroundUrl);
            bgContainerRef.current.style.cssText = `background-image: url('${backgroundUrl}') !important; background-size: cover !important; background-position: center !important;`;
            
            // Set a flag to show the direct image fallback
            setDirectImageVisible(true);
            
            // Preload the image
            const preloadImg = new window.Image();
            preloadImg.src = backgroundUrl;
          }
        }, 500);
      } catch (error) {
        console.error('❌ Error fetching background:', error);
        setBackgroundInfo(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    }
    
    fetchBackground();
  }, [slug, supabase]);

  // Apply background to all pages including the main page
  // Previously this was skipping the main page with:
  // if (pathname === `/photobooth-premium/${slug}`) {
  //   return children;
  // }

  return (
    <>
      {/* SUPER DIRECT BACKGROUND APPROACH */}
      <div 
        id="debug-background-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: backgroundInfo.url ? `url('${backgroundInfo.url}')` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      ></div>
      
      {/* ALTERNATIVE BACKUP METHOD - Direct img tag */}
      {backgroundInfo.url && (
        <img 
          src={backgroundInfo.url}
          alt="Background"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1,
            opacity: 0.9
          }}
        />
      )}
      
      {/* Overlay for readability */}
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
      ></div>
      
      {/* Content container */}
      <div style={{ position: 'relative', zIndex: 3 }}>
        {children}
      </div>
    </>
  );
}
