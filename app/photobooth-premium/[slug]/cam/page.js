'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Ajouter cette fonction dataURLtoFile améliorée au début de votre fichier
const dataURLtoFile = (dataurl, filename) => {
  if (!dataurl) {
    console.error("dataURLtoFile: dataurl is null or undefined");
    return null;
  }
  
  // S'assurer que c'est bien une data URL (commence par "data:")
  if (!dataurl.startsWith('data:')) {
    console.error("dataURLtoFile: Not a data URL", dataurl.substring(0, 20) + "...");
    return null;
  }
  
  try {
    const arr = dataurl.split(',');
    if (arr.length < 2) {
      console.error("dataURLtoFile: Invalid dataURL format - missing comma");
      return null;
    }
    
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) {
      console.error("dataURLtoFile: Could not extract MIME type");
      return null;
    }
    
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    console.log(`Successfully created File object for ${filename} with MIME ${mime}`);
    return new File([u8arr], filename, { type: mime });
  } catch (error) {
    console.error("Error in dataURLtoFile:", error);
    return null;
  }
};

// Hook webcam with improved error handling and retries
let streamCam = null;
const useWebcam = ({ videoRef, setCameraError, setCameraLoaded }) => {
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    // Function to attempt camera initialization with different constraints
    const tryInitCamera = async (constraints) => {
      try {
        console.log("Requesting camera with constraints:", constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!isMounted) {
          // Component unmounted during async call, clean up
          stream.getTracks().forEach(track => track.stop());
          return null;
        }
        
        console.log("Camera access granted with constraints:", constraints);
        return stream;
      } catch (err) {
        console.error(`Camera access failed with constraints:`, constraints, err);
        return null;
      }
    };
    
    // Main initialization function with fallbacks
    const initializeCamera = async () => {
      console.log("🎥 Initializing camera...");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Votre navigateur ne prend pas en charge l'accès à la caméra");
        return;
      }
      
      // Configuration options from highest to lowest quality
      const configOptions = [
        // Option 1: Ideal 16:9 HD
        { 
          video: { 
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 16/9 }
          } 
        },
        // Option 2: Minimum resolution with 16:9
        { 
          video: { 
            width: { min: 640 },
            height: { min: 360 },
            aspectRatio: { ideal: 16/9 }
          } 
        },
        // Option 3: Just ask for video with no constraints
        { video: true },
        // Option 4: Try a different API approach (for older browsers)
        { video: { facingMode: "user" } }
      ];
      
      let stream = null;
      
      // Try each configuration option until one works
      for (const config of configOptions) {
        stream = await tryInitCamera(config);
        if (stream) break;
      }
      
      if (!stream) {
        console.error("❌ Could not access camera after multiple attempts");
        setCameraError("La caméra n'est pas accessible. Vérifiez que vous avez autorisé l'accès.");
        return;
      }
      
      console.log("✅ Camera stream obtained successfully");
      
      // Store the successful stream
      streamCam = stream;
      window.localStream = stream;
      
      // Apply the stream to video element
      if (videoRef.current) {
        console.log("📹 Attaching stream to video element");
        videoRef.current.srcObject = stream;
        
        // Make sure the video element is visible
        videoRef.current.style.display = 'block';
        videoRef.current.style.visibility = 'visible';
        
        // Play video with error handling
        try {
          await videoRef.current.play();
          console.log("▶️ Camera stream playing successfully");
          
          // Set a timeout to allow the video to initialize before marking as loaded
          setTimeout(() => {
            if (isMounted) {
              setCameraLoaded(true);
              console.log("✅ Camera marked as loaded");
            }
          }, 1000);
          
        } catch (playError) {
          console.error("❌ Error playing video stream:", playError);
          setCameraError("Erreur lors du démarrage de la vidéo: " + playError.message);
        }
      } else {
        console.warn("❌ Video element not found when trying to initialize camera");
      }
    };
    
    // Start the initialization process
    initializeCamera();
    
    // Cleanup function
    return () => {
      isMounted = false;
      console.log("🧹 Cleaning up camera resources...");
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      if (streamCam) {
        try {
          const tracks = streamCam.getTracks();
          tracks.forEach(track => {
            track.stop();
            console.log(`🛑 Stopped track: ${track.kind}`);
          });
          streamCam = null;
          window.localStream = null;
        } catch (cleanupError) {
          console.error("Error during camera cleanup:", cleanupError);
        }
      }
    };
  }, [videoRef, setCameraError, setCameraLoaded]);
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
  
  // Restore camera error display for better debugging
  const [cameraError, setCameraError] = useState(null);
  
  // Add missing cameraLoaded state
  const [cameraLoaded, setCameraLoaded] = useState(false);
  
  // Add state for loading progress
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Add state for retry attempt
  const [retryAttempt, setRetryAttempt] = useState(0);
  
  // Add state for countdown
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);
  
  // Add videoVisible state that was missing
  const [videoVisible, setVideoVisible] = useState(true);
  
  // Quota states
  const [quota, setQuota] = useState(null);
  const [quotaUsed, setQuotaUsed] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [quotaAtteint, setQuotaAtteint] = useState(false);
  const [quotaRestant, setQuotaRestant] = useState(null);

  // Function to reset state when retrying
  const reset2 = () => {
    setError(null);
    setLogs([]);
    setElapsedTime(0);
    setLoadingProgress(0);
  };
  
  // Initialize webcam with error handling - passing setCameraLoaded as well
  useWebcam({ videoRef, setCameraError, setCameraLoaded });
  
  // Replace the current captureVideo function with a direct implementation
  // This version directly implements the functionality without relying on other functions
  const captureVideo = () => {
    // Don't proceed if countdown is already showing or camera isn't loaded
    if (showCountdown || !cameraLoaded || cameraError) {
      return;
    }
    
    console.log("PRENDRE UNE PHOTO clicked - starting countdown sequence");
    
    // Start the countdown sequence - exactly like the debug button
    setShowCountdown(true);
    setCountdownNumber(3);
    
    // Schedule countdown changes with timeouts
    setTimeout(() => setCountdownNumber(2), 1000);
    setTimeout(() => setCountdownNumber(1), 2000);
    setTimeout(() => {
      setShowCountdown(false);
      
      // Perform the capture directly without calling debugCaptureTest
      // This avoids any potential circular references
      console.log("Countdown finished, capturing image directly");
      
      try {
        // Set state to show we're processing the capture
        setEnabled(true);
        setCaptured(false);
        
        const canvas = previewRef.current;
        const video = videoRef.current;
        
        if (!canvas || !video) {
          console.error("Canvas or video element is null");
          setCameraError("Élément vidéo ou canvas non trouvé");
          return;
        }
        
        // Get video dimensions
        const videoWidth = video.videoWidth || 1280;
        const videoHeight = video.videoHeight || 720;
        
        // Set canvas dimensions
        canvas.width = 1280;
        canvas.height = 720;
        
        const context = canvas.getContext('2d');
        if (!context) {
          console.error("Could not get canvas context");
          return;
        }
        
        // Clear canvas and draw the image
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width, canvas.height);
        context.setTransform(1, 0, 0, 1, 0, 0);
        
        // Get the image data and update state
        const imageDataURL = canvas.toDataURL('image/jpeg', 0.9);
        setImageFile(imageDataURL);
        localStorage.setItem("faceImage", imageDataURL);
        
        console.log("Image captured successfully!");
      } catch (error) {
        console.error("Error capturing image:", error);
        setCameraError(`Erreur lors de la capture: ${error.message}`);
        setEnabled(false);
      }
    }, 3000);
  };
  
  // Keep the simplified debug capture function (just modify any console logs)
  const debugCaptureTest = () => {
    console.log("Debug direct capture called");
    // Directly process the capture
    processCapture();
  };
  
  // Simplify the processCapture function for debugging
  const processCapture = () => {
    console.log("processCapture called");
    try {
      // Ne pas masquer la vidéo immédiatement
      // setEnabled(true); <- Commentons cette ligne qui masque la vidéo
      setCaptured(false);
      
      const canvas = previewRef.current;
      const video = videoRef.current;
      
      if (!canvas || !video) {
        console.error("Canvas or video element is null");
        setCameraError("Élément vidéo ou canvas non trouvé");
        return;
      }
      
      console.log("Video and canvas elements found, processing capture");
      console.log("Video visibility state:", videoRef.current.style.display);
      
      // Get video dimensions
      const videoWidth = video.videoWidth || 1280;
      const videoHeight = video.videoHeight || 720;
      
      // Set canvas dimensions to match the expected output dimensions (970x651)
      // These dimensions should match those used in the result page
      canvas.width = 970;
      canvas.height = 651;
      
      const context = canvas.getContext('2d');
      if (!context) {
        console.error("Could not get canvas context");
        return;
      }
      
      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Mirror the image horizontally for selfie mode
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      
      // Calculate scaling to maintain aspect ratio while filling the canvas
      const videoAspect = videoWidth / videoHeight;
      const canvasAspect = canvas.width / canvas.height;
      
      let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
      
      if (videoAspect > canvasAspect) {
        // Video is wider than canvas (relative to height)
        drawHeight = canvas.height;
        drawWidth = drawHeight * videoAspect;
        offsetX = (canvas.width - drawWidth) / 2;
      } else {
        // Video is taller than canvas (relative to width)
        drawWidth = canvas.width;
        drawHeight = drawWidth / videoAspect;
        offsetY = (canvas.height - drawHeight) / 2;
      }
      
      // Draw video to canvas with proper aspect ratio and centering
      context.drawImage(
        video, 
        0, 0, videoWidth, videoHeight, 
        offsetX, offsetY, drawWidth, drawHeight
      );
      
      // Reset transform
      context.setTransform(1, 0, 0, 1, 0, 0);
      
      // Get the data URL
      const imageDataURL = canvas.toDataURL('image/jpeg', 0.95);
      
      console.log("Image captured successfully, setting state");
      console.log(`Captured image dimensions: ${canvas.width}x${canvas.height}`);
      
      // Set state with the captured image
      setImageFile(imageDataURL);
      
      // Store in localStorage
      localStorage.setItem("faceImage", imageDataURL);
      
      // Seulement maintenant, après la capture, on active l'affichage du canvas
      setEnabled(true);
      // Et on indique explicitement que la vidéo doit être masquée
      setVideoVisible(false);
      
      // Recharge le quota après la prise de photo
      fetchQuota();
    } catch (error) {
      console.error("Error in processCapture:", error);
      setCameraError(`Erreur lors de la capture: ${error.message}`);
      setEnabled(false);
      setVideoVisible(true); // S'assurer que la vidéo reste visible en cas d'erreur
    }
  };
  
  // Check when camera is loaded and visible - without conditional hooks
  useEffect(() => {
    const checkCamera = () => {
      if (videoRef.current && videoRef.current.srcObject && 
          videoRef.current.readyState >= 2) {
        setCameraLoaded(true);
        console.log("Camera loaded successfully");
      }
    };
    
    // Initial check
    checkCamera();
    
    // Set up recurring checks
    const interval = setInterval(checkCamera, 1000);
    
    return () => clearInterval(interval);
  }, [retryAttempt]); // Only depend on retryAttempt, not on videoRef.current
  
  // Function to manually retry camera initialization
  const retryCamera = useCallback(() => {
    // Clear error state
    setCameraError(null);
    
    // Reset camera loaded state
    setCameraLoaded(false);
    
    // Stop any existing stream
    if (streamCam) {
      try {
        streamCam.getTracks().forEach(track => track.stop());
        streamCam = null;
      } catch (e) {
        console.error("Error stopping camera tracks:", e);
      }
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Increment retry counter to trigger useEffect
    setRetryAttempt(prev => prev + 1);
  }, []); // No dependencies needed for this function
  
  // Fix the fetchProjectData function to avoid the 406 error
  const fetchProjectData = useCallback(async () => {
    try {
      // Add retry logic to handle potential errors
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Fetch project data by slug with more specific select
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, name, slug, logo_url, primary_color, secondary_color, is_active', { head: false })
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

          if (projectError || !projectData) {
            console.error('Project not found or inactive:', projectError);
            return notFound();
          }
          
          setProject(projectData);
          
          // FIX: Use single() with separate query instead of filtering by project_id
          try {
            // First get the settings ID that matches the project
            const { data: settingsIdData } = await supabase
              .from('project_settings')
              .select('id', { head: false })
              .eq('project_id', projectData.id)
              .single();
              
            if (settingsIdData && settingsIdData.id) {
              // Then query for specific settings using the settings ID
              const { data: settingsData } = await supabase
                .from('project_settings')
                .select('show_countdown, max_processing_time', { head: false })
                .eq('id', settingsIdData.id)
                .single();
              
              if (settingsData) {
                setSettings(settingsData);
              } else {
                // Use default settings if none found
                setSettings({ 
                  show_countdown: true,
                  max_processing_time: 60
                });
              }
            } else {
              // Use default settings if ID not found
              setSettings({ 
                show_countdown: true,
                max_processing_time: 60
              });
            }
          } catch (settingsError) {
            console.warn('Could not fetch settings, using defaults:', settingsError);
            // Fall back to defaults on error
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
  
  // Fix the useEffect to avoid infinite loops and setState during render
  useEffect(() => {
    let isMounted = true;
    
    // Async function to load data without setting state directly
    const loadInitialData = async () => {
      // Load project data and settings from localStorage first for faster rendering
      const cachedProject = localStorage.getItem('projectData');
      const cachedSettings = localStorage.getItem('projectSettings');
      const storedImageUrl = localStorage.getItem('styleFix');
      const storedGender = localStorage.getItem('styleGenderFix');
      
      let initialLoadDone = false;
      
      if (cachedProject && isMounted) {
        try {
          const parsedProject = JSON.parse(cachedProject);
          setProject(parsedProject);
          initialLoadDone = true;
        } catch (e) {
          console.error("Error parsing cached project data:", e);
        }
      }
      
      if (cachedSettings && isMounted) {
        try {
          setSettings(JSON.parse(cachedSettings));
        } catch (e) {
          console.error("Error parsing cached settings:", e);
        }
      }
      
      if (storedImageUrl && isMounted) {
        setStyleFix(storedImageUrl);
      }
      
      if (storedGender && isMounted) {
        setStyleGender(storedGender);
      }
      
      if (initialLoadDone && isMounted) {
        setLoading(false);
      }
    };
    
    // Execute the initial load
    loadInitialData();
    
    // Always fetch fresh data
    fetchProjectData();
    
    return () => {
      isMounted = false;
    };
  }, [fetchProjectData]); // Only depend on the memoized fetchProjectData
  
  const retake = () => {
    setEnabled(false);
    setVideoVisible(true); // Réactiver explicitement la vidéo
    setImageFile(null);
    setError(null);
    
    // Ajouter un délai pour s'assurer que le DOM est mis à jour
    setTimeout(() => {
      if (videoRef.current) {
        console.log("Retake: Setting video display to block");
        videoRef.current.style.display = 'block';
        videoRef.current.style.visibility = 'visible';
      }
    }, 100);
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
  
  // Add these utility functions for image processing
  // Function to fetch thumbnail from canvas_layouts
  const fetchProjectThumbnail = async (projectId) => {
    try {
      console.log('Fetching thumbnail for project:', projectId);
      
      // First check if there are any canvas_layouts for this project
      const { data: layoutsData, error: layoutsError } = await supabase
        .from('canvas_layouts')
        .select('id, orientation_id')
        .eq('project_id', projectId);
        
      if (layoutsError) {
        console.error('Error checking for layouts:', layoutsError);
        return { thumbnailUrl: null, orientationData: null };
      }
      
      if (!layoutsData || layoutsData.length === 0) {
        console.log('No layouts found for this project');
        return { thumbnailUrl: null, orientationData: null };
      }
      
      console.log(`Found ${layoutsData.length} layouts, fetching thumbnail and orientation...`);
      
      // Get the thumbnail URL and orientation_id from the most recent layout
      const { data, error } = await supabase
        .from('canvas_layouts')
        .select('thumbnail_url, orientation_id')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error) {
        console.error('Error fetching thumbnail:', error);
        return { thumbnailUrl: null, orientationData: null };
      }
      
      const thumbnailUrl = data?.thumbnail_url || null;
      const orientationId = data?.orientation_id || null;
      
      console.log('Thumbnail URL found:', thumbnailUrl || 'null');
      console.log('Orientation ID found:', orientationId || 'null');
      
      // Fetch orientation data if we have an orientation_id
      let orientationData = null;
      if (orientationId) {
        const { data: orientationResult, error: orientationError } = await supabase
          .from('photobooth_orientation')
          .select('width, height, position_x, position_y, width_encart_photo, height_encart_photo')
          .eq('id_orientation', orientationId)
          .single();
          
        if (!orientationError && orientationResult) {
          orientationData = orientationResult;
          console.log('Orientation data found:', orientationData);
        } else {
          console.error('Error fetching orientation data:', orientationError);
        }
      }
      
      return { thumbnailUrl, orientationData };
    } catch (error) {
      console.error('Exception in fetchProjectThumbnail:', error);
      return { thumbnailUrl: null, orientationData: null };
    }
  };
  
  // Function to make black background transparent and combine images
  const combineImagesWithTransparentOverlay = async (baseImageUrl, overlayImageUrl, orientationData) => {
    if (!baseImageUrl || !overlayImageUrl) {
      console.error('Missing image URLs for combination');
      return baseImageUrl;
    }

    try {
      // Chargement des deux images
      const loadImage = (url) => new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });

      const [baseImage, overlayImage] = await Promise.all([
        loadImage(baseImageUrl),
        loadImage(overlayImageUrl)
      ]);

      // Dimensions du canvas final (basées sur l'overlay)
      const canvasWidth = orientationData?.width || 970;
      const canvasHeight = orientationData?.height || 651;

      console.log(`Creating canvas with dimensions: ${canvasWidth}x${canvasHeight}`);

      // Création du canvas final
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');

      // Si nous avons des données d'orientation valides avec dimensions de l'encart photo
      if (orientationData && 
          orientationData.width_encart_photo && 
          orientationData.height_encart_photo && 
          orientationData.position_x !== undefined && 
          orientationData.position_y !== undefined) {
        
        console.log(`Using orientation data for placement: 
          x=${orientationData.position_x}, y=${orientationData.position_y}, 
          width=${orientationData.width_encart_photo}, height=${orientationData.height_encart_photo}`);
        
        // Calculer les ratios pour maintenir l'aspect ratio de l'image source
        const baseAspect = baseImage.width / baseImage.height;
        const encartAspect = orientationData.width_encart_photo / orientationData.height_encart_photo;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        // Ajuster l'image pour qu'elle s'adapte à l'encart tout en maintenant son ratio
        if (baseAspect > encartAspect) {
          // L'image est plus large (proportionnellement) que l'encart
          drawHeight = orientationData.height_encart_photo;
          drawWidth = drawHeight * baseAspect;
          offsetX = orientationData.position_x + (orientationData.width_encart_photo - drawWidth) / 2;
          offsetY = orientationData.position_y;
        } else {
          // L'image est plus haute (proportionnellement) que l'encart
          drawWidth = orientationData.width_encart_photo;
          drawHeight = drawWidth / baseAspect;
          offsetX = orientationData.position_x;
          offsetY = orientationData.position_y + (orientationData.height_encart_photo - drawHeight) / 2;
        }
        
        // Dessiner l'image de base à la position et taille calculées
        ctx.drawImage(baseImage, offsetX, offsetY, drawWidth, drawHeight);
      } else {
        // Fallback si nous n'avons pas les données d'orientation complètes
        console.log('No detailed orientation data, using default image placement');
        
        // Dessin de l'image de base (redimensionnée si besoin)
        if (baseImage.width !== canvasWidth || baseImage.height !== canvasHeight) {
          const baseAspect = baseImage.width / baseImage.height;
          const targetAspect = canvasWidth / canvasHeight;
          let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
          
          if (baseAspect > targetAspect) {
            drawHeight = canvasHeight;
            drawWidth = drawHeight * baseAspect;
            offsetX = (canvasWidth - drawWidth) / 2;
          } else {
            drawWidth = canvasWidth;
            drawHeight = drawWidth / baseAspect;
            offsetY = (canvasHeight - drawHeight) / 2;
          }
          
          ctx.drawImage(baseImage, offsetX, offsetY, drawWidth, drawHeight);
        } else {
          ctx.drawImage(baseImage, 0, 0, canvasWidth, canvasHeight);
        }
      }

      // Dessiner l'overlay par-dessus à pleine taille
      ctx.drawImage(overlayImage, 0, 0, canvasWidth, canvasHeight);

      // Exporter le résultat
      return canvas.toDataURL('image/jpeg', 0.95);
    } catch (error) {
      console.error('Error combining images:', error);
      return baseImageUrl;
    }
  };
  
  // Initialize state for image processing
  const [imageProcessing, setImageProcessing] = useState(false);
  
  const generateImageSwap = async () => {
    setNumProses(2);
    reset2();
    setProcessing(true);
    setProcessingStep(1);
    setError(null);
    setLogs([]);
    setElapsedTime(0);

    const start = Date.now();
    let progressTimer;
    try {
      // Récupérer le prompt depuis localStorage au lieu d'une image cible
      const stylePrompt = localStorage.getItem('stylePrompt');
      if (!stylePrompt) {
        setError("Prompt de style manquant. Veuillez choisir un style.");
        setProcessing(false);
        return;
      }
      
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
      
      // Timer pour simuler la progression (NE PAS STOPPER AVANT LA FIN)
      progressTimer = setInterval(() => {
          setElapsedTime(Date.now() - start);
          
          // Ajouter des messages de progression pour garder l'utilisateur informé
          const elapsedSeconds = Math.floor((Date.now() - start) / 1000);
          if (elapsedSeconds === 5) {
              setLogs(prevLogs => [...prevLogs, "Traitement de l'image en cours..."]);
              setLoadingProgress(25);
          } else if (elapsedSeconds === 10) {
              setLogs(prevLogs => [...prevLogs, "Application du style sur votre photo..."]);
              setLoadingProgress(50);
          } else if (elapsedSeconds === 15) {
              setLogs(prevLogs => [...prevLogs, "Fusion avec le layout (watermark)..."]);
              setLoadingProgress(75);
          } else {
              // Update loading progress based on elapsed time
              const maxTime = (settings?.max_processing_time || 60) * 1000;
              const timeBasedProgress = Math.min(95, (Date.now() - start) / maxTime * 100);
              setLoadingProgress(timeBasedProgress);
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
          output_format: "jpg",
          // Add width and height parameters to ensure the generated image has the correct dimensions
          width: 970,
          height: 651
        }
      };
      
      console.log('Sending request to Replicate with model:', requestBody.model);
      console.log('Requesting specific output dimensions: 970x651');
      
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
      setLogs(prevLogs => [...prevLogs, "Image générée par Replicate !"]);

      const resultImageUrl = typeof result === 'string' ? result : 
        Array.isArray(result) ? result[0] : 
        result.url || result.image || result;

      if (!resultImageUrl) {
        throw new Error("URL d'image non trouvée dans la réponse");
      }

      setLogs(prevLogs => [...prevLogs, "Récupération du layout du projet..."]);
      const { thumbnailUrl, orientationData } = await fetchProjectThumbnail(project?.id);

      let finalImageUrl = resultImageUrl;
      let hasWatermark = false;

      if (thumbnailUrl) {
        setLogs(prevLogs => [...prevLogs, "Fusion de l'image avec le layout..."]);
        setLogs(prevLogs => [...prevLogs, orientationData 
          ? "Dimensions d'encart détectées, adaptation de l'image..." 
          : "Pas de dimensions spécifiques, utilisation des valeurs par défaut..."]);
        
        setLoadingProgress(90);
        try {
          const combinedImageDataUrl = await combineImagesWithTransparentOverlay(
            resultImageUrl, 
            thumbnailUrl, 
            orientationData
          );
          
          if (combinedImageDataUrl && combinedImageDataUrl !== resultImageUrl) {
            finalImageUrl = combinedImageDataUrl;
            hasWatermark = true;
            setLogs(prevLogs => [...prevLogs, "Fusion réussie avec le layout !"]);
          } else {
            setLogs(prevLogs => [...prevLogs, "Fusion échouée, utilisation de l'image originale."]);
          }
        } catch (watermarkError) {
          setLogs(prevLogs => [...prevLogs, "Erreur lors de la fusion du layout."]);
        }
      } else {
        setLogs(prevLogs => [...prevLogs, "Aucun layout trouvé pour ce projet."]);
      }
      
      setLoadingProgress(95);

      // Préparation pour upload S3
      let uploadableImage = finalImageUrl;
      if (finalImageUrl.startsWith('http')) {
        setLogs(prevLogs => [...prevLogs, "Conversion de l'image pour l'upload S3..."]);
        try {
          uploadableImage = await toDataURL(finalImageUrl);
        } catch (convError) {
          setLogs(prevLogs => [...prevLogs, "Erreur conversion base64, upload direct."]);
        }
      }

      // Upload S3
      if (uploadableImage && uploadableImage.startsWith('data:')) {
        setLogs(prevLogs => [...prevLogs, "Envoi de l'image fusionnée vers le cloud..."]);
        const uniqueFilename = `result_${Date.now()}_${project?.id || 'unknown'}.jpg`;
        const uploadFile = dataURLtoFile(uploadableImage, uniqueFilename);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('projectId', project?.id || 'unknown');
        // --- Correction : le backend met déjà dans /layouts/ ---

        const uploadResponse = await fetch('/api/upload-to-s3', {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          setLogs(prevLogs => [...prevLogs, "Erreur lors de l'upload S3."]);
          throw new Error("Erreur upload S3");
        }
        const uploadData = await uploadResponse.json();
        if (uploadData && uploadData.url) {
          setLogs(prevLogs => [...prevLogs, "Image stockée dans le cloud !"]);
          // --- Correction : c'est l'URL S3 qui doit être affichée ---
          localStorage.setItem("faceURLResult", uploadData.url);
          localStorage.setItem("faceURLResultS3", uploadData.url);
          setLogs(prevLogs => [...prevLogs, "Image prête à être affichée !"]);
        } else {
          throw new Error("Réponse S3 invalide");
        }
      } else {
        setLogs(prevLogs => [...prevLogs, "Upload direct de l'image sans conversion."]);
        localStorage.setItem("faceURLResult", finalImageUrl);
      }

      setLoadingProgress(100);

      // Arrêter le timer de progression à la toute fin
      clearInterval(progressTimer);

      // Rediriger vers la page de résultat
      setTimeout(() => {
        setProcessing(false);
        router.push(`/photobooth-premium/${slug}/result`);
      }, 1000);

    } catch (error) {
      if (progressTimer) clearInterval(progressTimer);
      setError(error.message || "Une erreur est survenue");
      setProcessing(false);
      setLogs(prevLogs => [...prevLogs, "Erreur : " + (error.message || "inconnue")]);
    } finally {
      setElapsedTime(Date.now() - start);
      // Recharge le quota après la génération
      fetchQuota();
    }
  };


// Ajoute cette fonction pour générer l'image via Replicate
const generateImageReplicate = async () => {
  setProcessing(true);
  setError(null);
  setLogs([]);
  setElapsedTime(0);

  const start = Date.now();
  try {
    const prompt = localStorage.getItem('stylePrompt') || "portrait photo";
    const image = imageFile; // base64

    setLogs(["Envoi de la requête à Replicate..."]);

    const response = await fetch('/api/replicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "black-forest-labs/flux-kontext-pro",
        input: {
          prompt,
          input_image: image,
          output_format: "jpg",
          width: 970,
          height: 651
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Erreur Replicate");
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.error || "Erreur Replicate");

    const resultUrl = typeof data.output === 'string'
      ? data.output
      : Array.isArray(data.output)
        ? data.output[0]
        : data.output?.url || data.output?.image || data.output;

    if (!resultUrl) throw new Error("Aucune image générée");

    setLogs(["Image générée avec succès !"]);
    localStorage.setItem("faceURLResult", resultUrl);

    // --- AJOUT : ENREGISTREMENT DANS LA TABLE SESSIONS ---
    try {
      await supabase.from('sessions').insert({
        user_email: null,
        style_id: localStorage.getItem('selectedStyleId'),
        style_key: localStorage.getItem('selectedStyleKey') || null,
        gender: styleGender,
        result_image_url: resultUrl,
        processing_time_ms: Date.now() - start,
        is_success: true,
        project_id: project?.id,
        created_at: new Date().toISOString()
      });
      setLogs(logs => [...logs, "Session enregistrée dans la base."]);
    } catch (sessionError) {
      setLogs(logs => [...logs, "Erreur lors de l'enregistrement de la session."]);
      console.error("Erreur insertion session:", sessionError);
    }
    // --- FIN AJOUT ---

    setTimeout(() => {
      router.push(`/photobooth-premium/${slug}/result`);
    }, 1000);

  } catch (err) {
    setError(err.message || "Erreur lors de la génération");
    setLogs([err.message]);
    // Enregistre l'échec dans sessions pour garder la cohérence du quota
    try {
      await supabase.from('sessions').insert({
        user_email: null,
        style_id: localStorage.getItem('selectedStyleId'),
        style_key: localStorage.getItem('selectedStyleKey') || null,
        gender: styleGender,
        result_image_url: null,
        processing_time_ms: Date.now() - start,
        is_success: false,
        error_message: err.message,
        project_id: project?.id,
        created_at: new Date().toISOString()
      });
    } catch {}
  } finally {
    setProcessing(false);
    setElapsedTime(Date.now() - start);
  }
};

  // Fonction pour charger le quota (une seule version)
  const fetchQuota = useCallback(async () => {
    setQuotaLoading(true);
    try {
      if (!project?.id) {
        setQuota(null);
        setQuotaUsed(null);
        setQuotaRestant(null);
        setQuotaAtteint(false);
        setQuotaLoading(false);
        return;
      }
      // Récupérer l'admin lié au projet
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, created_by')
        .eq('id', project.id)
        .single();
      const adminUserId = projectData?.created_by;

      // Récupérer le dernier paiement pour le quota et la date de reset
      let quotaValue = 0;
      let quotaResetAt = null;
      if (adminUserId) {
        const { data: lastPayment } = await supabase
          .from('admin_payments')
          .select('photo_quota, photo_quota_reset_at')
          .eq('admin_user_id', adminUserId)
          .order('photo_quota_reset_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastPayment) {
          quotaValue = lastPayment.photo_quota || 0;
          quotaResetAt = lastPayment.photo_quota_reset_at;
        }
      }

      // Compter les sessions pour ce projet depuis le reset
      let used = 0;
      if (quotaResetAt) {
        const { count } = await supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .gte('created_at', quotaResetAt);
        used = count || 0;
      } else {
        const { count } = await supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id);
        used = count || 0;
      }

      setQuota(quotaValue);
      setQuotaUsed(used);
      setQuotaRestant(quotaValue !== null ? Math.max(0, quotaValue - used) : null);
      setQuotaAtteint(quotaValue !== null && used >= quotaValue);
    } catch (e) {
      setQuota(null);
      setQuotaUsed(null);
      setQuotaRestant(null);
      setQuotaAtteint(false);
    }
    setQuotaLoading(false);
  }, [project, supabase]);

  // Charge le quota au chargement du projet
  useEffect(() => {
    if (project && supabase) {
      fetchQuota();
    }
  }, [project, supabase, fetchQuota]);

  // Affichage du quota (inchangé)
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
    >
      <motion.div 
        className="fixed top-0 left-0 right-0 flex justify-center mt-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {project.logo_url ? (
          <div className="w-[250px] h-[100px] relative">
            <Image 
              src={project.logo_url} 
              fill
              alt={project.name} 
              className="object-contain" 
              priority 
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
      <AnimatePresence>
        {processing && (
          <motion.div 
            className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-white bg-opacity-10 backdrop-blur-md p-6 rounded-xl shadow-2xl max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <h2 
                className="text-2xl font-bold mb-2 text-center"
                style={{ color: secondaryColor }}
              >
                Création en cours...
              </h2>
              
              <p className="text-white text-center mb-4">
                Processus: {(elapsedTime / 1000).toFixed(1)} secondes
              </p>
              
              <div className="mb-6">
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <motion.div 
                    className="h-3 rounded-full" 
                    style={{ 
                      width: `${loadingProgress}%`,
                      backgroundColor: secondaryColor
                    }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ duration: 0.3 }}
                  ></motion.div>
                </div>
                <div className="mt-1 flex justify-between text-xs text-white/70">
                  <span>Début</span>
                  <span>Finalisation</span>
                </div>
              </div>
              
              <motion.div 
                className="mt-4 h-32 overflow-y-auto text-sm p-3 rounded bg-black bg-opacity-20 text-white/90"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="mb-1"
                    >
                      {log}
                    </motion.div>
                  ))
                ) : (
                  <div>Initialisation du processus...</div>
                )}
              </motion.div>
              
              {error && (
                <motion.div 
                  className="mt-4 p-3 bg-red-900 bg-opacity-20 border border-red-500 text-red-100 rounded-lg"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              )}
              
              <div className="mt-6 flex justify-center">
                <motion.button
                  onClick={() => {
                    setProcessing(false);
                    router.push(`/photobooth-premium/${slug}`);
                  }}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "white" }}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.25)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  Annuler
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className={`w-full max-w-2xl mx-auto mt-[15vh] ${processing ? 'opacity-20 pointer-events-none' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: processing ? 0.2 : 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <motion.h2 
          className="text-xl font-bold text-center mb-6"
          style={{ color: secondaryColor }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {enabled ? 'Vérifiez votre photo' : 'Prenez une photo'}
        </motion.h2>
        
        {/* Invisible retry button that can be triggered programmatically */}
        <div className="hidden">
          <button id="retryCamera" onClick={retryCamera}>Retry Camera</button>
        </div>
        
        {/* Camera viewfinder with dimensions matching result page - simple approach to ensure camera is visible */}
        <motion.div 
          className="relative mx-auto overflow-hidden rounded-lg shadow-2xl"
          style={{ 
            width: '100%',
            maxWidth: '1200px',
            aspectRatio: '970/651', // Exact aspect ratio to match final output
            border: cameraError ? '1px solid rgba(255, 0, 0, 0.5)' : 'none',
            backgroundColor: 'black'
          }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {/* Add countdown overlay */}
          <AnimatePresence>
            {showCountdown && (
              <>
                {/* Left side countdown number */}
                <motion.div 
                  className="absolute left-8 inset-y-0 z-20 flex items-center justify-center"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                >
                  <motion.div
                    key={`left-${countdownNumber}`}
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center justify-center w-24 h-24 rounded-full"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    <span className="text-6xl font-bold" style={{ color: primaryColor }}>
                      {countdownNumber}
                    </span>
                  </motion.div>
                </motion.div>
                
                {/* Center countdown animation/overlay */}
                <motion.div 
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    key={`center-${countdownNumber}`}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ 
                      scale: [1.5, 1, 1, 0.8], 
                      opacity: [0, 1, 1, 0] 
                    }}
                    transition={{ 
                      duration: 0.9,
                      times: [0, 0.2, 0.8, 1]
                    }}
                    className="flex items-center justify-center w-32 h-32 rounded-full"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    <span className="text-8xl font-bold" style={{ color: primaryColor }}>
                      {countdownNumber}
                    </span>
                  </motion.div>
                </motion.div>
                
                {/* Right side countdown number */}
                <motion.div 
                  className="absolute right-8 inset-y-0 z-20 flex items-center justify-center"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                >
                  <motion.div
                    key={`right-${countdownNumber}`}
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center justify-center w-24 h-24 rounded-full"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    <span className="text-6xl font-bold" style={{ color: primaryColor }}>
                      {countdownNumber}
                    </span>
                  </motion.div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Video element - simplified to ensure it's displayed properly */}
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover"
            style={{ 
              transform: 'scaleX(-1)', // Mirror effect for selfie mode
              display: enabled && !videoVisible ? 'none' : 'block', // Condition améliorée
              visibility: enabled && !videoVisible ? 'hidden' : 'visible', // Ajout de la visibilité explicite
              maxHeight: '75vh',
              backgroundColor: '#000' // Ajout d'un fond noir explicite
            }} 
            playsInline
            autoPlay
            muted
            onLoadedMetadata={() => {
              console.log("Video metadata loaded:", {
                videoWidth: videoRef.current?.videoWidth,
                videoHeight: videoRef.current?.videoHeight
              });
              setCameraLoaded(true);
            }}
            onError={(e) => {
              console.error("Video element error:", e);
              setCameraError("Problème d'accès à la caméra: " + (e.target.error?.message || "Erreur inconnue"));
            }}
          />
          
          {/* Canvas element - modifions la visibilité */}
          <canvas 
            ref={previewRef} 
            className="w-full h-full"
            style={{ 
              display: enabled ? 'block' : 'none',
              maxHeight: '75vh', 
              objectFit: 'contain',
              backgroundColor: '#222' // Ajout d'un fond gris foncé pour voir si le canvas est visible
            }}
          />
          
          {/* Viewfinder overlay - only show when camera is working */}
          {!enabled && cameraLoaded && (
            <motion.div 
              className="absolute inset-0 border-2 border-dashed rounded-lg pointer-events-none"
              style={{ borderColor: secondaryColor }}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: secondaryColor }}></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: secondaryColor }}></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: secondaryColor }}></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: secondaryColor }}></div>
            </motion.div>
          )}
          
          {/* Camera not available overlay */}
          {!cameraLoaded && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-opacity-70 text-center">
                <motion.div 
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  Activation de la caméra...
                </motion.div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Action buttons */}
        <motion.div 
          className="mt-8 flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {/* Affiche le bouton uniquement si quota non atteint */}
          {!enabled && !quotaAtteint ? (
            <>
              {/* Debug info for development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-3 text-xs text-white/50 text-center">
                  Camera status: {cameraLoaded ? 'Loaded' : 'Loading'} 
                  {cameraError ? ` (Error: ${cameraError.substring(0, 30)}...)` : ''}
                </div>
              )}
              
              {/* SIMPLIFIED camera button with direct approach */}
              <motion.button
                onClick={() => {
                  console.log("🔴 PHOTO button clicked, camera state:", { cameraLoaded, cameraError });
                  // Direct approach without unnecessary complexity
                  setShowCountdown(true);
                  setCountdownNumber(3);
                  setTimeout(() => setCountdownNumber(2), 1000);
                  setTimeout(() => setCountdownNumber(1), 2000);
                  setTimeout(() => {
                    setShowCountdown(false);
                    processCapture();
                  }, 3000);
                }}
                className="px-8 py-3 rounded-lg font-bold text-xl relative"
                style={{ 
                  backgroundColor: secondaryColor, 
                  color: primaryColor,
                  opacity: cameraLoaded && !showCountdown ? 1 : 0.5 
                }}
                whileHover={cameraLoaded && !showCountdown ? { scale: 1.05 } : {}}
                whileTap={cameraLoaded && !showCountdown ? { scale: 0.95 } : {}}
                disabled={!cameraLoaded || showCountdown}
              >
                {showCountdown
                  ? 'PRISE DE PHOTO...'
                  : cameraLoaded
                    ? 'PRENDRE UNE PHOTO'
                    : 'ATTENTE DE LA CAMÉRA...'}
                {cameraLoaded && !showCountdown && (
                  <motion.span
                    className="absolute inset-0 rounded-lg border-2"
                    style={{ borderColor: secondaryColor }}
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  ></motion.span>
                )}
              </motion.button>
            </>
          ) : null}

          {/* Affiche le bouton REPRENDRE et GÉNÉRER MON IMAGE si une photo est capturée */}
          {enabled && (
            <div className="flex space-x-4">
              <button 
                onClick={retake}
                className="px-6 py-3 rounded-lg font-medium"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              >
                REPRENDRE
              </button>
              <button 
                onClick={generateImageSwap} // <-- Remplace generateImageReplicate par generateImageSwap
                className="px-8 py-3 rounded-lg font-bold"
                style={{ backgroundColor: secondaryColor, color: primaryColor }}
                disabled={processing}
              >
                {processing ? "Génération..." : "GÉNÉRER MON IMAGE"}
              </button>
            </div>
          )}
          
          {/* Affichage du quota restant ou message quota atteint */}
          <div className="mb-4 text-center">
            {quotaLoading ? (
              <span className="text-white/70 text-sm">Chargement du quota...</span>
            ) : quotaAtteint ? (
              <span className="text-red-400 font-bold text-lg">Quota Atteint, veuillez recharger.</span>
            ) : quotaRestant !== null ? (
              <span className="text-white/80 text-sm">
                Quota restant : {quotaRestant} / {quota}
              </span>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}