'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function ImageWithFallback({ 
  src, 
  alt, 
  fallbackSrc = '/placeholder-style.png',
  ...props 
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);

  return (
    <>
      <Image
        {...props}
        src={imgSrc}
        alt={alt}
        onError={() => {
          setError(true);
          setImgSrc(fallbackSrc);
        }}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 bg-gray-100 bg-opacity-70 z-0">
          <span className="bg-white px-1 py-0.5 rounded">{alt || 'Image non disponible'}</span>
        </div>
      )}
    </>
  );
}
