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
    
    // Fonction spécialisée pour iPad Safari avec énumération des dispositifs
    const tryIPadSafariFrontCamera = async () => {
      try {
        console.log("🍎 Tentative spécialisée iPad Safari pour caméra frontale...");
        
        // MÉTHODE 1: Forcer directement facingMode user avec exact
        console.log("🎯 Méthode 1: Forcer facingMode: 'user' avec contrainte exacte");
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { exact: "user" }, // EXACT au lieu d'ideal
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
          console.log("✅ SUCCÈS Méthode 1: facingMode exact 'user'");
          return stream;
        } catch (err1) {
          console.log("❌ Méthode 1 échouée:", err1.message);
        }
        
        // MÉTHODE 2: Essayer sans contraintes de résolution
        console.log("🎯 Méthode 2: facingMode user sans contraintes résolution");
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user"
            }
          });
          console.log("✅ SUCCÈS Méthode 2: facingMode 'user' simple");
          return stream;
        } catch (err2) {
          console.log("❌ Méthode 2 échouée:", err2.message);
        }
        
        // MÉTHODE 3: Énumération des dispositifs pour forcer par deviceId
        console.log("🎯 Méthode 3: Énumération des dispositifs");
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        console.log("📹 Caméras disponibles:", videoDevices.map(d => ({ 
          deviceId: d.deviceId, 
          label: d.label,
          kind: d.kind 
        })));
        
        // Essayer CHAQUE caméra une par une jusqu'à trouver la frontale
        for (let i = 0; i < videoDevices.length; i++) {
          const device = videoDevices[i];
          console.log(`🔄 Test caméra ${i + 1}/${videoDevices.length}: ${device.label || device.deviceId}`);
          
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: device.deviceId },
                facingMode: "user"
              }
            });
            
            // Tester si c'est la caméra frontale en vérifiant le mirroring
            console.log(`✅ Caméra ${i + 1} accessible, test si c'est la frontale...`);
            
            // Sur iPad, la caméra frontale est généralement la première ou celle avec un label spécifique
            const label = device.label.toLowerCase();
            const isFrontCamera = label.includes('front') || 
                                 label.includes('user') || 
                                 label.includes('facetime') ||
                                 label.includes('selfie') ||
                                 i === 0; // Souvent la première sur iPad
            
            if (isFrontCamera) {
              console.log(`🎯 TROUVÉ! Caméra frontale: ${device.label || device.deviceId}`);
              return stream;
            } else {
              // Fermer cette caméra et essayer la suivante
              stream.getTracks().forEach(track => track.stop());
              console.log(`❌ Caméra ${i + 1} semble être arrière, on continue...`);
            }
          } catch (deviceErr) {
            console.log(`❌ Impossible d'accéder à la caméra ${i + 1}:`, deviceErr.message);
          }
        }
        
        // MÉTHODE 4: Dernière tentative - prendre la première caméra disponible
        if (videoDevices.length > 0) {
          console.log("🎯 Méthode 4: Dernière tentative avec première caméra");
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: videoDevices[0].deviceId
              }
            });
            console.log("✅ SUCCÈS Méthode 4: première caméra disponible");
            return stream;
          } catch (err4) {
            console.log("❌ Méthode 4 échouée:", err4.message);
          }
        }
        
        return null;
      } catch (err) {
        console.error("❌ Échec complet de la méthode spécialisée iPad Safari:", err);
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
      
      // Détecter le type d'appareil
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isTablet = /(iPad|Android(?!.*Mobile))/i.test(navigator.userAgent);
      const isIPad = /iPad/i.test(navigator.userAgent);
      const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
      
      console.log(`🔍 Device detection: Mobile=${isMobile}, Tablet=${isTablet}, iPad=${isIPad}, Safari=${isSafari}`);
      
      let stream = null;
      
      // ✅ MÉTHODE SPÉCIALISÉE POUR IPAD SAFARI
      if (isIPad && isSafari) {
        console.log("🍎 Détection iPad + Safari → Utilisation de la méthode spécialisée");
        stream = await tryIPadSafariFrontCamera();
        
        if (stream) {
          console.log("✅ Succès avec la méthode spécialisée iPad Safari");
        } else {
          console.log("⚠️ Méthode spécialisée iPad Safari échouée, fallback vers méthode standard");
        }
      }
      
      // Si la méthode spécialisée iPad n'a pas fonctionné, utiliser la méthode standard
      if (!stream) {
        console.log("⚠️ Méthode spécialisée iPad Safari échouée, fallback vers méthode standard AGRESSIVE");
        
        // Configuration options ULTRA-AGRESSIVES pour forcer la caméra frontale
        const configOptions = isMobile || isTablet || isIPad ? [
          // CONFIGURATION 1: facingMode EXACT "user" - la plus stricte
          { 
            video: { 
              facingMode: { exact: "user" }  // EXACT au lieu d'ideal - FORCE la caméra frontale
            } 
          },
          // CONFIGURATION 2: facingMode "user" avec résolution mobile
          { 
            video: { 
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          },
          // CONFIGURATION 3: facingMode "user" simple
          { 
            video: { 
              facingMode: "user"
            } 
          },
          // CONFIGURATION 4: facingMode "user" avec résolution minimum
          { 
            video: { 
              facingMode: "user",
              width: { min: 640 },
              height: { min: 480 }
            } 
          },
          // CONFIGURATION 5: Seulement en DERNIER RECOURS - n'importe quelle caméra
          { video: true }
        ] : [
          // PC: Configuration standard
          { 
            video: { 
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              aspectRatio: { ideal: 16/9 }
            } 
          },
          { 
            video: { 
              width: { min: 1280 },
              height: { min: 720 },
              aspectRatio: { ideal: 16/9 }
            } 
          },
          { 
            video: { 
              width: { min: 640 },
              height: { min: 360 },
              aspectRatio: { ideal: 16/9 }
            } 
          },
          { video: true }
        ];
        
        // Try each configuration option until one works
        for (let i = 0; i < configOptions.length; i++) {
          const config = configOptions[i];
          console.log(`🔄 Tentative configuration ${i + 1}/${configOptions.length}:`, config);
          
          stream = await tryInitCamera(config);
          if (stream) {
            console.log(`✅ SUCCÈS avec configuration ${i + 1}:`, config);
            break;
          } else {
            console.log(`❌ Échec configuration ${i + 1}`);
          }
        }
      }
      
      if (!stream) {
        console.error("❌ Could not access camera after multiple attempts");
        setCameraError("La caméra n'est pas accessible. Vérifiez que vous avez autorisé l'accès.");
        return;
      }
      
      // ✅ VALIDATION FINALE: Vérifier que nous avons bien la caméra frontale sur mobile/tablette
      if ((isMobile || isTablet || isIPad) && stream) {
        try {
          const track = stream.getVideoTracks()[0];
          const settings = track.getSettings();
          console.log("📊 Paramètres de la caméra obtenue:", {
            facingMode: settings.facingMode,
            deviceId: settings.deviceId,
            width: settings.width,
            height: settings.height,
            label: track.label
          });
          
          // Si nous n'avons pas facingMode "user", essayer de changer de caméra
          if (settings.facingMode && settings.facingMode !== "user") {
            console.log("⚠️ ATTENTION: Caméra arrière détectée, tentative de basculement vers frontale...");
            
            // Arrêter la caméra actuelle
            stream.getTracks().forEach(track => track.stop());
            
            // Réessayer avec contrainte EXACTE
            try {
              const frontStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                  facingMode: { exact: "user" }
                }
              });
              
              console.log("✅ BASCULEMENT RÉUSSI vers caméra frontale!");
              stream = frontStream;
              
              // Vérifier à nouveau
              const newTrack = frontStream.getVideoTracks()[0];
              const newSettings = newTrack.getSettings();
              console.log("📊 Nouveaux paramètres après basculement:", {
                facingMode: newSettings.facingMode,
                deviceId: newSettings.deviceId,
                label: newTrack.label
              });
            } catch (switchErr) {
              console.log("❌ Impossible de basculer vers caméra frontale:", switchErr.message);
              console.log("📱 Utilisation de la caméra disponible (peut être arrière)");
            }
          } else {
            console.log("✅ Caméra frontale confirmée!");
          }
        } catch (validationErr) {
          console.log("⚠️ Impossible de valider le type de caméra:", validationErr.message);
        }
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
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Restore camera error display for better debugging
  const [cameraError, setCameraError] = useState(null);
  
  // Détecter le type d'appareil pour l'affichage - basé sur la largeur d'écran
  const [deviceType, setDeviceType] = useState(() => {
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth;
      
      if (screenWidth <= 768) return 'mobile';  // Écrans mobiles
      if (screenWidth <= 1024) return 'tablet'; // Écrans tablettes
      return 'desktop'; // Écrans desktop
    }
    return 'desktop';
  });
  
  useEffect(() => {
    const detectDevice = () => {
      const screenWidth = window.innerWidth;
      
      if (screenWidth <= 768) {
        setDeviceType('mobile');   // Format smartphone/mobile
      } else if (screenWidth <= 1024) {
        setDeviceType('tablet');   // Format tablette
      } else {
        setDeviceType('desktop');  // Format desktop
      }
    };
    
    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  // Add missing cameraLoaded state
  const [cameraLoaded, setCameraLoaded] = useState(false);
  
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

  // Add state for redirection handling
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(0);

  // État pour gérer le basculement de caméra
  const [currentCameraFacing, setCurrentCameraFacing] = useState("user"); // "user" = frontale, "environment" = arrière
  const [switchingCamera, setSwitchingCamera] = useState(false);

  // Function to reset state when retrying
  const reset2 = () => {
    setError(null);
    setLogs([]);
    setElapsedTime(0);
    setLoadingProgress(0);
    setIsRedirecting(false);
    setRedirectCountdown(0);
    setProcessing(false);
  };

  // ✅ FONCTION POUR BASCULER ENTRE CAMÉRA FRONTALE ET ARRIÈRE
  const switchCamera = async () => {
    if (switchingCamera) return; // Éviter les appels multiples
    
    setSwitchingCamera(true);
    console.log(`🔄 Basculement de caméra: ${currentCameraFacing} → ${currentCameraFacing === "user" ? "environment" : "user"}`);
    
    try {
      // Arrêter la caméra actuelle
      if (streamCam) {
        streamCam.getTracks().forEach(track => track.stop());
        streamCam = null;
        window.localStream = null;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      // Nouvelle orientation de caméra
      const newFacing = currentCameraFacing === "user" ? "environment" : "user";
      
      // Essayer avec la nouvelle orientation
      let newStream = null;
      
      // Méthode 1: facingMode exact
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: newFacing }
          }
        });
        console.log(`✅ Basculement réussi vers ${newFacing} (méthode exact)`);
      } catch (err1) {
        console.log(`❌ Échec méthode exact pour ${newFacing}:`, err1.message);
        
        // Méthode 2: facingMode simple
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: newFacing
            }
          });
          console.log(`✅ Basculement réussi vers ${newFacing} (méthode simple)`);
        } catch (err2) {
          console.log(`❌ Échec méthode simple pour ${newFacing}:`, err2.message);
          
          // Méthode 3: Énumération et sélection par deviceId
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            console.log(`🔍 Recherche caméra ${newFacing} parmi ${videoDevices.length} dispositifs`);
            
            for (const device of videoDevices) {
              try {
                const testStream = await navigator.mediaDevices.getUserMedia({
                  video: {
                    deviceId: { exact: device.deviceId }
                  }
                });
                
                const track = testStream.getVideoTracks()[0];
                const settings = track.getSettings();
                
                console.log(`🔍 Test caméra: ${device.label || device.deviceId}, facingMode: ${settings.facingMode}`);
                
                if (settings.facingMode === newFacing || 
                    (newFacing === "user" && !settings.facingMode) || // Parfois pas de facingMode sur la frontale
                    (device.label && device.label.toLowerCase().includes(newFacing === "user" ? "front" : "back"))) {
                  newStream = testStream;
                  console.log(`✅ Caméra ${newFacing} trouvée: ${device.label || device.deviceId}`);
                  break;
                } else {
                  testStream.getTracks().forEach(track => track.stop());
                }
              } catch (deviceErr) {
                console.log(`❌ Erreur test caméra ${device.deviceId}:`, deviceErr.message);
              }
            }
          } catch (err3) {
            console.log(`❌ Échec énumération dispositifs:`, err3.message);
          }
        }
      }
      
      if (newStream) {
        // Appliquer le nouveau stream
        streamCam = newStream;
        window.localStream = newStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          await videoRef.current.play();
        }
        
        setCurrentCameraFacing(newFacing);
        setCameraError(null);
        setCameraLoaded(true);
        
        console.log(`✅ Basculement terminé vers caméra ${newFacing}`);
      } else {
        throw new Error(`Impossible de basculer vers la caméra ${newFacing}`);
      }
      
    } catch (error) {
      console.error("❌ Erreur lors du basculement de caméra:", error);
      setCameraError(`Erreur basculement: ${error.message}`);
      
      // En cas d'erreur, réessayer avec n'importe quelle caméra disponible
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        
        streamCam = fallbackStream;
        window.localStream = fallbackStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
        
        console.log("🔄 Fallback: Retour à une caméra par défaut");
      } catch (fallbackError) {
        console.error("❌ Échec complet du basculement:", fallbackError);
        setCameraError("Impossible d'accéder à une caméra");
      }
    } finally {
      setSwitchingCamera(false);
    }
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
      setCaptured(false);

      const canvas = previewRef.current;
      const video = videoRef.current;

      if (!canvas || !video) {
        console.error("Canvas or video element is null");
        setCameraError("Élément vidéo ou canvas non trouvé");
        return;
      }

      // Obtenir la taille réelle affichée du canvas (en pixels CSS)
      const container = canvas.parentNode;
      const displayWidth = container.offsetWidth;
      const displayHeight = container.offsetHeight;

      // Adapter la taille du canvas à la taille affichée
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        console.error("Could not get canvas context");
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);

      // Mirror selfie
      context.save();
      context.translate(canvas.width, 0);
      context.scale(-1, 1);

      // Calcul "cover" pour remplir le canvas sans bande noire
      const videoWidth = video.videoWidth || 1280;
      const videoHeight = video.videoHeight || 720;
      const videoAspect = videoWidth / videoHeight;
      const canvasAspect = canvas.width / canvas.height;

      let sx = 0, sy = 0, sWidth = videoWidth, sHeight = videoHeight;

      if (videoAspect > canvasAspect) {
        // Crop sur la largeur
        sWidth = videoHeight * canvasAspect;
        sx = (videoWidth - sWidth) / 2;
      } else {
        // Crop sur la hauteur
        sHeight = videoWidth / canvasAspect;
        sy = (videoHeight - sHeight) / 2;
      }

      context.drawImage(
        video,
        sx, sy, sWidth, sHeight,
        0, 0, canvas.width, canvas.height
      );

      context.restore();

      const imageDataURL = canvas.toDataURL('image/jpeg', 0.95);

      setImageFile(imageDataURL);
      localStorage.setItem("faceImage", imageDataURL);

      setEnabled(true);
      setVideoVisible(false);
      fetchQuota();
    } catch (error) {
      console.error("Error in processCapture:", error);
      setCameraError(`Erreur lors de la capture: ${error.message}`);
      setEnabled(false);
      setVideoVisible(true);
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
  
  // Function to redirect safely to result page
  const redirectToResult = useCallback(async () => {
    try {
      setLogs(logs => [...logs, "Préparation de la redirection..."]);
      
      // Précharger la page de résultat
      router.prefetch(`/photobooth-coiffure/${slug}/result`);
      
      // Attendre un peu puis rediriger
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLogs(logs => [...logs, "🚀 Redirection en cours..."]);
      
      // Fermer le popup de processing avant la redirection
      setProcessing(false);
      
      // Effectuer la redirection
      await router.push(`/photobooth-coiffure/${slug}/result`);
    } catch (error) {
      console.error("Erreur lors de la redirection:", error);
      // En cas d'erreur, fermer le popup et forcer la redirection
      setProcessing(false);
      window.location.href = `/photobooth-coiffure/${slug}/result`;
    }
  }, [router, slug]);

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
    
    // ✅ DÉMARRER LE TIMER DÈS L'OUVERTURE DU POPUP
    progressTimer = setInterval(() => {
        const elapsed = Date.now() - start;
        setElapsedTime(elapsed);
        
        // Debug: vérifier que les valeurs se mettent à jour
        console.log(`[DEBUG] Timer update: ${Math.floor(elapsed / 1000)}s, Progress: ${loadingProgress}%`);
        
        // Progression continue basée sur le temps écoulé
        const elapsedSeconds = Math.floor(elapsed / 1000);
        const maxTime = (settings?.max_processing_time || 60) * 1000;
        let timeBasedProgress;
        
        if (elapsedSeconds < 5) {
          timeBasedProgress = Math.min(20, (elapsed / 5000) * 20);
        } else if (elapsedSeconds < 10) {
          timeBasedProgress = 25 + Math.min(25, ((elapsed - 5000) / 5000) * 25);
        } else if (elapsedSeconds < 15) {
          timeBasedProgress = 50 + Math.min(25, ((elapsed - 10000) / 5000) * 25);
        } else if (elapsedSeconds < 20) {
          timeBasedProgress = 75 + Math.min(15, ((elapsed - 15000) / 5000) * 15);
        } else {
          timeBasedProgress = Math.min(95, 90 + ((elapsed - 20000) / (maxTime - 20000)) * 5);
        }
        
        setLoadingProgress(timeBasedProgress);
        console.log(`[DEBUG] Continuous progress set to ${timeBasedProgress}%`);
    }, 500); // Mettre à jour toutes les 500ms pour plus de fluidité
    
    try {
      // Récupérer le prompt depuis localStorage au lieu d'une image cible
      const stylePrompt = localStorage.getItem('stylePrompt');
      if (!stylePrompt) {
        setError("Prompt de style manquant. Veuillez choisir un style.");
        setProcessing(false);
        return;
      }
      
      // Log pour débogage des variables d'entrée
      console.group("[AI] Request Details (generateImageSwap)");
      console.log('Model:', "black-forest-labs/flux-kontext-pro");
      console.log('Prompt:', stylePrompt);
      console.log('Input image present:', !!imageFile);
      console.log('Input image size:', imageFile ? `${imageFile.length.toLocaleString()} chars` : 0);
      console.log('Project ID:', project?.id);
      console.log('Slug:', slug);
      console.log('Image header:', imageFile ? imageFile.substring(0, 50) + '...' : 'N/A');
      console.groupEnd();
      
      // Ajouter à la liste des logs
      setLogs(prevLogs => [...prevLogs, "Préparation de l'image..."]);
      
      // Vérifier que l'image base64 est correctement formée
      if (!imageFile || !imageFile.startsWith('data:image')) {
          throw new Error("L'image capturée n'est pas valide. Veuillez réessayer.");
      }
      
      // Ajouter un log pour suivre la progression
      setLogs(prevLogs => [...prevLogs, "Initialisation de la requête API..."]);
      
      // Ajouter des messages de progression basés sur le temps écoulé
      setTimeout(() => {
        setLogs(prevLogs => [...prevLogs, "Traitement de l'image en cours..."]);
      }, 5000);
      
      setTimeout(() => {
        setLogs(prevLogs => [...prevLogs, "Application du style sur votre photo..."]);
      }, 10000);
      
      setTimeout(() => {
        setLogs(prevLogs => [...prevLogs, "Fusion avec le layout (watermark)..."]);
      }, 15000);
      
      // Utiliser l'API proxy Next.js au lieu d'appeler directement
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
      
      // Exposer une version safe du payload pour debug (sans le base64 complet)
      window.debugPayload = {
        ...requestBody,
        input: {
          ...requestBody.input,
          input_image: imageFile ? `${imageFile.substring(0, 30)}... (length: ${imageFile.length})` : null
        }
      };
      console.log('[AI] Payload summary:', window.debugPayload);
      
      console.log('[AI] Starting request to /api/replicate...');
      setLogs(prevLogs => [...prevLogs, "Connexion au serveur IA ."]);
      
      const fetchStart = Date.now();
      let response;
      try {
        response = await fetch('/api/replicate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      } catch (networkErr) {
        console.error('[AI] Network error during fetch:', networkErr);
        setLogs(prevLogs => [...prevLogs, `Erreur réseau: ${networkErr.message}`]);
        throw new Error(`Erreur réseau: ${networkErr.message}`);
      }
      
      const responseTime = Date.now() - fetchStart;
      console.log(`[AI] Response received after ${responseTime}ms`);
      console.log(`[AI] Status: ${response.status} ${response.statusText}`);
      
      // Log response headers
      try {
        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        console.log('[AI] Response headers:', headers);
      } catch (headerErr) {
        console.warn('[AI] Could not log headers:', headerErr);
      }
      
      // Check if the request was successful
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (textErr) {
          console.error('[AI] Could not read error text:', textErr);
        }
        
        console.error('[AI] HTTP Error Response:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText?.substring(0, 500)
        });
        
        setLogs(prevLogs => [...prevLogs, `Erreur HTTP ${response.status}: ${errorText?.substring(0, 100)}`]);
        throw new Error(`Erreur du serveur: ${response.status} ${errorText}`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error('[AI] JSON parse error:', parseErr);
        let rawText = '';
        try {
          rawText = await response.text();
        } catch (textErr) {
          console.error('[AI] Could not read response as text:', textErr);
        }
        console.log('[AI] Raw response:', rawText?.substring(0, 500));
        setLogs(prevLogs => [...prevLogs, 'Réponse invalide du serveur']);
        throw new Error(`Réponse invalide du serveur: ${rawText?.substring(0, 200)}`);
      }
      
      console.log('[AI] Successfully parsed JSON response:', data);
      
      if (!data.success) {
        console.error('[AI] API indicated failure:', data.error);
        setLogs(prevLogs => [...prevLogs, `Erreur API: ${data.error || "Erreur inconnue"}`]);
        throw new Error(data.error || "Erreur lors de la génération de l'image");
      }
      
      const result = data.output;
      console.log('[AI] Output received:', typeof result, result ? 'present' : 'missing');
      setLogs(prevLogs => [...prevLogs, "Image générée par Intelligence Artificielle !"]);

      let resultImageUrl = typeof result === 'string' ? result : 
        Array.isArray(result) ? result[0] : 
        result?.url || result?.image || result;

      if (!resultImageUrl) {
        console.error('[AI] Missing image URL in response. Full output:', result);
        throw new Error("URL d'image non trouvée dans la réponse");
      }
      
      console.log('[AI] Final image URL:', resultImageUrl);
      setLogs(prevLogs => [...prevLogs, "URL d'image reçue avec succès !"]);

      // 2. Ajout du layout (watermark) si disponible
      setLogs(logs => [...logs, "Récupération du layout du projet..."]);
      const { thumbnailUrl, orientationData } = await fetchProjectThumbnail(project?.id);

      let finalImageUrl = resultImageUrl;
      let hasWatermark = false;

      if (thumbnailUrl) {
        setLogs(logs => [...logs, "Fusion de l'image avec le layout..."]);
        setLogs(logs => [...logs, orientationData 
          ? "Dimensions d'encart détectées, adaptation de l'image..." 
          : "Pas de dimensions spécifiques, utilisation des valeurs par défaut..."]);
        try {
          const combinedImageDataUrl = await combineImagesWithTransparentOverlay(
            resultImageUrl, 
            thumbnailUrl, 
            orientationData
          );
          if (combinedImageDataUrl && combinedImageDataUrl !== resultImageUrl) {
            finalImageUrl = combinedImageDataUrl;
            hasWatermark = true;
            setLogs(logs => [...logs, "Fusion réussie avec le layout !"]);
          } else {
            setLogs(logs => [...logs, "Fusion échouée, utilisation de l'image originale."]);
          }
        } catch (watermarkError) {
          setLogs(logs => [...logs, "Erreur lors de la fusion du layout."]);
        }
      } else {
        setLogs(logs => [...logs, "Aucun layout trouvé pour ce projet."]);
      }
      
      // 3. Upload S3 si besoin
      let resultS3Url = null;
      let uploadableImage = finalImageUrl;
      if (finalImageUrl.startsWith('http')) {
        setLogs(logs => [...logs, "Conversion de l'image pour l'upload S3..."]);
        try {
          uploadableImage = await toDataURL(finalImageUrl);
        } catch (convError) {
          setLogs(logs => [...logs, "Erreur conversion base64, upload direct."]);
        }
      }

      if (uploadableImage && uploadableImage.startsWith('data:')) {
        setLogs(logs => [...logs, "Envoi de l'image fusionnée vers le cloud..."]);
        const uniqueFilename = `result_${Date.now()}_${project?.id || 'unknown'}.jpg`;
        const uploadFile = dataURLtoFile(uploadableImage, uniqueFilename);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('projectId', project?.id || 'unknown');

        const uploadResponse = await fetch('/api/upload-to-s3', {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          setLogs(logs => [...logs, "Erreur lors de l'upload S3."]);
          throw new Error("Erreur upload S3");
        }
        const uploadData = await uploadResponse.json();
        if (uploadData && uploadData.url) {
          setLogs(logs => [...logs, "Image stockée dans le cloud !"]);
          localStorage.setItem("faceURLResult", uploadData.url);
          localStorage.setItem("faceURLResultS3", uploadData.url);
          resultS3Url = uploadData.url;
          setLogs(logs => [...logs, "Image prête à être affichée !"]);
          
          // ✅ ARRÊTER LE TIMER APRÈS L'UPLOAD S3 RÉUSSI
          if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
            console.log('[DEBUG] Timer arrêté après upload S3 réussi');
          }
        } else {
          throw new Error("Réponse S3 invalide");
        }
      } else {
        setLogs(logs => [...logs, "Upload direct de l'image sans conversion."]);
        localStorage.setItem("faceURLResult", finalImageUrl);
        
        // ✅ ARRÊTER LE TIMER APRÈS L'UPLOAD DIRECT
        if (progressTimer) {
          clearInterval(progressTimer);
          progressTimer = null;
          console.log('[DEBUG] Timer arrêté après upload direct');
        }
      }

      // Gestion de la redirection après succès
      setLogs(logs => [...logs, "Préparation de la redirection..."]);
      setLoadingProgress(100);
      
      // Démarrer le countdown de redirection
      setIsRedirecting(true);
      setRedirectCountdown(3);
      
      // ✅ REDIRECTION DIRECTE AVEC ROUTER.PUSH APRÈS COUNTDOWN
      const countdownInterval = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            // Effectuer la redirection immédiatement avec router.push
            console.log("🚀 Redirection vers /result...");
            setProcessing(false); // Fermer le popup avant redirection
            router.push(`/photobooth-coiffure/${slug}/result`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Erreur dans generateImageSwap:", err);
      setError(err.message || "Erreur lors de la génération");
      setLogs([err.message]);
      setLoadingProgress(0);
      setProcessing(false); // Arrêter le processing en cas d'erreur
      
      // ✅ ARRÊTER LE TIMER EN CAS D'ERREUR IMMÉDIATEMENT
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
        console.log('[DEBUG] Timer arrêté à cause d\'une erreur');
      }
      
      // Enregistre l'échec dans sessions pour garder la cohérence du quota
      try {
        const sessionPayload = {
          user_email: null,
          style_id: localStorage.getItem('selectedStyleId'),
          style_key: localStorage.getItem('selectedStyleKey') || null,
          gender: styleGender,
          result_image_url: null,
          result_s3_url: null,
          processing_time_ms: Date.now() - start,
          is_success: false,
          error_message: err.message,
          project_id: project?.id,
          created_by: null,
          has_watermark: false,
          moderation: null,
          created_at: new Date().toISOString()
        };

        console.log("===> [DEBUG] Tentative d'insertion d'une session en échec avec payload :", sessionPayload);

        const { data: sessionInsertData, error: sessionInsertError, status, statusText } = await supabase
          .from('sessions')
          .insert(sessionPayload)
          .select();

        console.log("===> [DEBUG] Résultat insertion session (échec) :", {
          sessionInsertData,
          sessionInsertError,
          status,
          statusText
        });

        if (sessionInsertError) {
          console.error("===> [DEBUG] Erreur lors de l'insertion (échec) dans sessions:", sessionInsertError);
        } else {
          console.log("===> [DEBUG] Insertion session (échec) réussie:", sessionInsertData);
        }
      } catch (e) {
        console.error("===> [DEBUG] Erreur insertion session (échec, catch):", e);
      }
    } finally {
      // ✅ SÉCURITÉ : Arrêter le timer s'il n'a pas encore été arrêté
      if (progressTimer) {
        clearInterval(progressTimer);
        console.log('[DEBUG] Timer arrêté en sécurité dans finally');
      }
      
      // Mettre à jour le temps final
      setElapsedTime(Date.now() - start);
    }
  };
  

