'use client';

import * as fal from '@fal-ai/serverless-client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Configuration fal.ai
fal.config({
  requestMiddleware: fal.withProxy({
    targetUrl: '/api/fal/proxy',
  }),
});

export default function CameraCapture({ params }) {
  const slug = params.slug;
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  
  const [countdown, setCountdown] = useState(null);
  const [captured, setCaptured] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [error, setError] = useState(null);
  const [styleFix, setStyleFix] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [logs, setLogs] = useState([]);
  
  // Load project data
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        // First check localStorage
        const cachedProject = localStorage.getItem('projectData');
        const cachedSettings = localStorage.getItem('projectSettings');
        const storedImageUrl = localStorage.getItem('styleFix');
        
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
        
        if (storedImageUrl) {
          setStyleFix(storedImageUrl);
        }
        
        // Fetch fresh data
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
        setError('Une erreur est survenue lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjectData();
  }, [slug, supabase]);
  
  // Initialize camera
  useEffect(() => {
    const initializeCamera = async () => {
      setCameraLoading(true);
      try {
        // Get available video devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        
        // Use the first device by default
        if (videoDevices.length > 0) {
          await startCamera(videoDevices[0].deviceId);
        } else {
          setError('Aucune caméra détectée');
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Impossible d\'accéder à la caméra');
      } finally {
        setCameraLoading(false);
      }
    };
    
    initializeCamera();
    
    // Cleanup function
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Start camera with selected device
  const startCamera = async (deviceId) => {
    try {
      // Stop any existing stream
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      
      // Start new stream
      const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setSelectedDevice(deviceId);
      
      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Impossible de démarrer la caméra');
    }
  };
  
  // Handle device selection
  const handleDeviceChange = async (deviceId) => {
    await startCamera(deviceId);
    setShowDeviceSelector(false);
  };
  
  // Capture photo
  const capturePhoto = () => {
    if (settings?.show_countdown) {
      // Start countdown
      setCountdown(3);
      
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setTimeout(() => {
              processCapture();
              setCountdown(null);
            }, 1000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Capture immediately
      processCapture();
    }
  };
  
  // Process capture
  const processCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Get video dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // Set canvas size - 512x512 for optimal AI processing
    canvas.width = 512;
    canvas.height = 512;
    
    // Calculate aspect ratio to crop a square from the center
    const aspectRatio = videoWidth / videoHeight;
    let sourceX, sourceY, sourceWidth, sourceHeight;
    
    if (aspectRatio > 1) {
      // Landscape - crop width
      sourceWidth = videoHeight;
      sourceHeight = videoHeight;
      sourceX = (videoWidth - videoHeight) / 2;
      sourceY = 0;
    } else {
      // Portrait - crop height
      sourceWidth = videoWidth;
      sourceHeight = videoWidth;
      sourceX = 0;
      sourceY = (videoHeight - videoWidth) / 2;
    }
    
    // Draw to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
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
    
    // Get data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setImageDataUrl(dataUrl);
    setCaptured(true);
    
    // Store in localStorage
    localStorage.setItem("faceImage", dataUrl);
  };
  
  // Retake photo
  const retakePhoto = () => {
    setCaptured(false);
    setImageDataUrl(null);
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
  
  // Generate image with fal.ai
  const generateImage = async () => {
    setProcessing(true);
    setProcessingStep(1);
    setError(null);
    setLogs([]);
    setElapsedTime(0);
    setLoadingProgress(0);
    
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
      // Simulate progress for better UX
      setLoadingProgress(prev => {
        if (prev < 90) return prev + (Math.random() * 3);
        return prev;
      });
    }, 1000);
    
    try {
      // Get the selected style ID from localStorage
      const styleId = localStorage.getItem('selectedStyleId');
      let defaultPrompt = "A beautiful portrait in professional lighting";
      
      // If we have a style ID, try to get its prompt from the database
      if (styleId) {
        try {
          const { data: styleData, error: styleError } = await supabase
            .from('styles')
            .select('prompt')
            .eq('id', styleId)
            .single();
            
          if (styleData && styleData.prompt) {
            defaultPrompt = styleData.prompt;
          }
        } catch (styleError) {
          console.error("Error fetching style prompt:", styleError);
          // Continue with default prompt
        }
      }
      
      // Log input parameters for debugging
      console.log('hidream input:', {
        prompt: defaultPrompt,
        image_url: imageDataUrl ? 'base64_image...' : null,
      });
      
      // Call the fal.ai hidream API with additional parameters
      const result = await fal.subscribe(
        'fal-ai/hidream-i1-full/image-to-image',
        {
          input: {
            prompt: defaultPrompt,
            image_url: imageDataUrl,  // Using the captured photo as image_url
            negative_prompt: "poor quality, extra hand, extra finger, blur, bluriness",
            num_inference_steps: 50,
            guidance_scale: 16,
            num_images: 1,
            enable_safety_checker: true,
            output_format: "jpeg",
            strength: 0.29
          },
          pollInterval: 5000, // Poll every 5 seconds
          logs: true,
          onQueueUpdate: (update) => {
            setElapsedTime(Date.now() - startTime);
            if (update.status === 'IN_PROGRESS' || update.status === 'COMPLETED') {
              setLogs((update.logs || []).map((log) => log.message));
            }
          },
        }
      );
      
      clearInterval(progressInterval);
      setLoadingProgress(100);
      setProcessingStep(2); // Image generated
      
      console.log('Result:', result);
      
      // Store metadata for debugging
      const generationMetadata = {
        requestTime: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        modelUsed: 'fal-ai/hidream-i1-full/image-to-image',
        parameters: {
          prompt: defaultPrompt,
          image_url: '[BASE64_IMAGE]',
          num_inference_steps: 50,
          guidance_scale: 16,
          strength: 0.29
        },
        projectId: project?.id,
        styleId: localStorage.getItem('selectedStyleId'),
        requestId: result.requestId
      };
      
      // Get the image URL from the result object
      const resultImageUrl = result.images?.[0] || result.data?.images?.[0] || result.image?.url;
      
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
      
      // 1. Log session to database
      let sessionId = null;
      try {
        const { data: sessionData, error: sessionError } = await supabase.from('sessions').insert({
          user_email: null, // Anonymous user
          style_id: localStorage.getItem('selectedStyleId'),
          prompt: defaultPrompt,  // Store the prompt used
          result_image_url: resultImageUrl,
          processing_time_ms: Date.now() - startTime,
          is_success: true,
          project_id: project?.id
        }).select('id').single();
        
        if (sessionError) throw sessionError;
        sessionId = sessionData.id;
      } catch (logError) {
        console.error("Error logging session:", logError);
      }
      
      // 2. Add record to the photos table
      try {
        await supabase.from('photos').insert({
          project_id: project?.id,
          session_id: sessionId,
          user_email: null, // Anonymous user
          image_url: resultImageUrl,
          style_id: localStorage.getItem('selectedStyleId'),
          is_paid: false,
          metadata: {
            prompt: defaultPrompt,
            processingTime: Date.now() - startTime,
            model: 'fal-ai/hidream-i1-full/image-to-image',
            requestId: result.requestId
          }
        });
      } catch (photoError) {
        console.error("Error logging photo:", photoError);
      }
      
      // 3. Update the project's photo count
      try {
        await supabase.rpc('increment_photo_count', { project_id_param: project?.id });
      } catch (countError) {
        console.error("Error incrementing photo count:", countError);
      }
      
      // Redirect to results page after a short delay
      setTimeout(() => {
        router.push(`/photobooth2/${slug}/result`);
      }, 1000);
      
    } catch (error) {
      console.error("Error generating image:", error);
      clearInterval(progressInterval);
      setError(error.message || "Une erreur est survenue lors de la génération");
      
      // Log failed attempt
      try {
        await supabase.from('sessions').insert({
          user_email: null,
          style_id: localStorage.getItem('selectedStyleId'),
          prompt: "A beautiful portrait in professional lighting",
          processing_time_ms: Date.now() - startTime,
          is_success: false,
          error_message: error.message,
          project_id: project?.id
        });
      } catch (logError) {
        console.error("Error logging failed session:", logError);
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
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
    <div className="fixed inset-0 z-10" style={{ backgroundColor: primaryColor }}>
      <div className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-20 px-5">
        {/* Logo/Header */}
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

        {/* Main content area */}
        <div className="max-w-lg w-full mt-[120px] mb-4">
          {/* Camera title and instructions */}
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-white">
              {processing ? "Génération en cours..." : 
               captured ? "Prêt pour transformer" : 
               "Placez votre visage dans le cadre"}
            </h2>
            <p className="text-white text-opacity-80 mt-2">
              {processing ? "Patientez pendant que l'IA crée votre portrait" : 
               captured ? "Vérifiez que votre photo est nette et bien cadrée" : 
               "Regardez l'objectif et souriez"}
            </p>
          </motion.div>

          {/* Error message */}
          {error && (
            <motion.div 
              className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 text-white rounded-lg"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          {/* Camera view / captured image */}
          <motion.div 
            className="relative w-full max-w-md mx-auto aspect-square rounded-2xl overflow-hidden bg-black bg-opacity-20 shadow-xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Loading overlay */}
            {cameraLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
              </div>
            )}
            
            {/* Countdown overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
                <div className="text-7xl font-bold text-white">{countdown}</div>
              </div>
            )}
            
            {/* Processing overlay */}
            {processing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 z-20 p-6">
                <div className="w-16 h-16 border-4 border-t-transparent border-white rounded-full animate-spin mb-4"></div>
                <div className="h-2 w-full max-w-xs bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <p className="text-white mt-4 text-center">
                  {processingStep === 1 ? "Analyse en cours..." : "Création du portrait..."}
                </p>
                <p className="text-sm text-white text-opacity-70 mt-2">
                  {Math.floor(elapsedTime / 1000)} secondes écoulées
                </p>
                {logs.length > 0 && (
                  <div className="mt-4 max-h-20 overflow-y-auto w-full">
                    <p className="text-xs text-white text-opacity-50 text-center">{logs[logs.length - 1]}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Video element for camera */}
            {!captured && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            
            {/* Canvas for capturing & display */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-cover ${!captured ? 'hidden' : ''}`}
            />
            
            {/* Mask overlay for better framing */}
            {!captured && !processing && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full border-[40px] sm:border-[60px] border-black border-opacity-40 rounded-full"></div>
              </div>
            )}
          </motion.div>

          {/* Controls */}
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center mt-6 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Camera selector button */}
            <div className="relative">
              <button
                onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                disabled={processing || devices.length <= 1}
                className={`flex items-center gap-2 py-2 px-4 rounded-full text-sm ${
                  devices.length <= 1
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Changer de caméra
              </button>
              
              {/* Camera selector dropdown */}
              {showDeviceSelector && (
                <div className="absolute left-0 mt-2 w-60 bg-white rounded-lg shadow-lg z-20">
                  <div className="p-2">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 px-2">Choisir une caméra</h3>
                    <div className="space-y-1">
                      {devices.map(device => (
                        <button
                          key={device.deviceId}
                          onClick={() => handleDeviceChange(device.deviceId)}
                          className={`w-full text-left px-4 py-2 text-sm rounded-md ${
                            selectedDevice === device.deviceId
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {device.label || `Caméra ${devices.indexOf(device) + 1}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Action buttons */}
            {!captured ? (
              <button
                onClick={capturePhoto}
                disabled={processing || cameraLoading}
                className="flex-1 sm:flex-none py-3 px-8 rounded-full text-lg font-bold shadow-lg focus:outline-none"
                style={{ backgroundColor: secondaryColor, color: primaryColor }}
              >
                Prendre une photo
              </button>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={retakePhoto}
                  disabled={processing}
                  className="py-3 px-6 bg-white bg-opacity-20 text-white rounded-full hover:bg-opacity-30 transition-colors shadow-md font-medium"
                >
                  Reprendre
                </button>
                <button
                  onClick={generateImage}
                  disabled={processing}
                  className="py-3 px-8 rounded-full text-lg font-bold shadow-lg"
                  style={{ backgroundColor: secondaryColor, color: primaryColor }}
                >
                  Transformer
                </button>
              </div>
            )}
          </motion.div>

          {/* Selected style preview */}
          {!processing && !captured && styleFix && (
            <motion.div 
              className="mt-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <p className="text-white text-opacity-80 mb-2 text-sm">Style sélectionné:</p>
              <div className="inline-block bg-white bg-opacity-10 p-2 rounded-lg">
                <img 
                  src={styleFix} 
                  alt="Style sélectionné" 
                  className="h-16 w-16 object-cover rounded"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}