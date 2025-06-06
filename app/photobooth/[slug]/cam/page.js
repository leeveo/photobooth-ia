'use client';

import * as fal from '@fal-ai/serverless-client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';
import LoadingOverlay from '../../../components/ui/LoadingOverlay';

// Configuration fal.ai
fal.config({
  requestMiddleware: fal.withProxy({
    targetUrl: '/api/fal/proxy',
  }),
});

// Hook webcam
let streamCam = null;
const useWebcam = ({ videoRef }) => {
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      }).then((stream) => {
        console.log("Camera access granted, initializing stream");
        streamCam = stream;
        window.localStream = stream;
        if (videoRef.current !== null) {
          console.log("Setting video source");
          videoRef.current.srcObject = stream;
          // Essayer d'appeler play() après un court délai
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.play()
                .then(() => console.log("Video playback started"))
                .catch(err => console.error("Error starting video playback:", err));
            }
          }, 100);
        } else {
          console.error("Video ref is null, cannot attach stream");
        }
      }).catch(err => {
        console.error("Error accessing camera:", err);
      });
    } else {
      console.error("MediaDevices API not supported in this browser");
    }
    
    // Cleanup function to stop all tracks when component unmounts
    return () => {
      if (streamCam) {
        streamCam.getTracks().forEach(track => track.stop());
        console.log("Camera stream tracks stopped");
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
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Initialize webcam
  useWebcam({ videoRef, previewRef });
  
  // Memoize fetchProjectData with useCallback
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
      
      const projectSettings = settingsData || { 
        show_countdown: true,
        max_processing_time: 60
      };
      
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
    
    // Get style information from localStorage
    const storedImageUrl = localStorage.getItem('styleFix');
    const storedGender = localStorage.getItem('styleGenderFix');
    
    console.log('Loaded style data:', {
      styleImageUrl: storedImageUrl,
      styleGender: storedGender
    });
    
    if (storedImageUrl) {
      setStyleFix(storedImageUrl);
    } else {
      console.error('No style image URL found in localStorage');
    }
    
    if (storedGender) {
      setStyleGender(storedGender);
    } else {
      console.error('No style gender found in localStorage');
    }
    
    // Always fetch fresh data
    fetchProjectData();
  }, [fetchProjectData]);
  
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
    canvas.width = 512;
    canvas.height = 512;
    
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
  
  // Generate image using fal.ai
  const generateImage = async () => {
    setProcessing(true);
    setProcessingStep(1);
    setError(null);
    setLogs([]);
    setElapsedTime(0);
    setLoadingProgress(0);
    
    const start = Date.now();
    
    // Verify we have all required data before proceeding
    if (!styleFix) {
      setError('Style image missing. Please go back and select a style.');
      setProcessing(false);
      return;
    }
    
    console.log('Using style data for fal.ai:', {
      styleImage: styleFix ? styleFix.substring(0, 30) + '...' : 'missing',
      styleGender: styleGender || 'missing'
    });
    
    // Determine gender for fal.ai API
    let gender = "male";
    if (styleGender === 'f' || styleGender === 'af') {
      gender = "female";
    }
    
    try {
      // Log input parameters for debugging
      console.log('Face swap input:', {
        face_image_0: imageFile ? 'base64_image...' : null,
        gender_0: gender,
        target_image: styleFix,
        workflow_type: "target_hair"
      });
      
      // Call the fal.ai API
      const result = await fal.subscribe(
        'easel-ai/advanced-face-swap',
        {
          input: {
            face_image_0: imageFile,    // Image utilisateur
            gender_0: gender,           // Genre détecté
            target_image: styleFix,     // Image de référence (mannequin)
            workflow_type: "target_hair" // Préserver les cheveux du mannequin
          },
          pollInterval: 5000, // Poll every 5 seconds
          logs: true,
          onQueueUpdate: (update) => {
            setElapsedTime(Date.now() - start);
            if (update.status === 'IN_PROGRESS' || update.status === 'COMPLETED') {
              const newLogs = (update.logs || []).map((log) => log.message);
              setLogs(newLogs);
              
              // Estimate progress based on logs and elapsed time
              const maxTime = (settings?.max_processing_time || 60) * 1000;
              const timeBasedProgress = Math.min(95, (Date.now() - start) / maxTime * 100);
              
              // If we're in the early stages (detected by logs)
              if (newLogs.some(log => log.includes('Detecting'))) {
                setLoadingProgress(Math.min(30, timeBasedProgress));
              } 
              // If we're processing the image
              else if (newLogs.some(log => log.includes('Processing'))) {
                setLoadingProgress(Math.min(70, timeBasedProgress));
              }
              // If we're finalizing
              else if (newLogs.some(log => log.includes('Finalizing') || log.includes('Completed'))) {
                setLoadingProgress(Math.min(95, timeBasedProgress));
              }
              else {
                setLoadingProgress(timeBasedProgress);
              }
            }
          },
        }
      );
      
      setLoadingProgress(100);
      setProcessingStep(2); // Image generated
      
      // Store metadata for debugging
      const generationMetadata = {
        requestTime: new Date().toISOString(),
        processingTime: Date.now() - start,
        modelUsed: 'easel-ai/advanced-face-swap',
        parameters: {
          face_image_0: '[BASE64_IMAGE]',
          gender_0: gender,
          target_image: styleFix,
          workflow_type: "target_hair"
        },
        projectId: project?.id,
        styleId: localStorage.getItem('selectedStyleId')
      };
      
      // Get the image URL from the result object
      const resultImageUrl = result.image?.url || result.data?.url || result.data?.image_url;
      
      if (!resultImageUrl) {
        throw new Error("URL d'image non trouvée dans la réponse");
      }
      
      // Store results in localStorage
      localStorage.setItem("falGenerationMetadata", JSON.stringify(generationMetadata));
      localStorage.setItem("faceURLResult", resultImageUrl);
      
      // Convert to base64 and store
      try {
        const dataUrl = await toDataURL(resultImageUrl);
        localStorage.setItem("resulAIBase64", dataUrl);
      } catch (conversionError) {
        console.error("Erreur lors de la conversion en base64:", conversionError);
        // Continue anyway, we have the image URL
      }
      
      // Log session to database if needed
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
      
      // Add record to the photos table
      try {
        await supabase.from('photos').insert({
          project_id: project?.id,
          session_id: sessionId,
          user_email: null, // Anonymous user
          image_url: resultImageUrl,
          style_id: localStorage.getItem('selectedStyleId'),
          is_paid: false,
          metadata: {
            prompt: prompt,
            model: 'fal.ai/ip-adapter-plus-face',
            // Add other metadata as needed
          }
        });
      } catch (photoError) {
        console.error("Error logging photo:", photoError);
      }
      
      // Update the project's photo count
      try {
        await supabase.rpc('increment_photo_count', { project_id_param: project?.id });
      } catch (countError) {
        console.error("Error incrementing photo count:", countError);
      }
      
      // Redirect to results page after a short delay
      setTimeout(() => {
        router.push(`/photobooth/${slug}/result`);
      }, 1000);
      
    } catch (error) {
      console.error("Error generating image:", error);
      setError(error.message || "Une erreur est survenue");
      
      // Log failed attempt
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
    }
  };
  
  const generateImageSwap = async () => {
    setNumProses(2)
    reset2();
    setLoading(true);
    const start = Date.now();
    
    // Récupérer la target_image depuis localStorage
    const targetImageUrl = localStorage.getItem('styleFix');
    if (!targetImageUrl) {
      setError(new Error("Image cible manquante. Veuillez choisir un style."));
      setLoading(false);
      return;
    }
    
    // Déterminer le genre en fonction du styleGenderFix
    let gender = "male"; // Par défaut
    const styleGenderFix = localStorage.getItem('styleGenderFix');
    if (styleGenderFix === 'f' || styleGenderFix === 'af') {
        gender = "female";
    }
    
    try {
        // Log pour débogage des variables d'entrée
        console.log('Face swap input:', {
            face_image_0: 'base64_image...',
            gender_0: gender,
            target_image: targetImageUrl.substring(0, 100) + '...',
            workflow_type: "target_hair"
        });
        
        // Vérifier que l'image base64 est correctement formée
        if (!imageFile || !imageFile.startsWith('data:image')) {
            throw new Error("L'image capturée n'est pas valide. Veuillez réessayer.");
        }
        
        // Call to fal.ai API with better error handling
        const result = await fal.subscribe(
            'easel-ai/advanced-face-swap',
            {
                input: {
                    face_image_0: imageFile,    // Image utilisateur (visage)
                    gender_0: gender,           // Genre détecté 
                    target_image: targetImageUrl, // Image de référence (mannequin)
                    workflow_type: "target_hair"  // Préserver les cheveux du mannequin
                },
                pollInterval: 5000, // polling every 5 seconds
                logs: true,
                onQueueUpdate: (update) => {
                    // Update progress and logs
                    setElapsedTime(Date.now() - start);
                    console.log('Queue update:', update);
                    
                    if (update.logs) {
                        setLogs((update.logs || []).map((log) => log.message));
                    }
                },
                // Don't try to log session info - remove this part
                /* sessionInfo: {
                    user_email: null,
                } */
            }
        );
        
        console.log('fal.ai result:', result);
        setResultFaceSwap(result);
        
        // Déterminer l'URL de l'image résultante
        const resultImageUrl = result.image?.url || result.data?.url || result.data?.image_url;
        
        if (!resultImageUrl) {
            console.error("URL d'image non trouvée dans la réponse:", result);
            throw new Error("URL d'image non trouvée dans la réponse");
        }
        
        // Stocker l'URL et rediriger
        localStorage.setItem("faceURLResult", resultImageUrl);
        
        try {
            // Convertir l'image en base64 pour un stockage local
            const dataUrl = await toDataURL(resultImageUrl);
            localStorage.setItem("resulAIBase64", dataUrl);
        } catch (conversionError) {
            console.warn("Impossible de convertir l'image en base64:", conversionError);
            // Continue anyway with the direct URL
        }
        
        // Rediriger vers la page de résultat
        setTimeout(() => {
            router.push(`/photobooth/${slug}/result`);
        }, 1000);
    } catch (error) {
        console.error("Erreur lors de la génération de l'image:", error);
        setError(error);
        setNumProses1(false); // Permettre de réessayer
    } finally {
        setLoading(false);
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
    <div className="relative z-10 w-full h-full">
      <main 
        className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-20 px-5"
        style={{ backgroundColor: primaryColor }}
      >
        <motion.div 
          className="fixed top-0 left-0 right-0 flex justify-center mt-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {project.logo_url ? (
            <div className="w-[250px] h-[250px] relative">
              <Image 
                src={project.logo_url} 
                alt={project.name} 
                fill
                style={{ objectFit: "contain" }}
                priority 
                className="drop-shadow-xl"
              />
            </div>
          ) : (
            <h1 
              className="text-xl font-bold text-center" 
              style={{ color: secondaryColor }}
            >
              {project.name}
            </h1>
          )}
        </motion.div>

        {/* Processing Overlay */}
        <LoadingOverlay
          isVisible={processing}
          title="Création en cours..."
          message={`Processus: ${(elapsedTime / 1000).toFixed(1)} secondes`}
          progress={loadingProgress}
          logs={logs}
          project={project} // Pass the entire project object to use its colors
          onCancel={() => {
            setProcessing(false);
            setError(null);
          }}
        />

        <motion.div 
          className={`w-full max-w-2xl mx-auto mt-[20vh] ${processing ? 'opacity-20' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: processing ? 0.2 : 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <motion.h2 
            className="text-xl font-bold text-center mb-6"
            style={{ color: secondaryColor }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {enabled ? 'Vérifiez votre photo' : 'Prenez une photo'}
          </motion.h2>
          
          <motion.div 
            className="relative aspect-square w-full max-w-md mx-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            {/* Countdown overlay */}
            {captured && (
              <motion.div 
                className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50 text-white text-8xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div 
                  className="countdown-animation"
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5 }}
                >3</motion.div>
              </motion.div>
            )}
            
            {/* Video element for camera preview - MODIFIED */}
            <video 
              ref={videoRef} 
              className={`w-full h-full object-cover rounded-lg ${enabled ? 'hidden' : 'block'}`} 
              playsInline
              autoPlay
              muted
              style={{ transform: 'scaleX(-1)' }} // Mirror effect for selfie mode
            />
            
            {/* Canvas element for captured photo */}
            <canvas 
              ref={previewRef} 
              className={`w-full h-full object-cover rounded-lg ${enabled ? 'block' : 'hidden'}`}
            />
            
            {/* Outline for camera viewfinder */}
            {!enabled && (
              <motion.div 
                className="absolute inset-0 border-2 border-dashed rounded-lg pointer-events-none" 
                style={{ borderColor: secondaryColor }}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              ></motion.div>
            )}
          </motion.div>

          <motion.div 
            className="mt-8 flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1 }}
          >
            {!enabled ? (
              <motion.button 
                onClick={captureVideo}
                className="px-8 py-3 rounded-lg font-bold text-xl"
                style={{ backgroundColor: secondaryColor, color: primaryColor }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                PRENDRE UNE PHOTO
              </motion.button>
            ) : (
              <motion.div 
                className="flex space-x-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.button 
                  onClick={retake}
                  className="px-6 py-3 rounded-lg font-medium"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    color: 'white' 
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  REPRENDRE
                </motion.button>
                <motion.button 
                  onClick={generateImage}
                  className="px-8 py-3 rounded-lg font-bold"
                  style={{ backgroundColor: secondaryColor, color: primaryColor }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  CONFIRMER
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
