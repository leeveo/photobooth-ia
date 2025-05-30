"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export default function GalleryPage({ params }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchImages() {
      try {
        // Use the slug from params to fetch the correct images
        const response = await fetch(`/api/gallery-images/${params.slug}`);
        if (!response.ok) {
          throw new Error('Failed to fetch images');
        }
        const data = await response.json();
        setImages(data.images || []);
      } catch (error) {
        console.error('Error fetching gallery images:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchImages();
  }, [params.slug]);
  
  if (loading) {
    return <div className="loading">Chargement des images...</div>;
  }
  
  return (
    <div className="gallery-container">
      {images.map((image, index) => (
        <div key={image.id || index} className="image-container">
          {/* Display image */}
          <div className="relative w-full h-auto">
            <Image 
              src={image.image_url}
              alt={`Photo ${index}`}
              width={640}
              height={480}
              className="object-cover"
            />
          </div>
          
          {/* Download/share link */}
          <a
            href={image.metadata?.watermarked_url || image.image_url} // Use watermarked version if available
            download
            className="download-button"
          >
            Télécharger
          </a>
        </div>
      ))}
      
      {images.length === 0 && !loading && (
        <div className="no-images">Aucune image trouvée</div>
      )}
    </div>
  );
}
