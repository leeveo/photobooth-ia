'use client';

import Replicate from "replicate";
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';

// Hook webcam with improved error handling and cleanup
let streamCam = null;
const useWebcam = ({ videoRef }) => {
  useEffect(() => {
    let isMounted = true;
    
    const initializeCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          console.log("Requesting camera access...");
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
          
          // Only set the stream if the component is still mounted
          if (isMounted) {
            console.log("Camera access granted, initializing stream");
            streamCam = stream;
            window.localStream = stream;
            
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              
              // Use try/catch around play() to handle potential AbortError
              try {
                // Using a promise to handle the play request
                await videoRef.current.play();
                console.log("Camera stream playing successfully");
              } catch (playError) {
                console.error("Error playing video stream:", playError);
                if (playError.name === "AbortError") {
                  console.warn("Video play was aborted, likely due to component unmounting");
                }
              }
            } else {
              console.warn("Video element not found when trying to initialize camera");
            }
          }
        } else {
          console.error("MediaDevices API not supported in this browser");
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    initializeCamera();
    
    // Cleanup function to stop all tracks when component unmounts
    return () => {
      isMounted = false;
      console.log("Cleaning up camera resources...");
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      if (streamCam) {
        try {
          const tracks = streamCam.getTracks();
          tracks.forEach(track => {
            track.stop();
            console.log(`Stopped track: ${track.kind}`);
          });
          streamCam = null;
          window.localStream = null;
        } catch (cleanupError) {
          console.error("Error during camera cleanup:", cleanupError);
        }
      }
    };
  }, [videoRef]);
};

