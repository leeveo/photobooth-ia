'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function MosaicLayout({ children }) {
  const searchParams = useSearchParams();
  const wantsFullscreen = searchParams.get('fullscreen') === 'true';
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Set document title programmatically since we can't export metadata from client components
    document.title = 'Mosaïque de photos';
    
    // Check if we should display in standalone mode (without admin layout)
    setIsStandalone(wantsFullscreen);
    
    // Apply fullscreen-friendly styles when needed
    if (wantsFullscreen) {
      // Override the admin layout styles when in fullscreen mode
      document.body.classList.add('mosaic-fullscreen-mode');
      
      // Listen for fullscreen change to adjust styles
      const handleFullscreenChange = () => {
        if (document.fullscreenElement) {
          document.body.classList.add('mosaic-in-fullscreen');
        } else {
          document.body.classList.remove('mosaic-in-fullscreen');
        }
      };
      
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.body.classList.remove('mosaic-fullscreen-mode', 'mosaic-in-fullscreen');
      };
    }
  }, [wantsFullscreen]);

  // When in standalone mode, apply styles that override the admin layout
  if (isStandalone) {
    return (
      <div className="mosaic-container-standalone">
        <style jsx global>{`
          /* Override admin layout when in fullscreen mode */
          body.mosaic-fullscreen-mode {
            overflow: hidden !important;
          }
          body.mosaic-fullscreen-mode .admin-sidebar,
          body.mosaic-fullscreen-mode .admin-header,
          body.mosaic-fullscreen-mode .admin-footer {
            display: none !important;
          }
          body.mosaic-fullscreen-mode main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          body.mosaic-in-fullscreen .mosaic-container-standalone {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            background-color: black;
          }
        `}</style>
        {children}
      </div>
    );
  }

  // Regular mode inside admin layout
  return <div className="mosaic-container">{children}</div>;
}