// Remplace la fonction generateImageReplicate par la version suivante avec logs détaillés
const generateImageReplicate = async () => {
  setProcessing(true);
  setError(null);
  setLogs([]);
  setElapsedTime(0);

  const start = Date.now();
  let progressTimer;
  
  // ✅ DÉMARRER LE TIMER DÈS L'OUVERTURE DU POPUP
  progressTimer = setInterval(() => {
      const elapsed = Date.now() - start;
      setElapsedTime(elapsed);
      
      console.log(`[DEBUG] Timer update (Replicate): ${Math.floor(elapsed / 1000)}s`);
      
      // Progression continue basée sur le temps écoulé
      const elapsedSeconds = Math.floor(elapsed / 1000);
      const maxTime = (settings?.max_processing_time || 60) * 1000;
      let timeBasedProgress;
      
      if (elapsedSeconds < 5) {
        timeBasedProgress = Math.min(20, (elapsed / 5000) * 20);
      } else if (elapsedSeconds < 10) {
        timeBasedProgress = 25 + Math.min(25, ((elapsed - 5000) / 5000) * 25);
      } else if (elapsedSeconds < 15) {
        timeBasedProgress = 50 + Math.min(25, ((elapsed - 10000) / 5000) * 25);
      } else if (elapsedSeconds < 20) {
        timeBasedProgress = 75 + Math.min(15, ((elapsed - 15000) / 5000) * 15);
      } else {
        timeBasedProgress = Math.min(95, 90 + ((elapsed - 20000) / (maxTime - 20000)) * 5);
      }
      
      setLoadingProgress(timeBasedProgress);
  }, 500);
  
  try {
    console.log("===> [DEBUG] Bouton 'GÉNÉRER MON IMAGE' cliqué, lancement de generateImageReplicate");

    const prompt = localStorage.getItem('stylePrompt') || "portrait photo";
    const image = imageFile; // base64

    // Logs détaillés avant envoi
    console.group('[AI] Request (generateImageReplicate)');
    console.log('Model:', 'black-forest-labs/flux-kontext-pro');
    console.log('Prompt:', prompt);
    console.log('Input image present:', !!image);
    console.log('Input image size:', image ? `${image.length.toLocaleString()} chars` : 0);
    console.log('Project ID:', project?.id);
    console.log('Slug:', slug);
    console.log('Image header:', image ? image.substring(0, 50) + '...' : 'N/A');
    console.groupEnd();

    setLogs(["Envoi de la requête au serveur IA..."]);
    
    // Ajouter des messages de progression basés sur le temps écoulé
    setTimeout(() => {
      setLogs(prevLogs => [...prevLogs, "Traitement de l'image en cours..."]);
    }, 5000);
    
    setTimeout(() => {
      setLogs(prevLogs => [...prevLogs, "Application du style sur votre photo..."]);
    }, 10000);
    
    setTimeout(() => {
      setLogs(prevLogs => [...prevLogs, "Fusion avec le layout (watermark)..."]);
    }, 15000);

    const reqBody = {
      model: "black-forest-labs/flux-kontext-pro",
      input: {
        prompt,
        input_image: image,
        output_format: "jpg",
        width: 970,
        height: 651
      }
    };

    // Version sûre pour le debug (sans base64 complet)
    window.debugPayload = {
      ...reqBody,
      input: {
        ...reqBody.input,
        input_image: image ? `${image.substring(0, 30)}... (length: ${image.length})` : null
      }
    };
    console.log('[AI] Payload summary:', window.debugPayload);

    console.log('[AI] Starting request to /api/replicate...');
    setLogs(prev => [...prev, "Connexion au serveur IA..."]);

    const fetchStart = Date.now();
    let response;
    try {
      response = await fetch('/api/replicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
    } catch (networkErr) {
      console.error('[AI] Network error:', networkErr);
      setLogs(prev => [...prev, `Erreur réseau: ${networkErr.message}`]);
      throw new Error(`Erreur réseau: ${networkErr.message}`);
    }

    const responseTime = Date.now() - fetchStart;
    console.log(`[AI] Response received after ${responseTime}ms`);
    console.log(`[AI] Status: ${response.status} ${response.statusText}`);
    
    // Log response headers
    try {
      const headers = {};
      response.headers.forEach((value, key) => { headers[key] = value; });
      console.log('[Replicate] Response headers:', headers);
    } catch {}

    if (!response.ok) {
      let errorText = '';
      try { errorText = await response.text(); } catch {}
      console.error('[Replicate] HTTP Error:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText?.substring(0, 500)
      });
      setLogs(prev => [...prev, `Erreur HTTP ${response.status}: ${errorText?.substring(0, 100)}`]);
      throw new Error(errorText || "Erreur Replicate");
    }

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      console.error('[Replicate] JSON parse error:', parseErr);
      let rawText = '';
      try { rawText = await response.text(); } catch {}
      console.log('[Replicate] Raw response:', rawText?.substring(0, 500));
      setLogs(prev => [...prev, 'Réponse invalide du serveur Replicate']);
      throw new Error(`Réponse invalide de Replicate: ${rawText?.substring(0, 200)}`);
    }

    console.log('[Replicate] Successfully parsed JSON response:', data);

    if (!data.success) {
      console.error('[Replicate] API indicated failure:', data.error);
      setLogs(prev => [...prev, `Erreur API: ${data.error || "Erreur inconnue"}`]);
      throw new Error(data.error || "Erreur Replicate");
    }

    let resultUrl = typeof data.output === 'string'
      ? data.output
      : Array.isArray(data.output)
        ? data.output[0]
        : data.output?.url || data.output?.image || data.output;

    if (!resultUrl) {
      console.error('[Replicate] Missing image URL. Full output:', data.output);
      throw new Error("Aucune image générée");
    }

    console.log('[Replicate] Final image URL:', resultUrl);
    setLogs(["Image générée avec succès !"]);
    localStorage.setItem("faceURLResult", resultUrl);

    // 2. Ajout du layout (watermark) si disponible
    setLogs(logs => [...logs, "Récupération du layout du projet..."]);
    const { thumbnailUrl, orientationData } = await fetchProjectThumbnail(project?.id);

    let finalImageUrl = resultUrl;
    let hasWatermark = false;

    if (thumbnailUrl) {
      setLogs(logs => [...logs, "Fusion de l'image avec le layout..."]);
      setLogs(logs => [...logs, orientationData 
        ? "Dimensions d'encart détectées, adaptation de l'image..." 
        : "Pas de dimensions spécifiques, utilisation des valeurs par défaut..."]);
      try {
        const combinedImageDataUrl = await combineImagesWithTransparentOverlay(
          resultUrl, 
          thumbnailUrl, 
          orientationData
        );
        if (combinedImageDataUrl && combinedImageDataUrl !== resultUrl) {
          finalImageUrl = combinedImageDataUrl;
          hasWatermark = true;
          setLogs(logs => [...logs, "Fusion réussie avec le layout !"]);
        } else {
          setLogs(logs => [...logs, "Fusion échouée, utilisation de l'image originale."]);
        }
      } catch (watermarkError) {
        setLogs(logs => [...logs, "Erreur lors de la fusion du layout."]);
      }
    } else {
      setLogs(logs => [...logs, "Aucun layout trouvé pour ce projet."]);
    }
    
    // 3. Upload S3 si besoin
    let resultS3Url = null;
    let uploadableImage = finalImageUrl;
    if (finalImageUrl.startsWith('http')) {
      setLogs(logs => [...logs, "Conversion de l'image pour l'upload S3..."]);
      try {
        uploadableImage = await toDataURL(finalImageUrl);
      } catch (convError) {
        setLogs(logs => [...logs, "Erreur conversion base64, upload direct."]);
      }
    }

    if (uploadableImage && uploadableImage.startsWith('data:')) {
      setLogs(logs => [...logs, "Envoi de l'image fusionnée vers le cloud..."]);
      const uniqueFilename = `result_${Date.now()}_${project?.id || 'unknown'}.jpg`;
      const uploadFile = dataURLtoFile(uploadableImage, uniqueFilename);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('projectId', project?.id || 'unknown');

      const uploadResponse = await fetch('/api/upload-to-s3', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        setLogs(logs => [...logs, "Erreur lors de l'upload S3."]);
        throw new Error("Erreur upload S3");
      }
      const uploadData = await uploadResponse.json();
      if (uploadData && uploadData.url) {
        setLogs(logs => [...logs, "Image stockée dans le cloud !"]);
        localStorage.setItem("faceURLResult", uploadData.url);
        localStorage.setItem("faceURLResultS3", uploadData.url);
        resultS3Url = uploadData.url;
        setLogs(logs => [...logs, "Image prête à être affichée !"]);
        
        // ✅ ARRÊTER LE TIMER APRÈS L'UPLOAD S3 RÉUSSI
        if (progressTimer) {
          clearInterval(progressTimer);
          progressTimer = null;
          console.log('[DEBUG] Timer arrêté après upload S3 réussi (Replicate)');
        }
      } else {
        throw new Error("Réponse S3 invalide");
      }
    } else {
      setLogs(logs => [...logs, "Upload direct de l'image sans conversion."]);
      localStorage.setItem("faceURLResult", finalImageUrl);
      
      // ✅ ARRÊTER LE TIMER APRÈS L'UPLOAD DIRECT
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
        console.log('[DEBUG] Timer arrêté après upload direct (Replicate)');
      }
    }

    // Enregistrement dans la table sessions (identique pour les deux cas)
    try {
      const sessionPayload = {
        user_email: null,
        style_id: localStorage.getItem('selectedStyleId'),
        style_key: localStorage.getItem('selectedStyleKey') || null,
        gender: styleGender,
        result_image_url: finalImageUrl,
        result_s3_url: resultS3Url,
        processing_time_ms: Date.now() - start,
        is_success: true,
        error_message: null,
        project_id: project?.id,
        created_by: null,
        has_watermark: hasWatermark,
        moderation: null,
        created_at: new Date().toISOString()
      };

      console.log("===> [DEBUG] Tentative d'insertion dans la table sessions avec payload :", sessionPayload);

      const { data: sessionInsertData, error: sessionInsertError, status, statusText } = await supabase
        .from('sessions')
        .insert(sessionPayload)
        .select();

      console.log("===> [DEBUG] Résultat insertion sessions :", {
        sessionInsertData,
        sessionInsertError,
        status,
        statusText
      });

      if (sessionInsertError) {
        setLogs(logs => [...logs, "Erreur lors de l'enregistrement de la session."]);
        console.error("===> [DEBUG] Erreur lors de l'insertion dans sessions:", sessionInsertError);
      } else {
        setLogs(logs => [...logs, "Session enregistrée dans la base."]);
        console.log("===> [DEBUG] Insertion sessions réussie:", sessionInsertData);
      }
    } catch (sessionError) {
      setLogs(logs => [...logs, "Erreur lors de l'enregistrement de la session."]);
      console.error("===> [DEBUG] Erreur insertion session (catch):", sessionError);
    }

    // Gestion de la redirection après succès
    setLogs(logs => [...logs, "Préparation de la redirection..."]);
    setLoadingProgress(100);
    
    // Démarrer le countdown de redirection
    setIsRedirecting(true);
    setRedirectCountdown(3);
    
    // ✅ REDIRECTION DIRECTE AVEC ROUTER.PUSH APRÈS COUNTDOWN
    const countdownInterval = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Effectuer la redirection immédiatement avec router.push
          console.log("🚀 Redirection vers /result...");
          setProcessing(false); // Fermer le popup avant redirection
          router.push(`/photobooth-coiffure/${slug}/result`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

  } catch (err) {
    setError(err.message || "Erreur lors de la génération");
    setLogs([err.message]);
    setIsRedirecting(false);
    setRedirectCountdown(0);
    setProcessing(false);
    
    // ✅ ARRÊTER LE TIMER EN CAS D'ERREUR IMMÉDIATEMENT
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
      console.log('[DEBUG] Timer arrêté à cause d\'une erreur (Replicate)');
    }
    // Enregistre l'échec dans sessions pour garder la cohérence du quota
    try {
      const sessionPayload = {
        user_email: null,
        style_id: localStorage.getItem('selectedStyleId'),
        style_key: localStorage.getItem('selectedStyleKey') || null,
        gender: styleGender,
        result_image_url: null,
        result_s3_url: null,
        processing_time_ms: Date.now() - start,
        is_success: false,
        error_message: err.message,
        project_id: project?.id,
        created_by: null,
        has_watermark: false,
        moderation: null,
        created_at: new Date().toISOString()
      };

      console.log("===> [DEBUG] Tentative d'insertion d'une session en échec avec payload :", sessionPayload);

      const { data: sessionInsertData, error: sessionInsertError, status, statusText } = await supabase
        .from('sessions')
        .insert(sessionPayload)
        .select();

      console.log("===> [DEBUG] Résultat insertion session (échec) :", {
        sessionInsertData,
        sessionInsertError,
        status,
        statusText
      });

      if (sessionInsertError) {
        console.error("===> [DEBUG] Erreur lors de l'insertion (échec) dans sessions:", sessionInsertError);
      } else {
        console.log("===> [DEBUG] Insertion session (échec) réussie:", sessionInsertData);
      }
    } catch (e) {
      console.error("===> [DEBUG] Erreur insertion session (échec, catch):", e);
    }
  } finally {
    // ✅ SÉCURITÉ : Arrêter le timer s'il n'a pas encore été arrêté
    if (progressTimer) {
      clearInterval(progressTimer);
      console.log('[DEBUG] Timer arrêté en sécurité dans finally (Replicate)');
    }
    
    // Mettre à jour le temps final
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
      className="flex fixed h-full w-full overflow-hidden flex-col items-center justify-center pt-2 pb-4 px-5 relative"
    >
      

      {/* Processing Overlay Web 3.0 */}
      <AnimatePresence>
        {processing && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%)',
              backdropFilter: 'blur(10px)'
            }}
          >
            {/* Container principal du modal */}
            <motion.div 
              className="relative w-full max-w-lg mx-auto"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ 
                type: "spring", 
                damping: 20, 
                stiffness: 300,
                duration: 0.6 
              }}
            >
              {/* Background avec effet glassmorphism */}
              <div 
                className="relative overflow-hidden rounded-3xl p-8 shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
                }}
              >
                {/* Animated background gradient */}
                <motion.div
                  className="absolute inset-0 opacity-30"
                  animate={{
                    background: [
                      'linear-gradient(45deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3))',
                      'linear-gradient(45deg, rgba(59, 130, 246, 0.3), rgba(16, 185, 129, 0.3))',
                      'linear-gradient(45deg, rgba(16, 185, 129, 0.3), rgba(139, 92, 246, 0.3))'
                    ]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Particules flottantes */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`particle-${i}`}
                    className="absolute w-2 h-2 rounded-full bg-white/20"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [0, -20, 0],
                      opacity: [0.2, 0.8, 0.2],
                      scale: [1, 1.5, 1],
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                      ease: "easeInOut"
                    }}
                  />
                ))}

                {/* Contenu principal */}
                <div className="relative z-10 text-center">
                  {/* Logo avec cercles rotatifs et points */}
                  <motion.div
                    className="relative mb-6 mx-auto w-32 h-32 flex items-center justify-center"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                  >
                    {/* Cercle principal central */}
                    <motion.div
                      className="relative w-20 h-20 rounded-full flex items-center justify-center z-10"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}90, ${secondaryColor}90)`,
                        border: '3px solid rgba(255,255,255,0.4)',
                        boxShadow: `0 0 40px ${primaryColor}50, inset 0 0 20px rgba(255,255,255,0.2)`
                      }}
                      animate={{ 
                        scale: [1, 1.1, 1],
                        boxShadow: [
                          `0 0 40px ${primaryColor}50, inset 0 0 20px rgba(255,255,255,0.2)`,
                          `0 0 60px ${primaryColor}70, inset 0 0 30px rgba(255,255,255,0.3)`,
                          `0 0 40px ${primaryColor}50, inset 0 0 20px rgba(255,255,255,0.2)`
                        ]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      {/* Icône centrale moderne et professionnelle */}
                      <motion.div
                        className="text-white flex items-center justify-center"
                        animate={{ 
                          rotate: [0, 360],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                          scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                        }}
                      >
                        {/* Icône géométrique moderne - hexagone avec point central */}
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                          <motion.path
                            d="M16 4L25.856 9V23L16 28L6.144 23V9L16 4Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="rgba(255,255,255,0.1)"
                            animate={{
                              strokeDasharray: ["0 100", "50 100", "100 100"],
                              strokeDashoffset: [0, -25, -50]
                            }}
                            transition={{
                              duration: 4,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                          <motion.circle
                            cx="16"
                            cy="16"
                            r="3"
                            fill="currentColor"
                            animate={{
                              scale: [1, 1.3, 1],
                              opacity: [0.8, 1, 0.8]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                          <motion.circle
                            cx="16"
                            cy="16"
                            r="6"
                            stroke="currentColor"
                            strokeWidth="1"
                            fill="none"
                            opacity="0.5"
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.3, 0.7, 0.3]
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.5
                            }}
                          />
                        </svg>
                      </motion.div>
                    </motion.div>

                    {/* Premier cercle externe avec 6 points */}
                    <motion.div
                      className="absolute inset-0 w-32 h-32"
                      animate={{ rotate: [0, 360] }}
                      transition={{ 
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      {[...Array(6)].map((_, i) => {
                        const angle = (i * 60) * (Math.PI / 180);
                        const radius = 55;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        return (
                          <motion.div
                            key={`outer-dot-${i}`}
                            className="absolute w-3 h-3 rounded-full"
                            style={{
                              background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})`,
                              left: '50%',
                              top: '50%',
                              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                              boxShadow: `0 0 15px ${primaryColor}80`
                            }}
                            animate={{
                              scale: [0.8, 1.3, 0.8],
                              opacity: [0.7, 1, 0.7]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: i * 0.2,
                              ease: "easeInOut"
                            }}
                          />
                        );
                      })}
                    </motion.div>

                    {/* Deuxième cercle externe avec 8 points (rotation inverse) */}
                    <motion.div
                      className="absolute inset-0 w-32 h-32"
                      animate={{ rotate: [360, 0] }}
                      transition={{ 
                        duration: 12,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      {[...Array(8)].map((_, i) => {
                        const angle = (i * 45) * (Math.PI / 180);
                        const radius = 42;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        return (
                          <motion.div
                            key={`middle-dot-${i}`}
                            className="absolute w-2 h-2 rounded-full"
                            style={{
                              background: `rgba(255,255,255,0.9)`,
                              left: '50%',
                              top: '50%',
                              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                              boxShadow: '0 0 10px rgba(255,255,255,0.8)'
                            }}
                            animate={{
                              scale: [0.5, 1.2, 0.5],
                              opacity: [0.5, 1, 0.5]
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: "easeInOut"
                            }}
                          />
                        );
                      })}
                    </motion.div>

                    {/* Troisième cercle interne avec 4 points */}
                    <motion.div
                      className="absolute inset-0 w-32 h-32"
                      animate={{ rotate: [0, 360] }}
                      transition={{ 
                        duration: 6,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      {[...Array(4)].map((_, i) => {
                        const angle = (i * 90) * (Math.PI / 180);
                        const radius = 28;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        return (
                          <motion.div
                            key={`inner-dot-${i}`}
                            className="absolute w-2.5 h-2.5 rounded-full"
                            style={{
                              background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`,
                              left: '50%',
                              top: '50%',
                              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                              boxShadow: `0 0 12px ${secondaryColor}70`
                            }}
                            animate={{
                              scale: [0.8, 1.4, 0.8],
                              opacity: [0.8, 1, 0.8],
                              rotate: [0, 180, 360]
                            }}
                            transition={{
                              duration: 2.5,
                              repeat: Infinity,
                              delay: i * 0.3,
                              ease: "easeInOut"
                            }}
                          />
                        );
                      })}
                    </motion.div>

                    {/* Anneaux de pulsation externe */}
                    {[...Array(2)].map((_, i) => (
                      <motion.div
                        key={`pulse-ring-${i}`}
                        className="absolute rounded-full border border-white/30"
                        style={{
                          width: `${140 + i * 20}px`,
                          height: `${140 + i * 20}px`,
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}
                        animate={{
                          scale: [0.8, 1.2, 0.8],
                          opacity: [0.6, 0.1, 0.6],
                        }}
                        transition={{
                          duration: 3 + i * 0.5,
                          repeat: Infinity,
                          delay: i * 1,
                          ease: "easeOut"
                        }}
                      />
                    ))}
                  </motion.div>

                  {/* Titre principal */}
                  <motion.h2 
                    className="text-2xl font-bold text-white mb-3"
                    style={{
                      background: 'linear-gradient(135deg, #ffffff, #e0e0e0)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: '0 0 20px rgba(255,255,255,0.5)'
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  >
                    IA en cours de création...
                  </motion.h2>

                  {/* Sous-titre */}
                  <motion.p 
                    className="text-white/80 text-sm mb-6 leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    Notre intelligence artificielle transforme votre photo
                    <br />
                    <span className="text-white/60">Veuillez patienter...</span>
                  </motion.p>

                  {/* Timer futuriste */}
                  <motion.div 
                    className="flex items-center justify-center gap-3 mb-6"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                  >
                    <div 
                      className="px-4 py-2 rounded-full text-white font-mono text-lg"
                      style={{
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)'
                      }}
                    >
                      <motion.span
                        className="inline-flex items-center justify-center"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        {/* Icône timer moderne */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                          <motion.circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            animate={{
                              strokeDasharray: ["0 63", "31.5 63", "63 63"],
                              rotate: [0, 360]
                            }}
                            transition={{
                              strokeDasharray: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                              rotate: { duration: 4, repeat: Infinity, ease: "linear" }
                            }}
                          />
                          <motion.path
                            d="M12 6V12L16 16"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            animate={{
                              opacity: [0.7, 1, 0.7]
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                        </svg>
                      </motion.span>
                      {" "}
                      <motion.span
                        key={Math.floor(elapsedTime / 1000)} // Re-render on change
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {Math.floor(elapsedTime / 1000)}s
                      </motion.span>
                    </div>
                  </motion.div>

                  {/* Barre de progression futuriste */}
                  <motion.div 
                    className="mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.6 }}
                  >
                    <div 
                      className="relative w-full h-3 rounded-full overflow-hidden mb-3"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'
                      }}
                    >
                      <motion.div 
                        className="h-full rounded-full relative overflow-hidden"
                        style={{ 
                          background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
                          boxShadow: `0 0 10px ${primaryColor}50`,
                          width: `${loadingProgress}%`
                        }}
                        initial={{ width: "0%" }}
                        animate={{ width: `${loadingProgress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      >
                        {/* Effet de brillance */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </motion.div>
                    </div>

                    {/* Pourcentage avec animation */}
                    <motion.div 
                      className="text-white/90 font-semibold text-lg"
                      key={Math.round(loadingProgress)} // Re-render on change
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {Math.round(loadingProgress)}%
                      <span className="text-white/60 text-sm ml-1">terminé</span>
                    </motion.div>
                  </motion.div>

                  {/* Logs avec effet de défilement */}
                  {logs.length > 0 && (
                    <motion.div 
                      className="max-h-24 overflow-hidden"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ delay: 1.1, duration: 0.6 }}
                    >
                      <div className="space-y-2">
                        {logs.slice(-3).map((log, index) => (
                          <motion.div 
                            key={`${index}-${log}`}
                            className="text-white/70 text-xs px-3 py-1 rounded-full"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}
                            initial={{ opacity: 0, x: -30, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            transition={{ 
                              duration: 0.5,
                              delay: index * 0.1,
                              type: "spring",
                              stiffness: 200 
                            }}
                          >
                            {log}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Message de redirection si en cours */}
                  {isRedirecting && (
                    <motion.div 
                      className="mt-6 p-4 bg-gradient-to-r from-green-900/40 to-blue-900/40 border border-green-400/50 text-green-100 rounded-2xl text-center"
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      style={{
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                      }}
                    >
                      <motion.div 
                        className="flex items-center justify-center gap-3 mb-3"
                        initial={{ y: -10 }}
                        animate={{ y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <motion.div
                          className="inline-flex items-center justify-center"
                          animate={{ 
                            rotate: 360,
                            scale: [1, 1.2, 1]
                          }}
                          transition={{ 
                            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                            scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                          }}
                        >
                          {/* Icône succès moderne */}
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-green-300">
                            <motion.circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              animate={{
                                strokeDasharray: ["0 63", "63 63"],
                                scale: [1, 1.1, 1]
                              }}
                              transition={{
                                strokeDasharray: { duration: 1.5, ease: "easeInOut" },
                                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                              }}
                            />
                            <motion.path
                              d="M9 12L11 14L15 10"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 1, delay: 0.5 }}
                            />
                          </svg>
                        </motion.div>
                        <span className="font-bold text-lg text-green-200">Image générée avec succès !</span>
                        <motion.div
                          className="inline-flex items-center justify-center"
                          animate={{ 
                            rotate: -360,
                            scale: [1, 1.2, 1]
                          }}
                          transition={{ 
                            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                            scale: { duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
                          }}
                        >
                          {/* Icône célébration moderne */}
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-blue-300">
                            <motion.path
                              d="M12 2L13.5 8.5L20 7L14.5 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L9.5 12L4 7L10.5 8.5L12 2Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              fill="currentColor"
                              fillOpacity="0.2"
                              animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.7, 1, 0.7]
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                          </svg>
                        </motion.div>
                      </motion.div>
                      
                      <motion.div 
                        className="text-sm mb-3 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="mb-2 flex items-center justify-center gap-2">
                          {/* Icône attention moderne */}
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-yellow-300">
                            <motion.circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              animate={{
                                scale: [1, 1.1, 1]
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                            <motion.path
                              d="M12 8V12"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              animate={{
                                opacity: [1, 0.5, 1]
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                            <circle cx="12" cy="16" r="1" fill="currentColor" />
                          </svg>
                          <strong>Ne fermez pas cette fenêtre !</strong>
                        </div>
                        <div>
                          Redirection automatique vers la page résultat dans{' '}
                          <motion.span 
                            className="font-bold text-2xl text-yellow-300 inline-block"
                            key={redirectCountdown}
                            initial={{ scale: 1.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            {redirectCountdown}
                          </motion.span>
                          {' '}seconde{redirectCountdown > 1 ? 's' : ''}...
                        </div>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Erreur si présente */}
                  {error && (
                    <motion.div 
                      className="mt-6 p-4 border border-red-500/50 text-red-100 rounded-2xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(185, 28, 28, 0.1))',
                        backdropFilter: 'blur(10px)'
                      }}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {error}
                    </motion.div>
                  )}

                  {/* Bouton d'annulation */}
                  <div className="mt-6 flex justify-center">
                    {!isRedirecting && (
                      <motion.button
                        onClick={() => {
                          setProcessing(false);
                          setIsRedirecting(false);
                          setRedirectCountdown(0);
                          router.push(`/photobooth-coiffure/${slug}`);
                        }}
                        className="px-6 py-2.5 rounded-xl text-sm font-medium"
                        style={{ 
                          background: 'rgba(255,255,255,0.15)', 
                          color: 'white',
                          border: '1px solid rgba(255,255,255,0.2)',
                          backdropFilter: 'blur(10px)'
                        }}
                        whileHover={{ 
                          backgroundColor: 'rgba(255,255,255,0.25)',
                          scale: 1.05
                        }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Annuler
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className={`w-full mx-auto mt-4 relative z-10 ${processing ? 'opacity-20 pointer-events-none' : ''} ${
          deviceType === 'mobile' || deviceType === 'tablet' 
            ? 'flex flex-col items-center justify-center h-full px-2' 
            : 'max-w-6xl'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: processing ? 0.2 : 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <motion.h2 
          className={`text-xl font-bold text-center ${
            deviceType === 'mobile' || deviceType === 'tablet' ? 'mb-4' : 'mb-6'
          }`}
          style={{ color: secondaryColor }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {enabled ? 'Vérifiez votre photo' : 'Prenez votre photo'}
        </motion.h2>
        
        {/* Invisible retry button that can be triggered programmatically */}
        <div className="hidden">
          <button id="retryCamera" onClick={retryCamera}>Retry Camera</button>
        </div>
        
        {/* Camera viewfinder with responsive dimensions and centering */}
        <div className={`${deviceType === 'mobile' ? 'w-full flex justify-center' : ''}`}>
          <motion.div 
            className={`relative overflow-hidden rounded-lg shadow-2xl`}
            style={{ 
              width: deviceType === 'mobile' ? '82vw' : deviceType === 'tablet' ? '80vw' : '100%',
              maxWidth: deviceType === 'mobile' ? '320px' : deviceType === 'tablet' ? '600px' : '1400px',
              aspectRatio: deviceType === 'mobile' ? '3/4' : deviceType === 'tablet' ? '4/3' : '970/651',
              border: cameraError ? '1px solid rgba(255, 0, 0, 0.5)' : 'none',
              backgroundColor: 'black',
              minHeight: deviceType === 'mobile' ? '50vh' : deviceType === 'tablet' ? '70vh' : '400px',
              maxHeight: deviceType === 'mobile' ? '70vh' : deviceType === 'tablet' ? '85vh' : '80vh',
              margin: deviceType === 'mobile' ? '0' : '0 auto'
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

          {/* Video element with responsive sizing and centering */}
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover"
            style={{ 
              transform: 'scaleX(-1)',
              display: enabled && !videoVisible ? 'none' : 'block',
              visibility: enabled && !videoVisible ? 'hidden' : 'visible',
              minHeight: deviceType === 'mobile' ? '50vh' : deviceType === 'tablet' ? '70vh' : '400px',
              maxHeight: deviceType === 'mobile' ? '70vh' : deviceType === 'tablet' ? '85vh' : '80vh',
              backgroundColor: '#000',
              objectPosition: 'center center'
            }} 
            playsInline
            autoPlay
            muted
            onLoadedMetadata={() => {
              console.log("Video metadata loaded:", {
                videoWidth: videoRef.current?.videoWidth,
                videoHeight: videoRef.current?.videoHeight,
                deviceType: deviceType
              });
              setCameraLoaded(true);
            }}
            onError={(e) => {
              console.error("Video element error:", e);
              setCameraError("Problème d'accès à la caméra: " + (e.target.error?.message || "Erreur inconnue"));
            }}
          />
          
          {/* Canvas element with responsive sizing and centering */}
          <canvas 
            ref={previewRef} 
            className="w-full h-full"
            style={{ 
              display: enabled ? 'block' : 'none',
              minHeight: deviceType === 'mobile' ? '50vh' : deviceType === 'tablet' ? '60vh' : '400px',
              maxHeight: deviceType === 'mobile' ? '70vh' : deviceType === 'tablet' ? '80vh' : '80vh',
              objectFit: 'cover',
              backgroundColor: '#222',
              objectPosition: 'center center'
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
        </div>

        {/* Action buttons */}
        <motion.div 
          className={`flex flex-col items-center ${
            deviceType === 'mobile' || deviceType === 'tablet' ? 'mt-4 mb-4' : 'mt-8'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {/* Affiche le bouton uniquement si quota non atteint */}
          {!enabled && !quotaAtteint ? (
            <>
              {/* Enhanced photo button with animations */}
              <motion.button
                onClick={() => {
                  console.log("🔴 PHOTO button clicked, camera state:", { cameraLoaded, cameraError });
                  console.log("🔴 Device type detected:", deviceType);
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
                className={`relative font-black overflow-hidden group shadow-2xl ${
                  deviceType === 'mobile' || deviceType === 'tablet'
                    ? 'w-20 h-20 rounded-full flex items-center justify-center' // Bouton rond pour mobile/tablette
                    : 'px-12 py-6 text-2xl rounded-2xl' // Bouton rectangulaire pour desktop
                }`}
                style={{ 
                  backgroundColor: deviceType === 'mobile' || deviceType === 'tablet' ? '#ff4444' : secondaryColor,
                  color: deviceType === 'mobile' || deviceType === 'tablet' ? 'white' : primaryColor,
                  opacity: cameraLoaded && !showCountdown ? 1 : 0.5,
                  boxShadow: deviceType === 'mobile' || deviceType === 'tablet' 
                    ? '0 8px 20px rgba(255, 68, 68, 0.4)'
                    : `0 20px 40px ${secondaryColor}40`
                }}
                whileHover={cameraLoaded && !showCountdown ? { 
                  scale: 1.05,
                  boxShadow: deviceType === 'mobile' || deviceType === 'tablet'
                    ? '0 12px 30px rgba(255, 68, 68, 0.6)'
                    : `0 25px 50px ${secondaryColor}60`
                } : {}}
                whileTap={cameraLoaded && !showCountdown ? { scale: 0.95 } : {}}
                disabled={!cameraLoaded || showCountdown}
              >
                {/* Animated floating bubbles - uniquement pour desktop */}
                {(deviceType !== 'mobile' && deviceType !== 'tablet') && [...Array(6)].map((_, i) => (
                  <motion.div
                    key={`photo-bubble-${i}`}
                    className="absolute rounded-full opacity-30"
                    style={{
                      backgroundColor: primaryColor,
                      width: `${6 + Math.random() * 12}px`,
                      height: `${6 + Math.random() * 12}px`,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [0, -15, 0],
                      x: [0, Math.random() * 15 - 7.5, 0],
                      scale: [1, 1.3, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 2 + Math.random() * 1.5,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                      ease: "easeInOut"
                    }}
                  />
                ))}

                {/* Cercle intérieur pour mobile/tablette */}
                {(deviceType === 'mobile' || deviceType === 'tablet') && (
                  <motion.div
                    className="w-14 h-14 bg-white rounded-full flex items-center justify-center"
                    animate={cameraLoaded && !showCountdown ? {
                      scale: [1, 1.1, 1],
                    } : {}}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <motion.div
                      className="w-10 h-10 bg-red-500 rounded-full"
                      animate={cameraLoaded && !showCountdown ? {
                        scale: [1, 0.9, 1],
                      } : {}}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.5
                      }}
                    />
                  </motion.div>
                )}

                {/* Animated wave pattern - uniquement pour desktop */}
                {(deviceType !== 'mobile' && deviceType !== 'tablet') && (
                  <motion.div
                    className="absolute inset-0 opacity-15"
                    style={{
                      background: `repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 8px,
                        ${primaryColor}30 8px,
                        ${primaryColor}30 16px
                      )`
                    }}
                    animate={{
                      backgroundPosition: ["0px 0px", "32px 32px"],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                )}

                {/* Pulsing rings */}
                {[...Array(2)].map((_, i) => (
                  <motion.div
                    key={`photo-ring-${i}`}
                    className="absolute rounded-full border-2 opacity-30"
                    style={{
                      borderColor: deviceType === 'mobile' || deviceType === 'tablet' ? '#ff4444' : primaryColor,
                      width: `${(deviceType === 'mobile' || deviceType === 'tablet' ? 30 : 40) + i * 20}px`,
                      height: `${(deviceType === 'mobile' || deviceType === 'tablet' ? 30 : 40) + i * 20}px`,
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                    animate={{
                      scale: [0.8, 1.1, 0.8],
                      opacity: [0.3, 0.1, 0.3],
                      rotate: [0, 360]
                    }}
                    transition={{
                      duration: 2.5 + i * 0.3,
                      repeat: Infinity,
                      delay: i * 0.4,
                      ease: "easeInOut"
                    }}
                  />
                ))}

                {/* Rotating gradient overlay - uniquement pour desktop */}
                {(deviceType !== 'mobile' && deviceType !== 'tablet') && (
                  <motion.div
                    className="absolute inset-0 opacity-20 rounded-2xl"
                    style={{
                      background: `conic-gradient(from 0deg, transparent, ${primaryColor}30, transparent, ${primaryColor}40, transparent)`
                    }}
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                )}

                {/* Sparkle explosion on hover - uniquement pour desktop */}
                {(deviceType !== 'mobile' && deviceType !== 'tablet') && (
                  <motion.div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={`photo-sparkle-${i}`}
                        className="absolute w-1 h-1 rounded-full"
                        style={{
                          backgroundColor: primaryColor,
                          left: '50%',
                          top: '50%',
                        }}
                        animate={{
                          x: [0, (Math.cos(i * 45 * Math.PI / 180) * 40)],
                          y: [0, (Math.sin(i * 45 * Math.PI / 180) * 40)],
                          opacity: [1, 0],
                          scale: [0, 1.2, 0],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.1,
                          ease: "easeOut"
                        }}
                      />
                    ))}
                  </motion.div>
                )}

                {/* Animated background shine - uniquement pour desktop */}
                {(deviceType !== 'mobile' && deviceType !== 'tablet') && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                  />
                )}

                {/* Button text - uniquement pour desktop */}
                {(deviceType !== 'mobile' && deviceType !== 'tablet') && (
                  <span className="relative z-10 flex items-center gap-3">
                    {/* Icône caméra moderne */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-current">
                      <motion.rect
                        x="3"
                        y="6"
                        width="18"
                        height="12"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        animate={{
                          scale: [1, 1.05, 1]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <motion.circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        animate={{
                          scale: [1, 1.1, 1],
                          opacity: [0.8, 1, 0.8]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <path d="M7 6L9 4H15L17 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {showCountdown
                      ? 'PRISE DE PHOTO...'
                      : cameraLoaded
                        ? 'PRENDRE UNE PHOTO'
                        : 'ATTENTE DE LA CAMÉRA...'}
                  </span>
                )}

                {/* Enhanced pulse effect when ready */}
                {cameraLoaded && !showCountdown && (
                  <motion.span
                    className={`absolute inset-0 border-2 ${
                      deviceType === 'mobile' || deviceType === 'tablet' ? 'rounded-full' : 'rounded-2xl'
                    }`}
                    style={{ borderColor: deviceType === 'mobile' || deviceType === 'tablet' ? '#ff4444' : primaryColor }}
                    animate={{ 
                      opacity: [0.2, 0.5, 0.2],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  ></motion.span>
                )}
              </motion.button>
            </>
          ) : null}

          {/* Affiche le bouton REPRENDRE et GÉNÉRER MON IMAGE si une photo est capturée */}
          {enabled && !processing && (
            <div className="flex flex-col space-y-4 items-center">
              {/* Enhanced GÉNÉRER MON IMAGE button with animations */}
              <motion.button 
                onClick={generateImageReplicate}
                className="relative px-12 py-6 rounded-2xl font-black text-2xl overflow-hidden group shadow-2xl"
                style={{ 
                  backgroundColor: secondaryColor, 
                  color: primaryColor,
                  boxShadow: `0 20px 40px ${secondaryColor}40`
                }}
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: `0 25px 50px ${secondaryColor}60`
                }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 1, scale: 1 }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.8,
                  transition: { duration: 0.3 }
                }}
              >
                {/* Animated floating bubbles */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`generate-bubble-${i}`}
                    className="absolute rounded-full opacity-30"
                    style={{
                      backgroundColor: primaryColor,
                      width: `${8 + Math.random() * 16}px`,
                      height: `${8 + Math.random() * 16}px`,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [0, -20, 0],
                      x: [0, Math.random() * 20 - 10, 0],
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 0.7, 0.3],
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                      ease: "easeInOut"
                    }}
                  />
                ))}

                {/* Animated wave pattern */}
                <motion.div
                  className="absolute inset-0 opacity-15"
                  style={{
                    background: `repeating-linear-gradient(
                      45deg,
                      transparent,
                      transparent 10px,
                      ${primaryColor}40 10px,
                      ${primaryColor}40 20px
                    )`
                  }}
                  animate={{
                    backgroundPosition: ["0px 0px", "40px 40px"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />

                {/* Pulsing rings */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={`generate-ring-${i}`}
                    className="absolute rounded-full border-2 opacity-30"
                    style={{
                      borderColor: primaryColor,
                      width: `${50 + i * 25}px`,
                      height: `${50 + i * 25}px`,
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                    animate={{
                      scale: [0.8, 1.2, 0.8],
                      opacity: [0.3, 0.1, 0.3],
                      rotate: [0, 360]
                    }}
                    transition={{
                      duration: 3 + i * 0.5,
                      repeat: Infinity,
                      delay: i * 0.5,
                      ease: "easeInOut"
                    }}
                  />
                ))}

                {/* Shooting stars */}
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={`generate-star-${i}`}
                    className="absolute"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      x: [0, 80],
                      y: [0, -40],
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.6,
                      ease: "easeOut"
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <motion.div
                      className="absolute top-0 left-0 w-12 h-0.5 origin-left"
                      style={{ backgroundColor: primaryColor }}
                      animate={{ scaleX: [0, 1, 0] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.6,
                      }}
                    />
                  </motion.div>
                ))}

                {/* Rotating gradient overlay */}
                <motion.div
                  className="absolute inset-0 opacity-20 rounded-2xl"
                  style={{
                    background: `conic-gradient(from 0deg, transparent, ${primaryColor}30, transparent, ${primaryColor}50, transparent)`
                  }}
                  animate={{ rotate: [0, 360] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />

                {/* Sparkle explosion on hover */}
                <motion.div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={`generate-sparkle-${i}`}
                      className="absolute w-1 h-1 rounded-full"
                      style={{
                        backgroundColor: primaryColor,
                        left: '50%',
                        top: '50%',
                      }}
                      animate={{
                        x: [0, (Math.cos(i * 30 * Math.PI / 180) * 50)],
                        y: [0, (Math.sin(i * 30 * Math.PI / 180) * 50)],
                        opacity: [1, 0],
                        scale: [0, 1.5, 0],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: "easeOut"
                      }}
                    />
                  ))}
                </motion.div>

                {/* Animated background shine */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                />

                {/* Button text with icon */}
                <span className="relative z-10 flex items-center gap-3">
                  {/* Icône création moderne */}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-current">
                    <motion.path
                      d="M12 2L15.09 8.26L22 9L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9L8.91 8.26L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 180, 360]
                      }}
                      transition={{
                        scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                        rotate: { duration: 4, repeat: Infinity, ease: "linear" }
                      }}
                    />
                  </svg>
                  GÉNÉRER MON IMAGE
                  {/* Icône IA moderne */}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-current">
                    <motion.circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.7, 1, 0.7]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    <motion.path
                      d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      animate={{
                        rotate: [0, 360]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                  </svg>
                </span>

                {/* Enhanced pulse effect */}
                <motion.span
                  className="absolute inset-0 rounded-2xl border-2"
                  style={{ borderColor: primaryColor }}
                  animate={{ 
                    opacity: [0.2, 0.6, 0.2],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                ></motion.span>
              </motion.button>

              {/* Smaller REPRENDRE button */}
              <motion.button 
                onClick={retake}
                className="px-6 py-3 rounded-lg font-medium text-base backdrop-blur-md border border-white/30"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
                whileHover={{ 
                  scale: 1.05,
                  backgroundColor: 'rgba(255,255,255,0.25)'
                }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 1, scale: 1 }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.8,
                  transition: { duration: 0.3, delay: 0.1 }
                }}
              >
                <span className="flex items-center gap-2">
                  {/* Icône reprendre moderne */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-current">
                    <motion.path
                      d="M1 4V10H7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      animate={{
                        opacity: [0.7, 1, 0.7]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    <motion.path
                      d="M3.51 15A9 9 0 1 0 6 5.3L1 10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      animate={{
                        rotate: [0, 360]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                  </svg>
                  REPRENDRE
                </span>
              </motion.button>
            </div>
          )}
          
          {/* ✅ BOUTON DE BASCULEMENT DE CAMÉRA pour mobile/tablette */}
          {(deviceType === 'mobile' || deviceType === 'tablet') && !enabled && cameraLoaded && !processing && (
            <motion.div 
              className="flex justify-center mt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <motion.button
                onClick={switchCamera}
                disabled={switchingCamera}
                className="px-4 py-2 rounded-full font-medium text-sm backdrop-blur-md border border-white/30 flex items-center gap-2"
                style={{ 
                  backgroundColor: switchingCamera ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)', 
                  color: 'white',
                  opacity: switchingCamera ? 0.7 : 1
                }}
                whileHover={!switchingCamera ? { 
                  scale: 1.05,
                  backgroundColor: 'rgba(255,255,255,0.25)'
                } : {}}
                whileTap={!switchingCamera ? { scale: 0.95 } : {}}
              >
                {switchingCamera ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <span>Basculement...</span>
                  </>
                ) : (
                  <>
                    <motion.svg 
                      width="18" 
                      height="18" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      className="text-current"
                      animate={{ 
                        rotateY: [0, 180, 360] 
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <path
                        d="M15 3H19C20.1046 3 21 3.89543 21 5V9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9 21H5C3.89543 21 3 20.1046 3 19V15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 8L19 5L16 2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 16L5 19L8 22"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </motion.svg>
                    <span>
                      {currentCameraFacing === "user" ? "📷 Caméra arrière" : "🤳 Caméra frontale"}
                    </span>
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
          
          {/* Affichage du quota restant ou message quota atteint */}
          <div className={`text-center ${
            deviceType === 'mobile' || deviceType === 'tablet' ? 'mb-2 mt-2' : 'mb-4'
          }`}>
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