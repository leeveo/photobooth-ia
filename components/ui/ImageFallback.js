'use client';

import React, { useState } from 'react';

export default function ImageFallback({ 
  src, 
  alt, 
  className = '',
  style = {},
  fallbackSrc = '/placeholder-style.png',
  showError = false
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);

  const handleError = () => {
    console.error(`Failed to load image: ${src}`);
    setImgSrc(fallbackSrc);
    setError(true);
  };

  return (
    <div className="relative w-full h-full">
      <img
        src={imgSrc}
        alt={alt}
        className={className}
        style={style}
        onError={handleError}
      />
      {error && showError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80 text-xs text-red-500 p-1 text-center">
          Impossible de charger l'image
        </div>
      )}
    </div>
  );
}
