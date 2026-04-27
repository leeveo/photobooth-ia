'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import BackToProjectButton from '../../../components/BackToProjectButton';

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

// ✅ FONCTION SPÉCIALISÉE POUR IPAD SAFARI AVEC ÉNUMÉRATION DES DISPOSITIFS
const tryIPadSafariFrontCamera = async () => {
  try {
    console.log("🍎 Tentative spécialisée iPad Safari pour caméra frontale...");
    
    // ✅ MÉTHODE ULTRA-AGRESSIVE: Essayer TOUTES les combinaisons possibles
    const frontCameraConfigs = [
      // Configuration 1: Exact user
      { video: { facingMode: { exact: "user" } } },
      // Configuration 2: Ideal user
      { video: { facingMode: { ideal: "user" } } },
      // Configuration 3: Simple user
      { video: { facingMode: "user" } },
      // Configuration 4: User avec résolution iPad optimisée
      { video: { facingMode: "user", width: 1280, height: 720 } },
      // Configuration 5: User sans contraintes supplémentaires
      { video: { facingMode: "user", width: { min: 320 }, height: { min: 240 } } },
    ];
    
    // Essayer chaque configuration une par une
    for (let i = 0; i < frontCameraConfigs.length; i++) {
      const config = frontCameraConfigs[i];
      console.log(`🎯 Tentative ${i + 1}/${frontCameraConfigs.length}:`, config);
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia(config);
        console.log(`✅ SUCCÈS Méthode ${i + 1}: Configuration fonctionnelle trouvée!`);
        
        // Vérifier que c'est bien la caméra frontale
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        console.log("📊 Paramètres de la caméra:", settings);
        
        // Si c'est la caméra frontale ou si on n'a pas d'info facingMode (souvent le cas sur iPad)
        if (!settings.facingMode || settings.facingMode === "user") {
          console.log("✅ Caméra frontale confirmée ou probable");
          return stream;
        } else if (settings.facingMode === "environment") {
          console.log("❌ C'est la caméra arrière, on ferme et continue");
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.log(`❌ Méthode ${i + 1} échouée:`, err.message);
      }
    }
    
    // ✅ MÉTHODE ÉNUMÉRATION EXHAUSTIVE: Tester chaque caméra disponible
    console.log("🎯 Méthode énumération exhaustive des caméras...");
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log(`📹 ${videoDevices.length} caméras détectées:`, 
        videoDevices.map(d => ({ 
          deviceId: d.deviceId.substring(0, 20) + "...", 
          label: d.label || "Caméra sans nom"
        }))
      );
      
      // Essayer CHAQUE caméra une par une
      for (let i = 0; i < videoDevices.length; i++) {
        const device = videoDevices[i];
        const deviceLabel = device.label || `Caméra ${i + 1}`;
        
        console.log(`🔄 Test caméra ${i + 1}/${videoDevices.length}: ${deviceLabel}`);
        
        try {
          // Essayer avec différentes configurations pour cette caméra
          const deviceConfigs = [
            { video: { deviceId: { exact: device.deviceId }, facingMode: "user" } },
            { video: { deviceId: { exact: device.deviceId } } },
            { video: { deviceId: device.deviceId, facingMode: "user" } },
            { video: { deviceId: device.deviceId } }
          ];
          
          for (const config of deviceConfigs) {
            try {
              console.log(`  🔄 Config:`, config);
              const stream = await navigator.mediaDevices.getUserMedia(config);
              
              const track = stream.getVideoTracks()[0];
              const settings = track.getSettings();
              
              console.log(`  📊 Résultat: facingMode=${settings.facingMode}, deviceId=${settings.deviceId?.substring(0, 20)}...`);
              
              // Préférer les caméras frontales ou celles sans facingMode déclaré
              if (!settings.facingMode || settings.facingMode === "user" || 
                  deviceLabel.toLowerCase().includes("front") || 
                  deviceLabel.toLowerCase().includes("face")) {
                console.log(`✅ SUCCÈS! Caméra frontale trouvée: ${deviceLabel}`);
                return stream;
              } else {
                console.log(`❌ Caméra arrière détectée: ${deviceLabel}`);
                stream.getTracks().forEach(track => track.stop());
              }
            } catch (configErr) {
              console.log(`  ❌ Config échouée:`, configErr.message);
            }
          }
        } catch (deviceErr) {
          console.log(`❌ Échec dispositif ${deviceLabel}:`, deviceErr.message);
        }
      }
      
      console.log("❌ Aucune caméra frontale trouvée via énumération");
      return null;
      
    } catch (enumerateErr) {
      console.error("❌ Échec énumération des dispositifs:", enumerateErr);
      return null;
    }
    
  } catch (err) {
    console.error("❌ Erreur dans tryIPadSafariFrontCamera:", err);
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
      
      // Configuration options adaptées selon l'appareil
      const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isTablet = /(iPad|Android(?!.*Mobile))/i.test(navigator.userAgent);
      
      const configOptions = isMobile ? [
        // Mobile: Priorité à la caméra frontale et résolution adaptée
        { 
          video: { 
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: { ideal: 16/9 }
          } 
        },
        { 
          video: { 
            facingMode: "user",
            width: { min: 640 },
            height: { min: 480 }
          } 
        },
        { video: { facingMode: "user" } },
        { video: true }
      ] : isTablet ? [
        // Tablette: Résolution intermédiaire
        { 
          video: { 
            width: { ideal: 1600 },
            height: { ideal: 900 },
            aspectRatio: { ideal: 16/9 }
          } 
        },
        { 
          video: { 
            width: { min: 800 },
            height: { min: 600 },
            aspectRatio: { ideal: 16/9 }
          } 
        },
        { video: true },
        { video: { facingMode: "user" } }
      ] : [
        // PC: Haute résolution
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
      
      let stream = null;
      
      // ✅ SPÉCIAL IPAD SAFARI: Tentative méthode spécialisée d'abord
      const isIPadDevice = /iPad/i.test(navigator.userAgent) || 
                          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                          (/Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent));
      
      if (isIPadDevice) {
        console.log("🍎 Dispositif iPad détecté, utilisation de la méthode spécialisée...");
        stream = await tryIPadSafariFrontCamera();
        
        if (stream) {
          console.log("✅ SUCCÈS: Caméra iPad initialisée via méthode spécialisée!");
        } else {
          console.log("⚠️ Méthode iPad échouée, tentative des méthodes standards...");
        }
      }
      
      // Try each configuration option until one works (if iPad method failed or not iPad)
      if (!stream) {
        for (const config of configOptions) {
          stream = await tryInitCamera(config);
          if (stream) break;
        }
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
  
  // Device detection state
  const [deviceType, setDeviceType] = useState('desktop');
  
  // iPad device detection state  
  const [isIPadDevice, setIsIPadDevice] = useState(() => {
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent;
      const platform = navigator.platform;
      const maxTouchPoints = navigator.maxTouchPoints;
      
      // Détection iPad spécifique
      return /iPad/i.test(userAgent) || 
             (platform === 'MacIntel' && maxTouchPoints > 1) ||
             (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)); // Android tablets
    }
    return false;
  });
  
  // Add state for current camera facing mode
  const [currentCameraFacing, setCurrentCameraFacing] = useState("user");
  
  // Add state for camera switching
  const [switchingCamera, setSwitchingCamera] = useState(false);
  
  // Quota states
  const [quota, setQuota] = useState(null);
  const [quotaUsed, setQuotaUsed] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [quotaAtteint, setQuotaAtteint] = useState(false);
  const [quotaRestant, setQuotaRestant] = useState(null);
  
  // Orientation data state
  const [orientationData, setOrientationData] = useState(null);

  // Function to reset state when retrying
  const reset2 = () => {
    setError(null);
    setLogs([]);
    setElapsedTime(0);
    setLoadingProgress(0);
  };
  
  // Initialize webcam with error handling - passing setCameraLoaded as well
  useWebcam({ videoRef, setCameraError, setCameraLoaded });
  
  // Device detection effect
  useEffect(() => {
    const detectDevice = () => {
      const screenWidth = window.innerWidth;
      const userAgent = navigator.userAgent;
      const platform = navigator.platform;
      const maxTouchPoints = navigator.maxTouchPoints;
      
      if (screenWidth <= 768) {
        setDeviceType('mobile');   // Format smartphone/mobile
      } else if (screenWidth <= 1024) {
        setDeviceType('tablet');   // Format tablette
      } else {
        setDeviceType('desktop');  // Format desktop
      }
      
      // Mise à jour détection iPad
      const isIPad = /iPad/i.test(userAgent) || 
                     (platform === 'MacIntel' && maxTouchPoints > 1) ||
                     (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent));
      setIsIPadDevice(isIPad);
    };
    
    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);
  
  // ✅ FONCTION POUR BASCULER ENTRE CAMÉRA FRONTALE ET ARRIÈRE AVEC MÉTHODES AVANCÉES
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
      
      // ✅ MÉTHODE 1: facingMode exact
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: newFacing }
          }
        });
        console.log(`✅ Basculement réussi vers ${newFacing} (méthode exact)`);
      } catch (err1) {
        console.log(`❌ Échec méthode exact pour ${newFacing}:`, err1.message);
        
        // ✅ MÉTHODE 2: facingMode simple
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: newFacing
            }
          });
          console.log(`✅ Basculement réussi vers ${newFacing} (méthode simple)`);
        } catch (err2) {
          console.log(`❌ Échec méthode simple pour ${newFacing}:`, err2.message);
          
          // ✅ MÉTHODE 3: Énumération et sélection par deviceId
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
                console.log(`❌ Erreur test caméra ${device.label}:`, deviceErr.message);
              }
            }
            
            if (!newStream) {
              console.log(`❌ Aucune caméra ${newFacing} trouvée par énumération`);
            }
          } catch (enumerateErr) {
            console.log(`❌ Erreur énumération dispositifs:`, enumerateErr.message);
          }
        }
      }
      
      if (newStream) {
        // Appliquer le nouveau stream
        streamCam = newStream;
        window.localStream = newStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          
          // Attendre que la vidéo soit prête avec retry
          let retryCount = 0;
          const maxRetries = 10;
          
          const waitForVideo = async () => {
            try {
              await videoRef.current.play();
              console.log("✅ Nouveau stream appliqué avec succès");
              
              // Mettre à jour l'état de la caméra
              setCurrentCameraFacing(newFacing);
              setCameraError(null);
              setCameraLoaded(true);
              
            } catch (playErr) {
              retryCount++;
              if (retryCount < maxRetries) {
                console.log(`🔄 Retry ${retryCount}/${maxRetries} pour la lecture vidéo...`);
                setTimeout(waitForVideo, 500);
              } else {
                console.error("❌ Impossible de lire la nouvelle caméra après plusieurs tentatives");
                setCameraError("Erreur lors du basculement de caméra");
              }
            }
          };
          
          setTimeout(waitForVideo, 100);
        }
        
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
        console.error("❌ Erreur fallback:", fallbackError);
        setCameraError("Impossible d'accéder à une caméra");
      }
      
    } finally {
      setSwitchingCamera(false);
    }
  };
  
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
      
      // Determine target dimensions based on orientationData or default
      let targetWidth = 1280;
      let targetHeight = 720;
      
      if (orientationData) {
           targetWidth = orientationData.width;
           targetHeight = orientationData.height;
      }

      // Set canvas dimensions
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const context = canvas.getContext('2d');
      if (!context) {
        console.error("Could not get canvas context");
        return;
      }
      
      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Mirror the image horizontally for selfie mode
      context.save();
      context.translate(canvas.width, 0);
      context.scale(-1, 1);

      // Calculate crop to cover target aspect ratio
      const videoAspect = videoWidth / videoHeight;
      const targetAspect = targetWidth / targetHeight;

      let sx = 0, sy = 0, sWidth = videoWidth, sHeight = videoHeight;

      if (videoAspect > targetAspect) {
        // Video is wider than target -> Crop width
        sWidth = videoHeight * targetAspect;
        sx = (videoWidth - sWidth) / 2;
      } else {
        // Video is taller than target -> Crop height
        sHeight = videoWidth / targetAspect;
        sy = (videoHeight - sHeight) / 2;
      }

      // Draw the cropped video
      context.drawImage(
        video,
        sx, sy, sWidth, sHeight, // source rectangle (centered)
        0, 0, canvas.width, canvas.height // destination rectangle (full canvas)
      );

      context.restore();
      
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
  
  // Fetch orientation data when project is loaded
  useEffect(() => {
    if (project?.id) {
      const loadOrientation = async () => {
        const { orientationData } = await fetchProjectThumbnail(project.id);
        if (orientationData) {
          setOrientationData(orientationData);
        }
      };
      loadOrientation();
    }
  }, [project?.id]);

  // Initialize state for image processing
  const [imageProcessing, setImageProcessing] = useState(false);
  
  // Nouvelle fonction pour valider la photo localement
  const validerPhoto = async () => {
    setProcessing(true);
    setError(null);
    setLogs([]);
    setElapsedTime(0);

    const start = Date.now();
    try {
      setLogs(["Traitement de la photo..."]);

      // 1. Ajout du layout (watermark) si disponible
      setLogs(logs => [...logs, "Récupération du layout du projet..."]);
      const { thumbnailUrl, orientationData } = await fetchProjectThumbnail(project?.id);

      let finalImageUrl = imageFile;
      let hasWatermark = false;

      if (thumbnailUrl) {
        setLogs(logs => [...logs, "Fusion de l'image avec le layout..."]);
        setLogs(logs => [...logs, orientationData 
          ? "Dimensions d'encart détectées, adaptation de l'image..." 
          : "Pas de dimensions spécifiques, utilisation des valeurs par défaut..."]);
        try {
          const combinedImageDataUrl = await combineImagesWithTransparentOverlay(
            imageFile, 
            thumbnailUrl, 
            orientationData
          );
          if (combinedImageDataUrl && combinedImageDataUrl !== imageFile) {
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

      // 2. Upload S3 si besoin
      let resultS3Url = null;
      let uploadableImage = finalImageUrl;
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
        } else {
          throw new Error("Réponse S3 invalide");
        }
      } else {
        setLogs(logs => [...logs, "Upload direct de l'image sans conversion."]);
        localStorage.setItem("faceURLResult", finalImageUrl);
      }

      // 3. Enregistrement dans la table sessions
      try {
        // Création d'un objet sessionPayload avec toutes les informations à sauvegarder
        const sessionPayload = {
          user_email: null,
          style_id: localStorage.getItem('selectedStyleId') || null,
          style_key: localStorage.getItem('selectedStyleKey') || null,
          gender: styleGender,
          result_image_url: finalImageUrl,        // URL de l'image finale (avec overlay)
          result_s3_url: resultS3Url,             // URL S3 si disponible
          processing_time_ms: Date.now() - start, // Temps de traitement
          is_success: true,                       // Statut de succès
          error_message: null,
          project_id: project?.id,                // ID du projet
          created_by: null,
          has_watermark: hasWatermark,            // Si un overlay a été appliqué
          moderation: null,
          created_at: new Date().toISOString()    // Timestamp
        };

        // Insertion dans la table 'sessions' de Supabase
        const { data: sessionInsertData, error: sessionInsertError } = await supabase
          .from('sessions')
          .insert(sessionPayload)
          .select();

        // Gestion des erreurs et logs
        if (sessionInsertError) {
          setLogs(logs => [...logs, "Erreur lors de l'enregistrement de la session."]);
        } else {
          setLogs(logs => [...logs, "Session enregistrée dans la base."]);
        }
      } catch (sessionError) {
        // Gestion des exceptions
        setLogs(logs => [...logs, "Erreur lors de l'enregistrement de la session."]);
      }

      setTimeout(() => {
        router.push(`/photobooth-simple/${slug}/result`);
      }, 1000);

    } catch (err) {
      setError(err.message || "Erreur lors de la validation");
      setLogs([err.message]);
    } finally {
      setProcessing(false);
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
  try {
    console.log("===> [DEBUG] Bouton 'VALIDER MON IMAGE' cliqué, lancement de generateImageReplicate");

    const prompt = localStorage.getItem('stylePrompt') || "portrait photo";
    const image = imageFile; // base64

    setLogs(["Envoi de la requête à Replicate..."]);

    // 1. Génération de l'image via Replicate
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

    let resultUrl = typeof data.output === 'string'
      ? data.output
      : Array.isArray(data.output)
        ? data.output[0]
        : data.output?.url || data.output?.image || data.output;

    if (!resultUrl) throw new Error("Aucune image générée");

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
      } else {
        throw new Error("Réponse S3 invalide");
      }
    } else {
      setLogs(logs => [...logs, "Upload direct de l'image sans conversion."]);
      localStorage.setItem("faceURLResult", finalImageUrl);
    }

    // Enregistrement dans la table sessions (identique pour les deux cas)
    try {
      // Création d'un objet sessionPayload avec toutes les informations à sauvegarder
      const sessionPayload = {
        user_email: null,
        style_id: localStorage.getItem('selectedStyleId') || null,
        style_key: localStorage.getItem('selectedStyleKey') || null,
        gender: styleGender,
        result_image_url: finalImageUrl,        // URL de l'image finale (avec overlay)
        result_s3_url: resultS3Url,             // URL S3 si disponible
        processing_time_ms: Date.now() - start, // Temps de traitement
        is_success: true,                       // Statut de succès
        error_message: null,
        project_id: project?.id,                // ID du projet
        created_by: null,
        has_watermark: hasWatermark,            // Si un overlay a été appliqué
        moderation: null,
        created_at: new Date().toISOString()    // Timestamp
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

    setTimeout(() => {
      router.push(`/photobooth-simple/${slug}/result`);
    }, 1000);

  } catch (err) {
    setError(err.message || "Erreur lors de la génération");
    setLogs([err.message]);
    // Enregistre l'échec dans sessions pour garder la cohérence du quota
    try {
      const sessionPayload = {
        user_email: null,
        style_id: localStorage.getItem('selectedStyleId') || null,
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
      let quotaValue = 3; // Quota gratuit par défaut
      let quotaResetAt = null;
      let isFreePlan = true; // Nouveau flag pour identifier les utilisateurs gratuits
      
      if (adminUserId) {
        const { data: lastPayment } = await supabase
          .from('admin_payments')
          .select('photo_quota, photo_quota_reset_at')
          .eq('admin_user_id', adminUserId)
          .order('photo_quota_reset_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (lastPayment) {
          // Utilisateur payant
          quotaValue = lastPayment.photo_quota || 0;
          quotaResetAt = lastPayment.photo_quota_reset_at;
          isFreePlan = false;
        } else {
          // Utilisateur gratuit - quota de 3 photos depuis la création du compte
          try {
            const { data: adminData } = await supabase
              .from('admin_users')
              .select('created_at')
              .eq('id', adminUserId)
              .single();
            
            if (adminData) {
              quotaResetAt = adminData.created_at; // Reset basé sur la création du compte
            }
          } catch (err) {
            console.warn("Erreur récupération date création admin:", err);
          }
        }
      }

      // Compter les sessions pour TOUS les projets de cet admin depuis le reset
      let used = 0;
      if (quotaResetAt) {
        // Récupérer tous les projets de cet admin
        const { data: adminProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('created_by', adminUserId);
        
        const adminProjectIds = adminProjects?.map(p => p.id) || [];
        
        if (adminProjectIds.length > 0) {
          const { count } = await supabase
            .from('sessions')
            .select('id', { count: 'exact', head: true })
            .in('project_id', adminProjectIds)
            .gte('created_at', quotaResetAt);
          used = count || 0;
        }
      } else {
        // Récupérer tous les projets de cet admin
        const { data: adminProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('created_by', adminUserId);
        
        const adminProjectIds = adminProjects?.map(p => p.id) || [];
        
        if (adminProjectIds.length > 0) {
          const { count } = await supabase
            .from('sessions')
            .select('id', { count: 'exact', head: true })
            .in('project_id', adminProjectIds);
          used = count || 0;
        }
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
      className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-20 px-5 relative"
    >
      <BackToProjectButton 
        projectSlug={slug}
        photoboothType="photobooth-simple"
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />

      {/* Processing Overlay - Design Simple mais Élégant */}
      <AnimatePresence>
        {processing && (
          <motion.div 
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{
              background: `
                radial-gradient(circle at 30% 70%, rgba(180, 180, 180, 0.2) 0%, transparent 50%),
                radial-gradient(circle at 70% 30%, rgba(200, 200, 200, 0.2) 0%, transparent 50%),
                linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(40, 40, 40, 0.9) 100%)
              `
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Particules simples en arrière-plan */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full opacity-20"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -25, 0],
                    opacity: [0.2, 0.6, 0.2],
                    scale: [1, 1.3, 1],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            <motion.div 
              className="relative max-w-md w-full mx-4 p-8 rounded-2xl shadow-xl border border-white/15"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(255, 255, 255, 0.12) 0%, 
                    rgba(255, 255, 255, 0.06) 100%
                  )
                `,
                backdropFilter: 'blur(15px)',
                WebkitBackdropFilter: 'blur(15px)',
              }}
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300,
                duration: 0.5 
              }}
            >
              {/* Logo simple au centre avec pulsation douce */}
              <div className="flex justify-center mb-6">
                <motion.div
                  className="relative w-16 h-16 flex items-center justify-center text-4xl"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                >
                  ⚡
                  {/* Cercle pulsant autour */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 opacity-30"
                    style={{ borderColor: secondaryColor }}
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.3, 0, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
              </div>

              {/* Titre simple avec gradient subtil */}
              <motion.h2 
                className="text-2xl font-bold mb-4 text-center"
                style={{ 
                  color: secondaryColor,
                  textShadow: `0 0 20px ${secondaryColor}30`,
                }}
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                ⚡ Traitement Simple ⚡
              </motion.h2>
              
              {/* Temps écoulé */}
              <motion.p 
                className="text-white/90 text-center mb-6 text-lg font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <motion.span
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  ⏱️ {(elapsedTime / 1000).toFixed(1)}s
                </motion.span>
              </motion.p>
              
              {/* Barre de progression simple mais élégante */}
              <motion.div 
                className="mb-6"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <div className="relative w-full h-3 rounded-full overflow-hidden border border-white/20">
                  <div className="absolute inset-0 bg-gray-800" />
                  <motion.div 
                    className="absolute inset-0 rounded-full"
                    style={{ 
                      background: `linear-gradient(90deg, 
                        ${secondaryColor} 0%, 
                        #ffffff 50%, 
                        ${secondaryColor} 100%
                      )`,
                      width: `${loadingProgress}%`,
                    }}
                    initial={{ width: "0%" }}
                  >
                    {/* Effet de brillance simple */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </motion.div>
                </div>
                <div className="mt-2 flex justify-between text-xs text-white/70 font-medium">
                  <span>🚀 Début</span>
                  <motion.span 
                    className="text-base font-bold"
                    style={{ color: secondaryColor }}
                  >
                    {loadingProgress.toFixed(0)}%
                  </motion.span>
                  <span>🎯 Fin</span>
                </div>
              </motion.div>
              
              {/* Zone de logs simple */}
              <motion.div 
                className="mb-6 h-28 overflow-y-auto rounded-xl border border-white/10 p-4"
                style={{
                  background: `
                    linear-gradient(135deg, 
                      rgba(0, 0, 0, 0.3) 0%, 
                      rgba(20, 20, 20, 0.4) 100%
                    )
                  `,
                  backdropFilter: 'blur(8px)',
                }}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <div className="space-y-2">
                  {logs.length > 0 ? (
                    logs.map((log, index) => (
                      <motion.div 
                        key={index}
                        className="flex items-center space-x-3 text-white/90 text-sm"
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          delay: index * 0.1, 
                          duration: 0.3
                        }}
                      >
                        <motion.div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: secondaryColor }}
                          animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.7, 1, 0.7]
                          }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity,
                            delay: index * 0.2
                          }}
                        />
                        <span className="font-medium">{log}</span>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div 
                      className="flex items-center space-x-3 text-white/70 text-sm"
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <motion.div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: secondaryColor }}
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span>🔄 Traitement en cours...</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
              
              {/* Gestion des erreurs simple */}
              {error && (
                <motion.div 
                  className="mb-6 p-4 rounded-xl border border-red-400/30"
                  style={{
                    background: `
                      linear-gradient(135deg, 
                        rgba(239, 68, 68, 0.1) 0%, 
                        rgba(185, 28, 28, 0.15) 100%
                      )
                    `,
                    backdropFilter: 'blur(8px)',
                  }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", damping: 25 }}
                >
                  <div className="flex items-center space-x-3">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: 2 }}
                    >
                      ❌
                    </motion.div>
                    <span className="text-red-200 font-medium">{error}</span>
                  </div>
                </motion.div>
              )}
              
              {/* Bouton d'action simple */}
              <motion.div 
                className="flex justify-center"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <motion.button
                  onClick={() => {
                    setProcessing(false);
                    router.push(`/photobooth-simple/${slug}`);
                  }}
                  className="px-8 py-3 rounded-xl font-semibold text-sm border border-white/20 relative overflow-hidden"
                  style={{ 
                    background: `
                      linear-gradient(135deg, 
                        rgba(255, 255, 255, 0.1) 0%, 
                        rgba(255, 255, 255, 0.05) 100%
                      )
                    `,
                    color: "white"
                  }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: `0 10px 25px rgba(255, 255, 255, 0.1)`,
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", damping: 15 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <span className="relative z-10">🚫 Annuler</span>
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className={`w-full mx-auto mt-4 relative z-10 ${processing ? 'opacity-20 pointer-events-none' : ''} ${
          deviceType === 'mobile' || deviceType === 'tablet' 
            ? 'flex flex-col items-center justify-center min-h-screen px-4' 
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
          {enabled ? 'Vérifiez votre photo' : 'Prenez une photo'}
        </motion.h2>
        
        {/* Invisible retry button that can be triggered programmatically */}
        <div className="hidden">
          <button id="retryCamera" onClick={retryCamera}>Retry Camera</button>
        </div>
        
        {/* Camera viewfinder with responsive dimensions and centering */}
        <motion.div 
          className={`relative overflow-hidden rounded-lg shadow-2xl ${
            deviceType === 'mobile' || deviceType === 'tablet' 
              ? 'mx-auto' 
              : 'mx-auto'
          }`}
          style={{ 
            width: '100%',
            maxWidth: orientationData 
              ? `calc(${deviceType === 'mobile' ? '65vh' : '75vh'} * ${orientationData.width / orientationData.height})` 
              : (deviceType === 'mobile' ? 'calc(65vh * 0.75)' : 'calc(75vh * 1.33)'),
            maxHeight: deviceType === 'mobile' ? '65vh' : '75vh',
            aspectRatio: orientationData ? `${orientationData.width}/${orientationData.height}` : (deviceType === 'mobile' ? '3/4' : '4/3'),
            border: cameraError ? '1px solid rgba(255, 0, 0, 0.5)' : 'none',
            backgroundColor: 'black',
            margin: '0 auto'
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

          {/* Video element with responsive sizing matching container */}
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover"
            style={{ 
              transform: 'scaleX(-1)',
              display: enabled && !videoVisible ? 'none' : 'block',
              visibility: enabled && !videoVisible ? 'hidden' : 'visible',
              backgroundColor: '#000'
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
          
          {/* Canvas element with responsive sizing matching container */}
          <canvas 
            ref={previewRef} 
            className="w-full h-full"
            style={{ 
              display: enabled ? 'block' : 'none',
              objectFit: 'contain',
              backgroundColor: '#222'
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
          {/* Camera switch button - only for iPad/tablets with multiple cameras */}
          {!enabled && isIPadDevice && (deviceType === 'tablet' || deviceType === 'mobile') && (
            <motion.button
              onClick={switchCamera}
              className="mb-4 px-6 py-3 rounded-lg font-medium text-sm backdrop-blur-md border border-white/30 flex items-center gap-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
              whileHover={{ 
                scale: 1.05,
                backgroundColor: 'rgba(255,255,255,0.25)'
              }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              {/* Icône de changement de caméra */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-current">
                <motion.path
                  d="M2 6C2 4.89543 2.89543 4 4 4H7L9 2H15L17 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
                <motion.circle
                  cx="12"
                  cy="12"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
                <motion.path
                  d="M16 8L18 6M8 8L6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  animate={{
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </svg>
              
              <span className="font-bold">
                {currentCameraFacing === "user" ? "🔄 CAMÉRA ARRIÈRE" : "🔄 CAMÉRA FRONTALE"}
              </span>
              
              {/* Icône de rotation */}
              <motion.svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                className="text-current"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <path
                  d="M1 4V10H7M23 20V14H17M20.49 9A9 9 0 0 0 5.64 5.64L1 10M22.99 14A9 9 0 0 1 18.36 18.36L23 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </motion.button>
          )}

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
              
              {/* Enhanced photo button with animations */}
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
                className="relative px-12 py-6 rounded-2xl font-black text-2xl overflow-hidden group shadow-2xl"
                style={{ 
                  backgroundColor: secondaryColor, 
                  color: primaryColor,
                  opacity: cameraLoaded && !showCountdown ? 1 : 0.5,
                  boxShadow: `0 20px 40px ${secondaryColor}40`
                }}
                whileHover={cameraLoaded && !showCountdown ? { 
                  scale: 1.05,
                  boxShadow: `0 25px 50px ${secondaryColor}60`
                } : {}}
                whileTap={cameraLoaded && !showCountdown ? { scale: 0.95 } : {}}
                disabled={!cameraLoaded || showCountdown}
              >
                {/* Animated floating bubbles */}
                {[...Array(6)].map((_, i) => (
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

                {/* Animated wave pattern */}
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

                {/* Pulsing rings */}
                {[...Array(2)].map((_, i) => (
                  <motion.div
                    key={`photo-ring-${i}`}
                    className="absolute rounded-full border-2 opacity-30"
                    style={{
                      borderColor: primaryColor,
                      width: `${40 + i * 20}px`,
                      height: `${40 + i * 20}px`,
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

                {/* Rotating gradient overlay */}
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

                {/* Sparkle explosion on hover */}
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

                {/* Button text */}
                <span className="relative z-10 flex items-center gap-3">
                  📸
                  {showCountdown
                    ? 'PRISE DE PHOTO...'
                    : cameraLoaded
                      ? 'PRENDRE UNE PHOTO'
                      : 'ATTENTE DE LA CAMÉRA...'}
                </span>

                {/* Enhanced pulse effect when ready */}
                {cameraLoaded && !showCountdown && (
                  <motion.span
                    className="absolute inset-0 rounded-2xl border-2"
                    style={{ borderColor: primaryColor }}
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

          {/* Affiche le bouton REPRENDRE et GÉNÉRER MON IMAGE si une photo est capturée et processing false */}
          {enabled && !processing && (
            <div className="flex flex-col space-y-4 items-center">
              {/* Bouton Valider ma photo */}
              <motion.button 
                onClick={validerPhoto}
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
                disabled={processing}
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
                  ✨
                  {processing ? "VALIDATION..." : "VALIDER MON IMAGE"}
                  ⚡
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

              {/* Bouton REPRENDRE inchangé */}
              <motion.button 
                onClick={retake}
                className="px-6 py-3 rounded-lg font-medium text-base backdrop-blur-md border border-white/30"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
                whileHover={{ 
                  scale: 1.05,
                  backgroundColor: 'rgba(255,255,255,0.25)'
                }}
                whileTap={{ scale: 0.95 }}
              >
                🔄 REPRENDRE
              </motion.button>
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