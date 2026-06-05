'use client';

import { useEffect, useState, useCallback } from 'react';
import { printImageToAirPrint } from '../../../../utils/clientPrint';
import Image from "next/image";
import Link from 'next/link';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useQRCode } from 'next-qrcode';
import { notFound } from 'next/navigation';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [imageResultAI, setImageResultAI] = useState(null);
  const [generateQR, setGenerateQR] = useState(false);
  const [linkQR, setLinkQR] = useState(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // États pour la capture de données
  const [showDataCapture, setShowDataCapture] = useState(false);
  const [dataCapture, setDataCapture] = useState({
    name: '',
    email: '',
    phone: '',
    rgpdAccepted: false
  });
  const [savingDataCapture, setSavingDataCapture] = useState(false);
  
  // États pour l'impression
  const [printing, setPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [printError, setPrintError] = useState(false);
  const [showPrintPopup, setShowPrintPopup] = useState(false);
  const [printCopies, setPrintCopies] = useState(1);
  
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
  }, []);
  
  // First, ensure fetchProjectData is wrapped in useCallback with proper dependencies
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
  
  // Fix missing fetchProjectData dependency in useEffect at line 92
  useEffect(() => {
    // ...existing code...
    fetchProjectData();
  }, [fetchProjectData]); // Add fetchProjectData to dependency array
  
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
    const fileName = `photobooth2-${fullProjectId}-${projectName}-${projectOwner}-${Date.now()}.jpg`;
    
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
  
  const handleRestart = useCallback(() => {
    // Clear result data
    localStorage.removeItem('faceURLResult');
    localStorage.removeItem('resulAIBase64');
    
    // Navigate to the slug page
    router.push(`/photobooth2/${slug}`);
  }, [router, slug]); // Include slug in dependencies
  
  // Fonction pour ouvrir le popup d'impression
  const handlePrint = () => {
    // Afficher le popup d'impression en cours
    setShowPrintPopup(true);
    setPrinting(true);
    setPrintError(false);
    
    console.log('🖨️ Impression en cours via le serveur print-monitor...');
    
    // Fermer automatiquement le popup après 5 secondes et rediriger vers l'accueil
    setTimeout(() => {
      setShowPrintPopup(false);
      setPrinting(false);
      // Redirection vers la page d'accueil du photobooth
      window.location.href = `/photobooth2/${slug}/`;
    }, 5000);
  };
  
  // Fonction handleConfirmPrint supprimée - l'impression se fait maintenant via print-monitor
  
  if (loading) {
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

      <div className="w-full max-w-2xl mx-auto mt-[15vh] mb-8">
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
        
        {/* Result Image Display */}
        {imageResultAI ? (
          <div className="relative mx-auto max-w-sm">
            <Image 
              src={imageResultAI} 
              width={500} 
              height={750} 
              alt="Résultat"
              className="w-full rounded-lg shadow-lg" 
              priority
              onError={(e) => {
                console.error("Error loading image:", e);
                setError("Impossible de charger l'image");
              }}
            />
          </div>
        ) : (
          <div className="p-8 bg-white bg-opacity-10 rounded-lg text-white text-center">
            Aucune image généré. Veuillez recommencer le processus.
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="mt-8 flex flex-col space-y-4">
          {settings?.enable_qr_codes && imageResultAI && (
            <button 
              onClick={handleShare}
              disabled={loadingUpload}
              className={`py-3 rounded-lg font-bold text-center ${loadingUpload ? 'opacity-70' : ''}`}
              style={{ backgroundColor: secondaryColor, color: primaryColor }}
            >
              {loadingUpload ? 'PRÉPARATION...' : 'PARTAGER MA PHOTO'}
            </button>
          )}
          
          {/* Bouton Imprimer */}
          {project?.printer_enabled && imageResultAI && (
            <button
              onClick={handlePrint}
              disabled={printing}
              className={`py-3 rounded-lg font-bold text-center flex items-center justify-center gap-2 ${printing ? 'opacity-70' : ''}`}
              style={{
                background: printing
                  ? 'linear-gradient(135deg, rgba(107, 114, 128, 0.5), rgba(156, 163, 175, 0.5))'
                  : printSuccess
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(74, 222, 128, 0.9))'
                  : 'linear-gradient(135deg, rgba(107, 114, 128, 0.9), rgba(156, 163, 175, 0.9))',
                color: '#fff'
              }}
            >
              {printing ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  IMPRESSION...
                </>
              ) : printSuccess ? (
                <>
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  ENVOYÉ !
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  IMPRIMER MA PHOTO
                </>
              )}
            </button>
          )}
          
          <Link 
            href={`/photobooth2/${slug}`}
            onClick={handleStartOver}
            className="py-3 rounded-lg font-medium text-center bg-white bg-opacity-20 text-white"
          >
            RECOMMENCER
          </Link>
        </div>
      </div>

      {/* Popup d'impression avec glassmorphisme */}
      {showPrintPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={() => !printing && setShowPrintPopup(false)}
        >
          <div
            className="relative max-w-lg w-full rounded-3xl p-12 shadow-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton fermer */}
            {!printing && (
              <button
                onClick={() => setShowPrintPopup(false)}
                className="absolute top-6 right-6 p-3 rounded-full transition-all hover:bg-gray-100"
                style={{
                  background: 'rgba(107, 114, 128, 0.1)'
                }}
              >
                <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Contenu du popup */}
            <div className="text-center">
              {/* Icône imprimante */}
              <div className="mx-auto w-24 h-24 mb-8 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(107, 114, 128, 0.15)'
                }}
              >
                <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </div>

              {printError ? (
                // Message d'erreur
                <>
                  <h3 className="text-3xl font-bold text-gray-800 mb-4">
                    Oops ! 😕
                  </h3>
                  <p className="text-gray-600 text-lg mb-4">
                    L'imprimante a un problème
                  </p>
                  <p className="text-gray-700 font-semibold text-lg mb-8">
                    Envoyez votre photo plutôt par email
                  </p>
                  <button
                    onClick={() => {
                      setShowPrintPopup(false);
                      setPrintError(false);
                    }}
                    className="w-full py-5 px-8 rounded-xl font-semibold text-white text-lg transition-all shadow-lg hover:shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, #6B7280, #9CA3AF)'
                    }}
                  >
                    Fermer
                  </button>
                </>
              ) : printSuccess ? (
                // Message de succès
                <>
                  <div className="mb-6">
                    <svg className="w-20 h-20 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-4">
                    Impression envoyée ! ✨
                  </h3>
                  <p className="text-gray-600 text-lg">
                    Votre photo est en cours d'impression
                  </p>
                </>
              ) : printing ? (
                // Animation impression en cours
                <>
                  <div className="mb-8">
                    <svg className="animate-spin h-20 w-20 text-gray-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-4">
                    Impression en cours...
                  </h3>
                  <p className="text-gray-600 text-lg">
                    Veuillez patienter quelques instants
                  </p>
                </>
              ) : (
                // Sélection du nombre de copies
                <>
                  <h3 className="text-3xl font-bold text-gray-800 mb-4">
                    Imprimer votre photo
                  </h3>
                  <p className="text-gray-600 text-lg mb-8">
                    Choisissez le nombre d'exemplaires
                  </p>

                  {/* Sélecteur de copies */}
                  <div className="flex items-center justify-center gap-8 mb-10">
                    <button
                      onClick={() => setPrintCopies(Math.max(1, printCopies - 1))}
                      className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{
                        background: 'rgba(107, 114, 128, 0.1)',
                        border: '2px solid rgba(107, 114, 128, 0.3)'
                      }}
                    >
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                      </svg>
                    </button>

                    <div className="text-7xl font-bold text-gray-700 w-32 text-center">
                      {printCopies}
                    </div>

                    <button
                      onClick={() => setPrintCopies(Math.min(2, printCopies + 1))}
                      className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{
                        background: 'rgba(107, 114, 128, 0.1)',
                        border: '2px solid rgba(107, 114, 128, 0.3)'
                      }}
                    >
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  {/* Bouton imprimer */}
                  <button
                    onClick={handleConfirmPrint}
                    className="w-full py-6 px-8 rounded-xl font-semibold text-white text-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #6B7280, #9CA3AF)'
                    }}
                  >
                    <span className="flex items-center justify-center gap-3">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Lancer l'impression
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