export default function CameraCapture({ params }) {
  const slug = params.slug;
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const videoRef = useRef(null);
  const previewRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [styleFix, setStyleFix] = useState(null);
  const [styleGender, setStyleGender] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [resultFaceSwap, setResultFaceSwap] = useState(null);
  const [numProses, setNumProses] = useState(0);
  // Add the missing camera error state
  const [cameraError, setCameraError] = useState(null);
  
  // Fonction reset2 définie pour éviter les erreurs
  const reset2 = () => {
    setError(null);
    setLogs([]);
    setElapsedTime(0);
  };
  
  // Initialize webcam
  useWebcam({ videoRef, previewRef });
  
  // Properly memoize fetchProjectData with useCallback
  const fetchProjectData = useCallback(async () => {
    try {
      // Add retry logic to handle potential 406 errors
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Fetch project data by slug with more specific select
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, name, slug, logo_url, primary_color, secondary_color, is_active')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

          if (projectError || !projectData) {
            console.error('Project not found or inactive:', projectError);
            return notFound();
          }
          
          setProject(projectData);
          
          // Use more specific select and handle the 406 error case
          try {
            const { data: settingsData } = await supabase
              .from('project_settings')
              .select('show_countdown, max_processing_time')
              .eq('project_id', projectData.id)
              .single();
            
            // Handle the case if settings are found
            if (settingsData) {
              setSettings(settingsData);
            } else {
              // Use default settings if none found
              setSettings({ 
                show_countdown: true,
                max_processing_time: 60
              });
            }
          } catch (settingsError) {
            console.warn('Could not fetch settings, using defaults:', settingsError);
            setSettings({ 
              show_countdown: true,
              max_processing_time: 60
            });
          }
          
          // Store project info in localStorage
          localStorage.setItem('currentProjectId', projectData.id);
          localStorage.setItem('currentProjectSlug', slug);
          localStorage.setItem('projectData', JSON.stringify(projectData));
          
          // Successfully completed request, break the retry loop
          break;
        } catch (retryError) {
          retryCount++;
          console.warn(`Fetch attempt ${retryCount} failed:`, retryError);
          
          if (retryCount >= maxRetries) {
            throw retryError;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
      // Try to use cached data as fallback
      const cachedProject = localStorage.getItem('projectData');
      if (cachedProject) {
        try {
          setProject(JSON.parse(cachedProject));
        } catch (e) {
          console.error("Error parsing cached project data:", e);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [slug, supabase]); // Only depend on slug and supabase
  
  // Fix the useEffect to avoid infinite loops
  useEffect(() => {
    // Load project data and settings from localStorage first for faster rendering
    const cachedProject = localStorage.getItem('projectData');
    const cachedSettings = localStorage.getItem('projectSettings');
    const storedImageUrl = localStorage.getItem('styleFix');
    const storedGender = localStorage.getItem('styleGenderFix');
    
    let initialLoadDone = false;
    
    if (cachedProject) {
      try {
        setProject(JSON.parse(cachedProject));
        initialLoadDone = true;
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
    
    if (storedImageUrl) {
      setStyleFix(storedImageUrl);
    }
    
    if (storedGender) {
      setStyleGender(storedGender);
    }
    
    if (initialLoadDone) {
      setLoading(false);
    }
    
    // Always fetch fresh data
    fetchProjectData();
  }, [fetchProjectData]); // Only depend on the memoized fetchProjectData
  
  const captureVideo = () => {
    // Determine if we should show a countdown based on settings
    if (settings?.show_countdown) {
      setCaptured(true);
      setTimeout(() => {
        processCapture();
      }, 3000); // 3 second countdown
    } else {
      // Capture immediately without countdown
      processCapture();
    }
  };
  
  const processCapture = () => {
    setEnabled(true);
    setCaptured(false);
    
    const canvas = previewRef.current;
    const video = videoRef.current;
    
    if (canvas === null || video === null) {
      return;
    }
    
    // Calculate the aspect ratio and crop dimensions for a square
    const aspectRatio = video.videoWidth / video.videoHeight;
    let sourceX, sourceY, sourceWidth, sourceHeight;
    
    if (aspectRatio > 1) {
      // Width is greater than height - crop width
      sourceWidth = video.videoHeight;
      sourceHeight = video.videoHeight;
      sourceX = (video.videoWidth - video.videoHeight) / 2;
      sourceY = 0;
    } else {
      // Height is greater than width - crop height
      sourceWidth = video.videoWidth;
      sourceHeight = video.videoWidth;
      sourceX = 0;
      sourceY = (video.videoHeight - video.videoWidth) / 2;
    }
    
    // Set canvas dimensions to 512x512 for AI processing
    canvas.width = 384;
    canvas.height = 384;
    
    const context = canvas.getContext('2d');
    if (context === null) return;
    
    // Draw image to canvas
    context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      512,
      512
    );
    
    // Get the base64 data URL from the canvas
    const imageDataURL = canvas.toDataURL('image/jpeg');
    setImageFile(imageDataURL);
    
    // Store in localStorage
    localStorage.setItem("faceImage", imageDataURL);
  };
  
  const retake = () => {
    setEnabled(false);
    setImageFile(null);
    setError(null);
  };
  
  // Helper function to convert URL to base64
  const toDataURL = url => fetch(url)
    .then(response => response.blob())
    .then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    }));
  
  // Nouvelle fonction utilisant l'API Replicate
 // Remplacez votre fonction generateImageSwap actuelle (lignes 231-381 environ) par celle-ci:
const generateImageSwap = async () => {
  setNumProses(2);
  reset2();
  setProcessing(true);
  setProcessingStep(1);
  setError(null);
  setLogs([]);
  setElapsedTime(0);
  
  const start = Date.now();
  
  // Récupérer le prompt depuis localStorage au lieu d'une image cible
  const stylePrompt = localStorage.getItem('stylePrompt');
  if (!stylePrompt) {
    setError("Prompt de style manquant. Veuillez choisir un style.");
    setProcessing(false);
    return;
  }
  
  try {
      // Log pour débogage des variables d'entrée
      console.log('Flux transformation input:', {
          prompt: stylePrompt,
          input_image: imageFile ? 'base64_image present' : 'image missing',
          output_format: 'jpg'
      });
      
      // Ajouter à la liste des logs
      setLogs(prevLogs => [...prevLogs, "Préparation de l'image..."]);
      
      // Vérifier que l'image base64 est correctement formée
      if (!imageFile || !imageFile.startsWith('data:image')) {
          throw new Error("L'image capturée n'est pas valide. Veuillez réessayer.");
      }
      
      // Ajouter un log pour suivre la progression
      setLogs(prevLogs => [...prevLogs, "Initialisation de la requête API..."]);
      
      // Timer pour simuler la progression
      const progressTimer = setInterval(() => {
          setElapsedTime(Date.now() - start);
          
          // Ajouter des messages de progression pour garder l'utilisateur informé
          const elapsedSeconds = Math.floor((Date.now() - start) / 1000);
          if (elapsedSeconds === 5) {
              setLogs(prevLogs => [...prevLogs, "Traitement de l'image en cours..."]);
          } else if (elapsedSeconds === 10) {
              setLogs(prevLogs => [...prevLogs, "Application du style sur votre photo..."]);
          } else if (elapsedSeconds === 15) {
              setLogs(prevLogs => [...prevLogs, "Finalisation du rendu..."]);
          }
      }, 1000);
      
      // Utiliser l'API proxy Next.js au lieu d'appeler Replicate directement
      setLogs(prevLogs => [...prevLogs, "Envoi de la requête au serveur..."]);
      
      // Ensure the model parameter is correct and data is well-formatted
      const requestBody = {
        model: "black-forest-labs/flux-kontext-pro",
        input: {
          prompt: stylePrompt,
          input_image: imageFile,
          output_format: "jpg"
        }
      };
      
      console.log('Sending request to Replicate with model:', requestBody.model);
      
      const response = await fetch('/api/replicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      // Check if the request was successful
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Replicate API responded with error:', response.status, errorText);
        throw new Error(`Erreur du serveur Replicate: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Replicate API response:', data);
      
      if (!data.success) {
        throw new Error(data.error || "Erreur lors de la génération de l'image");
      }
      
      const result = data.output;
      
      // Arrêter le timer de progression
      clearInterval(progressTimer);
      
      console.log('Replicate result:', result);
      setResultFaceSwap(result);
      setLogs(prevLogs => [...prevLogs, "Génération terminée avec succès!"]);
      
      // Mettre à jour l'étape de traitement
      setProcessingStep(2);
      
      // Le résultat du modèle est directement l'URL de l'image ou les données binaires de l'image
      // Nous devons l'adapter selon la réponse exacte du modèle
      const resultImageUrl = typeof result === 'string' ? result : 
                            Array.isArray(result) ? result[0] : 
                            result.url || result.image || result;
      
      if (!resultImageUrl) {
          console.error("URL d'image non trouvée dans la réponse:", result);
          throw new Error("URL d'image non trouvée dans la réponse");
      }
      
      // Stocker les métadonnées de génération pour débogage
      const generationMetadata = {
          requestTime: new Date().toISOString(),
          processingTime: Date.now() - start,
          modelUsed: 'black-forest-labs/flux-kontext-pro',
          parameters: {
              prompt: stylePrompt,
              input_image: '[BASE64_IMAGE]',
              output_format: 'jpg'
          },
          projectId: project?.id,
          styleId: localStorage.getItem('selectedStyleId')
      };
      
      // Stocker l'URL et les métadonnées
      localStorage.setItem("faceURLResult", resultImageUrl);
      localStorage.setItem("falGenerationMetadata", JSON.stringify(generationMetadata));
      
      try {
          // Convertir l'image en base64 pour un stockage local
          const dataUrl = await toDataURL(resultImageUrl);
          localStorage.setItem("resulAIBase64", dataUrl);
      } catch (conversionError) {
          console.warn("Impossible de convertir l'image en base64:", conversionError);
          // Continue anyway with the direct URL
      }
      
      // Enregistrer la session dans Supabase
      try {
          await supabase.from('sessions').insert({
            user_email: null, // Anonymous user
            style_id: localStorage.getItem('selectedStyleId'),
            gender: styleGender,
            result_image_url: resultImageUrl,
            processing_time_ms: Date.now() - start,
            is_success: true,
            project_id: project?.id
          });
      } catch (logError) {
          console.error("Error logging session:", logError);
      }
      
      // Rediriger vers la page de résultat
      setTimeout(() => {
          router.push(`/photobooth-premium/${slug}/result`);
      }, 1000);
  } catch (error) {
      console.error("Erreur lors de la génération de l'image:", error);
      setError(error.message || "Une erreur est survenue");
      
      // Enregistrer l'échec dans Supabase
      try {
          await supabase.from('sessions').insert({
            user_email: null,
            style_id: localStorage.getItem('selectedStyleId'),
            gender: styleGender,
            processing_time_ms: Date.now() - start,
            is_success: false,
            error_message: error.message,
            project_id: project?.id
          });
      } catch (logError) {
          console.error("Error logging failed session:", logError);
      }
  } finally {
      setProcessing(false);
      setElapsedTime(Date.now() - start);
  }
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

      {/* Processing Overlay */}
      {processing && (
        <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center flex-col z-20">
          <div 
            className="py-4 px-6 rounded-lg text-center"
            style={{ backgroundColor: primaryColor, border: `2px solid ${secondaryColor}` }}
          >
            <h2 className="text-xl mb-2" style={{ color: secondaryColor }}>
              Création en cours...
            </h2>
            <p style={{ color: 'white' }}>
              Processus: {(elapsedTime / 1000).toFixed(1)} secondes
            </p>
            <div className="mt-4 mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="h-2.5 rounded-full" 
                  style={{ 
                    width: `${Math.min(100, (elapsedTime / ((settings?.max_processing_time || 60) * 1000)) * 100)}%`,
                    backgroundColor: secondaryColor
                  }}
                ></div>
              </div>
            </div>
            
            <div 
              className="mt-4 h-24 overflow-y-auto text-sm text-left p-2 rounded"
              style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'white' }}
            >
              {logs.length > 0 ? (
                logs.map((log, index) => <div key={index}>{log}</div>)
              ) : (
                <div>Initialisation du processus...</div>
              )}
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
            
            <Link 
              href={`/photobooth-premium/${slug}`}
              className="mt-6 inline-block px-4 py-2 rounded font-medium"
              style={{ backgroundColor: secondaryColor, color: primaryColor }}
            >
              Annuler
            </Link>
          </div>
        </div>
      )}

      <div className={`w-full max-w-2xl mx-auto mt-[20vh] ${processing ? 'opacity-20' : ''}`}>
        <h2 
          className="text-xl font-bold text-center mb-6"
          style={{ color: secondaryColor }}
        >
          {enabled ? 'Vérifiez votre photo' : 'Prenez une photo'}
        </h2>
        
        {/* Display camera error if one occurs */}
        {cameraError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">
            {cameraError}
            <button 
              onClick={() => window.location.reload()}
              className="ml-2 underline font-medium"
            >
              Réessayer
            </button>
          </div>
        )}
        
        <div className="relative aspect-square w-full max-w-md mx-auto">
          {/* Countdown overlay */}
          {captured && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50 text-white text-8xl font-bold">
              <div className="countdown-animation">3</div>
            </div>
          )}
          
          {/* Video element for camera preview */}
          <video 
            ref={videoRef} 
            className={`w-full h-full object-cover rounded-lg ${enabled ? 'hidden' : 'block'}`} 
            playsInline
            autoPlay
            muted
            style={{ transform: 'scaleX(-1)' }} // Mirror effect for selfie mode
            onError={(e) => {
              console.error("Video element error:", e);
              setCameraError("Problème d'accès à la caméra. Veuillez vérifier les permissions.");
            }}
          />
          
          {/* Canvas element for captured photo */}
          <canvas 
            ref={previewRef} 
            className={`w-full h-full object-cover rounded-lg ${enabled ? 'block' : 'hidden'}`}
          />
          
          {/* Outline for camera viewfinder */}
          {!enabled && (
            <div className="absolute inset-0 border-2 border-dashed rounded-lg pointer-events-none" style={{ borderColor: secondaryColor }}></div>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center">
          {!enabled ? (
            <button 
              onClick={captureVideo}
              className="px-8 py-3 rounded-lg font-bold text-xl"
              style={{ backgroundColor: secondaryColor, color: primaryColor }}
            >
              PRENDRE UNE PHOTO
            </button>
          ) : (
            <div className="flex space-x-4">
              <button 
                onClick={retake}
                className="px-6 py-3 rounded-lg font-medium"
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  color: 'white' 
                }}
              >
                REPRENDRE
              </button>
              <button 
                onClick={generateImageSwap}
                className="px-8 py-3 rounded-lg font-bold"
                style={{ backgroundColor: secondaryColor, color: primaryColor }}
              >
                CONFIRMER
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}