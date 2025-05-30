'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function WatermarkPreview({ projectId }) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [watermarkElements, setWatermarkElements] = useState([]);
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);
  const [sampleImageUrl, setSampleImageUrl] = useState('/samples/sample-portrait-1.jpg');

  useEffect(() => {
    if (!projectId) return;
    
    const fetchWatermarkData = async () => {
      setLoading(true);
      try {
        // Récupérer les données de base du projet
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projectError) throw new Error('Projet non trouvé');
        setProject(projectData);

        // Analyser les éléments du filigrane
        if (projectData.watermark_elements) {
          try {
            const elements = JSON.parse(projectData.watermark_elements);
            if (Array.isArray(elements)) {
              setWatermarkElements(elements);
            }
          } catch (e) {
            console.error('Erreur lors de la lecture des éléments de filigrane:', e);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données du filigrane:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWatermarkData();
  }, [projectId, supabase]);

  // Fonction pour changer l'image d'échantillon
  const changeSampleImage = () => {
    const samples = [
      '/samples/sample-portrait-1.jpg',
      '/samples/sample-group-1.jpg',
      '/samples/sample-landscape-1.jpg'
    ];
    const currentIndex = samples.indexOf(sampleImageUrl);
    const nextIndex = (currentIndex + 1) % samples.length;
    setSampleImageUrl(samples[nextIndex]);
  };

  if (loading) {
    return (
      <div className="h-56 flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-56 flex items-center justify-center bg-red-50 rounded-lg text-center p-4">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div 
        className="relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
        style={{ height: '400px' }}
        onClick={changeSampleImage}
      >
        {/* Image d'échantillon */}
        <Image
          src={sampleImageUrl}
          alt="Sample image"
          fill
          className="object-cover"
        />

        {/* Éléments de filigrane */}
        {project?.watermark_enabled && watermarkElements.map((element) => (
          <div 
            key={element.id}
            className="absolute"
            style={{
              left: `${(element.x / 800) * 100}%`, // Conversion en pourcentage pour un placement proportionnel
              top: `${(element.y / 600) * 100}%`
            }}
          >
            {element.type === 'text' && (
              <div style={{
                color: element.color || '#FFFFFF',
                fontSize: element.fontSize / 2, // Scaled down for preview
                fontFamily: element.fontFamily || 'Arial'
              }}>
                {element.text}
              </div>
            )}

            {element.type === 'logo' && element.src && (
              <div style={{ opacity: element.opacity || 0.8 }}>
                <Image
                  src={element.src}
                  alt="Logo watermark"
                  width={element.width / 2}
                  height={element.height / 2}
                />
              </div>
            )}
          </div>
        ))}

        {/* Message quand filigrane désactivé */}
        {(!project?.watermark_enabled || watermarkElements.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
            <div className="text-white text-center p-4">
              <span className="font-medium">
                {project?.watermark_enabled 
                  ? "Aucun élément de filigrane configuré. Utilisez l&apos;éditeur avancé pour en ajouter."
                  : "Le filigrane est désactivé pour ce projet."}
              </span>
            </div>
          </div>
        )}

        {/* Instruction pour changer d'image */}
        <div className="absolute bottom-2 left-2 right-2 text-center bg-black bg-opacity-50 text-white text-xs py-1 rounded">
          Cliquez pour changer d&apos;image d&apos;exemple
        </div>
      </div>
    </div>
  );
}
