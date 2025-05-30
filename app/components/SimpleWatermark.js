'use client';

import { useState, useEffect, useRef } from 'react';
import Image from "next/image";

/**
 * Composant simple pour afficher un aperçu de filigrane
 */
export default function SimpleWatermark({ project, imageUrl }) {
  const [watermarkElements, setWatermarkElements] = useState(null);
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (project) {
      // Essayer de charger les éléments avancés du filigrane
      if (project.watermark_elements) {
        try {
          const elements = JSON.parse(project.watermark_elements);
          if (Array.isArray(elements) && elements.length > 0) {
            setWatermarkElements(elements);
            return;
          }
        } catch (e) {
          console.error('Erreur lors de la lecture des éléments de filigrane:', e);
        }
      }
      
      // Fallback: créer des éléments à partir des options de base
      const elements = [];
      
      // Ajouter le texte s'il existe
      if (project.watermark_text && project.watermark_enabled) {
        const textPosition = project.watermark_text_position || project.watermark_position || 'bottom-right';
        elements.push({
          id: 'text-1',
          type: 'text',
          text: project.watermark_text,
          color: project.watermark_text_color || '#FFFFFF',
          fontSize: project.watermark_text_size || 24,
          fontFamily: 'Arial',
          x: textPosition.includes('right') ? 250 : 20,
          y: textPosition.includes('bottom') ? 280 : 40
        });
      }
      
      // Ajouter le logo s'il existe
      if (project.watermark_logo_url && project.watermark_enabled) {
        const logoPosition = project.watermark_position || 'bottom-right';
        elements.push({
          id: 'logo-1',
          type: 'logo',
          src: project.watermark_logo_url,
          width: 80,
          height: 80,
          opacity: project.watermark_opacity || 0.8,
          x: logoPosition.includes('right') ? 250 : 20,
          y: logoPosition.includes('bottom') ? 200 : 20
        });
      }
      
      setWatermarkElements(elements);
    }
  }, [project]);
  
  // Rendu simple d'un aperçu de filigrane
  return (
    <div className="relative bg-gray-200 rounded overflow-hidden" style={{ width: "300px", height: "400px" }}>
      {/* Image de base ou placeholder */}
      {imageUrl ? (
        <Image 
          src={imageUrl} 
          alt="Preview" 
          fill
          style={{ objectFit: "cover" }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6 6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      
      {/* Éléments de filigrane */}
      {watermarkElements?.map(element => {
        if (element.type === 'text') {
          return (
            <div 
              key={element.id}
              className="absolute"
              style={{
                left: element.x,
                top: element.y,
                color: element.color,
                fontSize: `${element.fontSize * 0.5}px`, // Scale down for preview
                fontFamily: element.fontFamily,
                opacity: project.watermark_opacity || 0.8
              }}
            >
              {element.text}
            </div>
          );
        } else if (element.type === 'logo' && element.src) {
          return (
            <div 
              key={element.id}
              className="absolute"
              style={{
                left: element.x,
                top: element.y,
                opacity: element.opacity || 0.8
              }}
            >
              <Image 
                src={element.src}
                width={element.width * 0.5 || 50} // Scale down for preview
                height={element.height * 0.5 || 50} // Scale down for preview
                alt="Watermark logo"
              />
            </div>
          );
        }
        return null;
      })}
      
      {/* Message quand le filigrane est désactivé */}
      {(!project?.watermark_enabled || !watermarkElements || watermarkElements.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          Filigrane désactivé
        </div>
      )}
    </div>
  );
}
