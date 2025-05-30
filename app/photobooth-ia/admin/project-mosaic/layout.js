'use client';

import { useEffect } from 'react';

export default function MosaicLayout({ children }) {
  useEffect(() => {
    // Set document title programmatically since we can't export metadata from client components
    document.title = 'Mosaïque de photos';
  }, []);

  return (
    <div className="mosaic-container">
      {children}
    </div>
  );
}