'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useQRCode } from 'next-qrcode';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';

// Logging helper
const logWithTimestamp = (message, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data || '');
};

// S3 client for image uploads
const s3Client = new S3Client({
  region: 'eu-west-3',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  },
});

export default function Result({ params }) {
  const slug = params.slug;
  const supabase = createClientComponentClient();
  const { Canvas } = useQRCode();
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [imageResultAI, setImageResultAI] = useState(null);
  const [generateQR, setGenerateQR] = useState(false);
  const [linkQR, setLinkQR] = useState(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const fetchProjectData = useCallback(async () => {
    try {
      // Fetch project data by slug
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (projectError || !projectData) {
        console.error('Project not found or inactive:', projectError);
        return notFound();
      }
      
      setProject(projectData);
      
      // Fetch project settings
      const { data: settingsData } = await supabase
        .from('project_settings')
        .select('*')
        .eq('project_id', projectData.id)
        .single();
      
      const projectSettings = settingsData || { enable_qr_codes: true };
      setSettings(projectSettings);
      
      // Store project info in localStorage
      localStorage.setItem('currentProjectId', projectData.id);
      localStorage.setItem('currentProjectSlug', slug);
      localStorage.setItem('projectData', JSON.stringify(projectData));
      localStorage.setItem('projectSettings', JSON.stringify(projectSettings));
      
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  }, [slug, supabase]);
  
  useEffect(() => {
    // Load project data and settings from localStorage
    const cachedProject = localStorage.getItem('projectData');
    const cachedSettings = localStorage.getItem('projectSettings');
    const resultImage = localStorage.getItem('faceURLResult');
    
    if (cachedProject) {
      try {
        setProject(JSON.parse(cachedProject));
        setLoading(false);
      } catch (e) {
        console.error("Error parsing cached project data:", e);
      }
    }
    
    if (cachedSettings) {
      try {
        setSettings(JSON.parse(cachedSettings));
      } catch (e) {
        console.error("Error parsing cached settings:", e);
      }
    }
    
    if (resultImage) {
      setImageResultAI(resultImage);
    }
    
    // Check URL params for direct sharing links
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const imageUrl = urlParams.get('imageUrl');
      if (imageUrl) {
        setLinkQR(imageUrl);
        setGenerateQR(true);
      }
    }
    
    // Always fetch fresh data
    fetchProjectData();
    
    // Log any available metadata
    const falMetadata = localStorage.getItem('falGenerationMetadata');
    if (falMetadata) {
      try {
        logWithTimestamp('fal.ai generation metadata:', JSON.parse(falMetadata));
      } catch (e) {
        console.error("Error parsing metadata:", e);
      }
    }
  }, [fetchProjectData]);
  
  const handleShare = async () => {
    if (!imageResultAI) {
      setError("Aucune image à partager");
      return;
    }
    
    setLoadingUpload(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Upload to S3
      const s3Url = await uploadToS3(imageResultAI);
      
      if (s3Url) {
        // Update session record with S3 URL
        try {
          await supabase.from('sessions')
            .update({ result_s3_url: s3Url })
            .eq('result_image_url', imageResultAI);
        } catch (dbError) {
          console.error("Error updating session:", dbError);
        }
        
        setLinkQR(s3Url);
        setGenerateQR(true);
        setSuccess("Image prête à être partagée !");
      } else {
        throw new Error("Échec de l'upload de l'image");
      }
    } catch (error) {
      console.error("Error sharing image:", error);
      setError(error.message);
    } finally {
      setLoadingUpload(false);
    }
  };
  
  const uploadToS3 = async (imageUrl) => {
  logWithTimestamp('Starting S3 upload for:', imageUrl.substring(0, 100) + '...');
  
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Récupérer les données complètes du projet pour garantir l'ID complet
    let projectName = project?.name || 'unknown-project';
    let projectOwner = 'unknown-user';
    let fullProjectId = project.id; // Assurez-vous d'avoir l'ID complet ici
    
    // Important: Vérifiez que l'ID du projet est complet
    console.log('ID du projet utilisé pour S3:', fullProjectId);
    
    // Sanitize project name for filename
    projectName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    // Récupérer l'ID de l'utilisateur qui a créé le projet
    try {
      // ... reste du code inchangé ...
    } catch (error) {
      console.error('Error fetching project owner:', error);
    }
    
    // Structure du nom de fichier 
    const fileName = `photobooth-premium-${fullProjectId}-${projectName}-${projectOwner}-${Date.now()}.jpg`;
    
    // S3 upload parameters - Assurez-vous que le même ID complet est utilisé
    const uploadParams = {
      Bucket: 'leeveostockage',
      Key: `projects/${fullProjectId}/${fileName}`, 
      Body: buffer,
      ContentType: 'image/jpeg',
      Metadata: {
        'project-id': fullProjectId, // ID complet ici aussi
        'project-name': project.name,
        'project-slug': slug,
        'created-by': projectOwner
      }
    };
    
    // Upload to S3
    const result = await s3Client.send(new PutObjectCommand(uploadParams));
    
    // Generate public URL
    const s3Url = `https://${uploadParams.Bucket}.s3.eu-west-3.amazonaws.com/${uploadParams.Key}`;
    
    // Enregistrer dans project_images avec l'ID complet
    try {
      const insertResult = await supabase.from('project_images').insert([{
        project_id: fullProjectId, // ID complet crucial ici
        image_url: s3Url,
        created_at: new Date().toISOString(),
        metadata: {
          fileName: fileName,
          projectName: project.name,
          projectSlug: slug
        }
      }]);
      
      console.log('Résultat insertion project_images:', insertResult);
    } catch (dbError) {
      console.error("Error saving image reference to database:", dbError);
    }
    
    return s3Url;
  } catch (error) {
    logWithTimestamp('Error uploading to S3:', error);
    throw error;
  }
};
  const handleStartOver = () => {
    // Clear result data
    localStorage.removeItem('faceURLResult');
    localStorage.removeItem('resulAIBase64');
  };
  
  if (loading) {
    return (
      <div className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return notFound();
  }

  // Dynamic styles based on project colors
  const primaryColor = project.primary_color || '#811A53';
  const secondaryColor = project.secondary_color || '#E5E40A';

  return (
    <main 
      className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-20 px-5"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="fixed top-0 mx-auto w-[65%] mt-4">
        {project.logo_url ? (
          <Image 
            src={project.logo_url} 
            width={607} 
            height={168} 
            alt={project.name} 
            className='w-full' 
            priority 
          />
        ) : (
          <h1 
            className="text-xl font-bold text-center" 
            style={{ color: secondaryColor }}
          >
            {project.name}
          </h1>
        )}
      </div>

      {/* QR Code Sharing Overlay */}
      {generateQR && (
        <div className="fixed inset-0 z-40 flex items-center justify-center flex-col bg-black bg-opacity-80">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-center">Scannez le QR Code</h2>
            
            <div className="flex justify-center mb-4">
              <div className="border-4 border-black p-2 bg-white">
                <Canvas
                  text={linkQR}
                  options={{
                    errorCorrectionLevel: 'M',
                    margin: 3,
                    scale: 4,
                    width: 250,
                    color: {
                      dark: '#000000',
                      light: '#ffffff',
                    },
                  }}
                />
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-6 text-center">
              Utilisez votre téléphone pour scanner ce code et récupérer votre photo
            </p>
            
            <div className="text-xs text-gray-500 max-h-32 overflow-auto p-2 bg-gray-50 mb-4 rounded">
              {project.privacy_notice || (
                <>
                  <p className="font-bold">INFORMATION SUR LA PROTECTION DES DONNÉES (RGPD)</p>
                  <p>Photo générée via intelligence artificielle. Les images sont conservées 7 jours maximum.</p>
                </>
              )}
            </div>
            
            <button
              onClick={() => setGenerateQR(false)}
              className="w-full py-2 text-center font-medium rounded"
              style={{ backgroundColor: primaryColor, color: 'white' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-full mx-auto mt-[15vh] mb-8">
        <h2 
          className="text-xl font-bold text-center mb-6"
          style={{ color: secondaryColor }}
        >
          Votre photo est prête !
        </h2>
        
        {error && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded-lg">
            {success}
          </div>
        )}
        
        {/* Result Image Display - Full Size Container */}
        {imageResultAI ? (
          <div className="relative mx-auto flex items-center justify-center" style={{ width: '100%' }}>
            <Image 
              src={imageResultAI} 
              width={1200} 
              height={1600} 
              alt="Résultat"
              className="w-auto h-auto rounded-lg shadow-2xl" 
              priority
              onError={(e) => {
                console.error("Error loading image:", e);
                setError("Impossible de charger l'image");
              }}
              style={{
                maxHeight: '75vh', // Increased to take up more vertical space
                maxWidth: '100%',
                objectFit: 'contain',
                display: 'block' // Ensures no extra space around the image
              }}
            />
          </div>
        ) : (
          <div className="p-8 bg-white bg-opacity-10 rounded-lg text-white text-center">
            Aucune image généré. Veuillez recommencer le processus.
          </div>
        )}
        
        {/* Action Buttons - Modern redesign with narrower width */}
        <div className="mt-8 flex flex-col items-center space-y-4">
          {settings?.enable_qr_codes && imageResultAI && (
            <motion.button 
              onClick={handleShare}
              disabled={loadingUpload}
              className={`py-3 px-8 rounded-xl font-bold text-center flex items-center justify-center gap-2 max-w-[240px] w-full shadow-lg ${loadingUpload ? 'opacity-70' : ''}`}
              style={{ 
                backgroundColor: secondaryColor, 
                color: primaryColor,
                boxShadow: `0 4px 14px rgba(${parseInt(secondaryColor.slice(1, 3), 16)}, ${parseInt(secondaryColor.slice(3, 5), 16)}, ${parseInt(secondaryColor.slice(5, 7), 16)}, 0.3)`
              }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              {loadingUpload ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>PRÉPARATION...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>PARTAGER MA PHOTO</span>
                </>
              )}
            </motion.button>
          )}
          
          <motion.div
            className="w-full max-w-[240px]"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link 
              href={`/photobooth-premium/${slug}`}
              onClick={handleStartOver}
              className="py-3 px-8 rounded-xl font-medium text-center bg-white bg-opacity-20 hover:bg-opacity-30 text-white transition-all flex items-center justify-center gap-2 w-full backdrop-blur-sm"
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>RECOMMENCER</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
