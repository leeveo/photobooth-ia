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

// Fonction pour convertir un Blob en File
const blobToFile = (blob, fileName) => {
  return new File([blob], fileName, { 
    type: blob.type,
    lastModified: Date.now()
  });
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

// Variable globale pour stocker le flux de la caméra
let streamCam = null;

// Variables globales pour l'effet boomerang
let boomerangFrames = [];
let frameIdx = 0;
let canvasStreamTrack = null;
let isPlayingBoomerang = false;

// Remplacer la fonction createBoomerangEffect par cette version simplifiée
const createBoomerangEffect = async (videoBlob) => {
  console.log("⚡ Démarrage création boomerang simplifiée - taille vidéo:", videoBlob.size, "octets");
  
  return new Promise(async (resolve, reject) => {
    try {
      // Étape 1: Créer URL vidéo et élément vidéo
      const videoURL = URL.createObjectURL(videoBlob);
      const videoElement = document.createElement('video');
      videoElement.muted = true;
      
      // Étape 2: Charger la vidéo
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout chargement vidéo")), 10000);
        
        videoElement.onloadeddata = () => {
          clearTimeout(timeout);
          resolve();
        };
        
        videoElement.onerror = (e) => {
          clearTimeout(timeout);
          reject(new Error(`Erreur chargement vidéo: ${e.target.error?.message || 'Erreur inconnue'}`));
        };
        
        videoElement.src = videoURL;
        videoElement.load();
      });
      
      // Étape 3: Déterminer durée et configuration
      let duration = isFinite(videoElement.duration) && videoElement.duration > 0 
        ? videoElement.duration 
        : 3.0;
      
      console.log("📹 Vidéo source chargée -", 
        "dimensions:", videoElement.videoWidth, "x", videoElement.videoHeight, 
        "durée:", duration.toFixed(2), "s");
      
      // Étape 4: Configuration pour la capture
      // Utiliser moins de frames pour plus de fiabilité
      const frameCount = 10; // Nombre fixe de frames
      const timeStep = duration / frameCount;
      
      // Étape 5: Créer canvas et contexte
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Étape 6: Définir dimensions du canvas (plus petites pour performance)
      const maxDim = 320;
      const scale = Math.min(1, maxDim / Math.max(videoElement.videoWidth, videoElement.videoHeight));
      canvas.width = Math.floor(videoElement.videoWidth * scale);
      canvas.height = Math.floor(videoElement.videoHeight * scale);
      
      console.log("🎨 Canvas créé:", canvas.width, "x", canvas.height, "- capture de", frameCount, "frames");
      
      // Étape 7: Capturer les frames
      const frames = [];
      
      for (let i = 0; i < frameCount; i++) {
        try {
          // Calculer position dans la vidéo (répartition uniforme)
          const time = i * timeStep;
          
          // Définir cette position comme currentTime et attendre
          await new Promise(resolve => {
            const timeout = setTimeout(() => {
              console.warn(`⚠️ Timeout seek frame ${i+1}/${frameCount}`);
              resolve();
            }, 500);
            
            videoElement.onseeked = () => {
              clearTimeout(timeout);
              
              // Capture la frame
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
              
              // Ajouter la frame à notre collection
              const frameImage = canvas.toDataURL('image/jpeg', 0.8);
              frames.push(frameImage);
              
              console.log(`✓ Frame ${i+1}/${frameCount} capturée à ${time.toFixed(2)}s`);
              resolve();
            };
            
            videoElement.currentTime = time;
          });
        } catch (err) {
          console.error(`❌ Erreur capture frame ${i+1}:`, err);
        }
      }
      
      // Étape 8: Vérifier si on a capturé assez de frames
      const validFrames = frames.filter(f => f);
      console.log(`📊 ${validFrames.length}/${frameCount} frames valides capturées`);
      
      if (validFrames.length < 3) {
        console.warn("⚠️ Pas assez de frames pour un boomerang, retour vidéo originale");
        resolve(videoBlob);
        return;
      }
      
      // Étape 9: CRÉATION DE LA SÉQUENCE BOOMERANG
      // Ordre: forward (toutes frames) puis backward (sans la première et dernière pour éviter duplication)
      const boomerangFrames = [
        ...validFrames,                     // Frames avant
        ...validFrames.slice(0, -1).reverse().slice(1)  // Frames arrière (sans premier et dernier)
      ];
      
      console.log(`🔄 Séquence boomerang créée: ${validFrames.length} frames avant + ${validFrames.length - 2} frames arrière = ${boomerangFrames.length} total`);
      
      // Étape 10: Créer une vidéo à partir des frames
      // Utiliser une approche simple avec animation et MediaRecorder
      const outputCanvas = document.createElement('canvas');
      const outputCtx = outputCanvas.getContext('2d');
      outputCanvas.width = canvas.width;
      outputCanvas.height = canvas.height;
      
      // Étape 11: Démarrer enregistrement vidéo
      const mimeType = 'video/webm';
      const frameRate = 15; // 15 FPS pour un effet boomerang fluide
      const stream = outputCanvas.captureStream(frameRate);
      
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 1000000 // 1 Mbps
      });
      
      const chunks = [];
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      
      // Étape 12: Configurer fin d'enregistrement
      recorder.onstop = () => {
        // Nettoyer ressources
        URL.revokeObjectURL(videoURL);
        
        // Vérifier données
        if (chunks.length === 0) {
          console.error("❌ Pas de données d'enregistrement");
          resolve(videoBlob);
          return;
        }
        
        // Créer blob final
        const boomerangBlob = new Blob(chunks, { type: mimeType });
        console.log(`✅ Boomerang créé: ${boomerangBlob.size} octets`);
        
        if (boomerangBlob.size < 5000) {
          console.warn("⚠️ Fichier trop petit, retour à l'original");
          resolve(videoBlob);
        } else {
          resolve(boomerangBlob);
        }
      };
      
      // Étape 13: Démarrer enregistrement
      recorder.start(100); // Enregistrer par chunks de 100ms
      
      // Étape 14: Animer la séquence de frames
      let frameIndex = 0;
      const frameDuration = 1000 / frameRate;
      
      function animateFrames() {
        if (frameIndex >= boomerangFrames.length) {
          console.log("✓ Animation terminée, arrêt enregistrement");
          recorder.stop();
          return;
        }
        
        const img = new Image();
        img.onload = () => {
          outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
          outputCtx.drawImage(img, 0, 0, outputCanvas.width, outputCanvas.height);
          frameIndex++;
          setTimeout(animateFrames, frameDuration);
        };
        
        img.onerror = () => {
          console.warn(`⚠️ Erreur chargement frame ${frameIndex}`);
          frameIndex++;
          setTimeout(animateFrames, frameDuration);
        };
        
        img.src = boomerangFrames[frameIndex];
      }
      
      // Démarrer l'animation
      animateFrames();
      
    } catch (error) {
      console.error("❌ Erreur générale boomerang:", error);
      resolve(videoBlob); // Retourner l'original en cas d'erreur
    }
  });
};

// Modifions la fonction d'initialisation de la caméra pour demander aussi l'audio
const useWebcam = ({ videoRef, setCameraError, setCameraLoaded }) => {
  useEffect(() => {
    console.log("Initialisation de la caméra...");
    
    const initCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Votre navigateur ne prend pas en charge l'accès à la caméra");
        return;
      }
      
      try {
        // Configuration options adaptées selon l'appareil
        const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTablet = /(iPad|Android(?!.*Mobile))/i.test(navigator.userAgent);
        
        let videoConstraints;
        if (isMobile) {
          // Mobile: Priorité à la caméra frontale et résolution adaptée
          videoConstraints = {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: { ideal: 16/9 }
          };
        } else if (isTablet) {
          // Tablette: Résolution intermédiaire
          videoConstraints = {
            width: { ideal: 1600 },
            height: { ideal: 900 },
            aspectRatio: { ideal: 16/9 }
          };
        } else {
          // PC: Haute résolution
          videoConstraints = {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 16/9 }
          };
        }
        
        // Demander l'accès à la caméra ET au microphone (important pour l'enregistrement)
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: videoConstraints,
          audio: true // Ajout de l'audio pour garantir un bon enregistrement
        });
        
        streamCam = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.style.display = 'block';
          setCameraLoaded(true);
          
          try {
            await videoRef.current.play();
            console.log("Flux vidéo démarré avec succès");
          } catch (e) {
            console.error("Erreur lors de la lecture vidéo:", e);
            setCameraError("Erreur lors du démarrage de la vidéo");
          }
        }
      } catch (err) {
        console.error("Erreur d'accès à la caméra:", err);
        setCameraError(`Impossible d'accéder à la caméra: ${err.message}`);
      }
    };
    
    initCamera();
    
    // Nettoyage
    return () => {
      if (streamCam) {
        streamCam.getTracks().forEach(track => track.stop());
        streamCam = null;
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
  const previewVideoRef = useRef(null);
  const effectsCanvasRef = useRef(null); // Nouveau canvas pour les effets
  
  // Ajouter cet état pour gérer le ratio d'aspect
  const [aspectRatio, setAspectRatio] = useState('16/9');
  const [orientationData, setOrientationData] = useState(null);
  
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
  
  // Camera states
  const [cameraError, setCameraError] = useState(null);
  const [cameraLoaded, setCameraLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);
  const [videoVisible, setVideoVisible] = useState(true);
  
  // Device detection state
  const [deviceType, setDeviceType] = useState('desktop');
  
  // Quota states
  const [quota, setQuota] = useState(null);
  const [quotaUsed, setQuotaUsed] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [quotaAtteint, setQuotaAtteint] = useState(false);
  const [quotaRestant, setQuotaRestant] = useState(null);

  // États pour la gestion de l'enregistrement vidéo
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordingDuration] = useState(5); // Durée en secondes
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(5);

  // Ajouter un état pour stocker le blob de la vidéo
  const [recordedBlob, setRecordedBlob] = useState(null);

  // Initialize webcam with error handling
  useWebcam({ videoRef, setCameraError, setCameraLoaded });
  
  // Device detection effect
  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent;
      if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        setDeviceType('mobile');
      } else if (/(iPad|Android(?!.*Mobile))/i.test(userAgent)) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };
    
    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);
  
  // Function to reset state when retrying
  const reset2 = () => {
    setError(null);
    setLogs([]);
    setElapsedTime(0);
    setLoadingProgress(0);
  };
  
  // Function to manually retry camera initialization
  const retryCamera = useCallback(() => {
    console.log("🔄 Tentative de réinitialisation de la caméra");
    
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
  }, []);
  
  // Modifions la fonction d'enregistrement vidéo pour la rendre plus robuste
  const startRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject) {
      alert("La caméra n'est pas disponible");
      return;
    }
    
    console.log("Démarrage de l'enregistrement vidéo");
    setRecordedChunks([]);
    
    try {
      const stream = videoRef.current.srcObject;
      let recorder;
      
      // Vérifions les types MIME supportés
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4'
      ];
      
      let supportedType;
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          supportedType = type;
          console.log(`Type MIME supporté trouvé: ${type}`);
          break;
        }
      }
      
      if (!supportedType) {
        console.warn("Aucun type MIME spécifique supporté, utilisation des paramètres par défaut");
      }
      
      try {
        // Créer l'enregistreur avec le type MIME supporté ou par défaut
        recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
        console.log("MediaRecorder créé avec succès");
      } catch (e) {
        console.error("Erreur lors de la création de l'enregistreur:", e);
        // Essayer sans options spécifiques
        recorder = new MediaRecorder(stream);
        console.log("MediaRecorder créé sans options spécifiques");
      }
      
      // Stocker les données immédiatement disponibles
      const chunks = [];
      
      // Configurer les événements avec plus de robustesse
      recorder.ondataavailable = (event) => {
        console.log(`Données disponibles: ${event.data.size} octets`);
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };
      
      recorder.onstop = () => {
        console.log(`Enregistrement terminé. Nombre de chunks: ${chunks.length}`);
        
        // Utiliser les chunks locaux si l'état n'est pas mis à jour à temps
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: supportedType || 'video/webm' });
          processRecordedVideo(blob);
        } else {
          console.error("Aucune donnée enregistrée!");
          setCameraError("Aucune donnée vidéo capturée. Veuillez réessayer.");
        }
      };
      
      recorder.onerror = (event) => {
        console.error("Erreur du MediaRecorder:", event.error);
        setCameraError(`Erreur d'enregistrement: ${event.error.message || "Erreur inconnue"}`);
      };
      
      // Démarrer l'enregistrement avec des intervalles plus courts
      recorder.start(100); // Réduire l'intervalle pour obtenir plus de chunks
      console.log("Enregistrement démarré");
      setIsRecording(true);
      
      // Faire un enregistrement plus long pour s'assurer d'avoir des données
      const recordingTime = 3000; // 3 secondes
      
      // Arrêter l'enregistrement après le délai
      setTimeout(() => {
        if (recorder && recorder.state === 'recording') {
          console.log("Arrêt de l'enregistrement après délai");
          recorder.stop();
        }
      }, recordingTime);
      
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      setCameraError(`Erreur d'enregistrement: ${error.message}`);
    }
  };
  
  // Fix the image loading in applyOverlayToVideo
  const loadImage = (url) => new Promise((resolve, reject) => {
    if (!url) {
      console.error('❌ URL de l\'image manquante');
      return reject(new Error('URL de l\'image manquante'));
    }
    
    console.log('🖼️ Chargement de l\'image overlay:', url.substring(0, 50) + '...');
    const img = new window.Image(); // Use window.Image to ensure we're using the native browser Image constructor
    
    // Set crossOrigin before setting src to avoid CORS issues
    img.crossOrigin = 'anonymous';
    
    // Set up event handlers before setting src
    img.onload = () => {
      console.log('✅ Image overlay chargée avec succès:', img.width, 'x', img.height);
      resolve(img);
    };
    
    img.onerror = (e) => {
      console.error('❌ Erreur de chargement de l\'image overlay:', e);
      reject(new Error(`Erreur de chargement de l'image: ${e.type || 'unknown error'}`));
    };
    
    // Add a timeout to prevent hanging promises
    const timeout = setTimeout(() => {
      reject(new Error('Timeout lors du chargement de l\'image'));
    }, 15000); // 15 second timeout
    
    // Clear timeout when image loads or errors
    img.onload = () => {
      clearTimeout(timeout);
      console.log('✅ Image overlay chargée avec succès:', img.width, 'x', img.height);
      resolve(img);
    };
    
    img.onerror = (e) => {
      clearTimeout(timeout);
      console.error('❌ Erreur de chargement de l\'image overlay:', e);
      reject(new Error(`Erreur de chargement de l'image: ${e.type || 'unknown error'}`));
    };
    
    // Set src last after all handlers are in place
    img.src = url;
  });
  
  // Improve the boomerang function for videos with invalid duration
  const createBoomerangEffect = async (videoBlob) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`Starting boomerang creation from ${videoBlob.size} byte video`);
        
        // Set a default fallback duration if the video doesn't report a valid one
        const DEFAULT_DURATION = 3.0; // 3 seconds as fallback
        
        // Create a video element to analyze the source video
        const tempVideo = document.createElement('video');
        tempVideo.muted = true;
        
        // Use a Promise to handle video loading with timeout
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Video load timeout"));
          }, 5000);
          
          tempVideo.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve();
          };
          
          tempVideo.onerror = (e) => {
            clearTimeout(timeout);
            reject(new Error(`Video load error: ${e.target.error?.message || 'Unknown error'}`));
          };
          
          // Create an object URL from the blob
          const videoURL = URL.createObjectURL(videoBlob);
          tempVideo.src = videoURL;
          tempVideo.load();
        });
        
        // Check if video duration is valid, use fallback if not
        let duration = tempVideo.duration;
        console.log(`Source video loaded: ${tempVideo.videoWidth}x${tempVideo.videoHeight}, duration: ${duration}s`);
        
        if (!isFinite(duration) || duration <= 0) {
          console.warn(`Invalid video duration (${duration}), using fallback duration of ${DEFAULT_DURATION}s`);
          duration = DEFAULT_DURATION;
        }
        
        // Use more conservative settings
        const frameRate = 10; // Use lower framerate
        const totalFrames = Math.min(10, Math.floor(duration * frameRate));
        const frameInterval = duration / totalFrames;
        
        // Create smaller canvas for efficiency
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Limit maximum dimensions
        const maxDimension = 320; // Much smaller for performance
        const scale = Math.min(1, maxDimension / Math.max(tempVideo.videoWidth, tempVideo.videoHeight));
        canvas.width = Math.floor(tempVideo.videoWidth * scale);
        canvas.height = Math.floor(tempVideo.videoHeight * scale);
        
        console.log(`Using canvas: ${canvas.width}x${canvas.height}, capturing ${totalFrames} frames`);
        
        // Extract frames from video
        const frames = [];
        
        // Capture frames at fixed intervals (simpler approach that doesn't rely on seeking)
        for (let i = 0; i < totalFrames; i++) {
          try {
            // Calculate timestamp, ensuring it's a valid number
            const timestamp = Math.min(i * frameInterval, duration - 0.1);
            
            if (!isFinite(timestamp) || timestamp < 0) {
              console.warn(`Invalid timestamp: ${timestamp}, skipping frame`);
              continue;
            }
            
            // Use a reliable frame extraction method with timeout
            await new Promise((frameResolve) => {
              const seekTimeout = setTimeout(() => {
                console.warn(`Frame seek timeout for frame ${i}`);
                frameResolve(); // Resolve anyway to continue
              }, 500);
              
              const seekHandler = () => {
                clearTimeout(seekTimeout);
                try {
                  ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
                  const imageData = canvas.toDataURL('image/jpeg', 0.5);
                  frames.push(imageData);
                } catch (err) {
                  console.error(`Error capturing frame ${i}:`, err);
                  // Push null as placeholder
                  frames.push(null);
                }
                frameResolve();
              };
              
              // Set up event handler first
              tempVideo.onseeked = seekHandler;
              
              try {
                tempVideo.currentTime = timestamp;
              } catch (seekError) {
                console.error(`Error seeking to time ${timestamp}:`, seekError);
                clearTimeout(seekTimeout);
                frameResolve(); // Continue without this frame
              }
            });
          } catch (frameErr) {
            console.warn(`Error processing frame ${i}:`, frameErr);
          }
        }
        
        // Filter out null frames
        const validFrames = frames.filter(f => f !== null);
        console.log(`Captured ${validFrames.length} valid frames out of ${totalFrames} attempts`);
        
        // If we don't have enough frames, just return the original video
        if (validFrames.length < 3) {
          console.warn("Not enough valid frames for boomerang effect, returning original");
          resolve(videoBlob);
          return;
        }
        
        // Create boomerang sequence
        const boomerangFrames = [...validFrames, ...validFrames.slice().reverse()];
        
        // Create output canvas
        const outputCanvas = document.createElement('canvas');
        const outputCtx = outputCanvas.getContext('2d');
        outputCanvas.width = canvas.width;
        outputCanvas.height = canvas.height;
        
        // Try to find a supported MIME type
        let mimeType = 'video/webm';
        ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].forEach(type => {
          if (MediaRecorder.isTypeSupported(type)) mimeType = type;
        });
        
        // Create media recorder with reliable settings
        try {
          const stream = outputCanvas.captureStream(frameRate);
          const recorder = new MediaRecorder(stream, { 
            mimeType, 
            videoBitsPerSecond: 250000 // Very conservative bitrate
          });
          const chunks = [];
          
          recorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };
          
          recorder.onstop = () => {
            if (chunks.length === 0) {
              console.error("No data captured in boomerang recorder");
              resolve(videoBlob); // Return original as fallback
              return;
            }
            
            const boomerangBlob = new Blob(chunks, { type: mimeType });
            console.log(`Created boomerang effect: ${boomerangBlob.size} bytes`);

            // Validate the blob size
            if (boomerangBlob.size < 1000) {
              console.warn("Boomerang blob too small, using original");
              resolve(videoBlob);
            } else {
              resolve(boomerangBlob);
            }
          };
          
          // Capture more frequent chunks
          recorder.start(100);
          
          // Render frames with delay
          let frameIndex = 0;
          const frameDuration = 1000 / frameRate;
          
          function drawNextFrame() {
            if (frameIndex >= boomerangFrames.length) {
              recorder.stop();
              return;
            }
            
            const frameData = boomerangFrames[frameIndex];
            if (!frameData) {
              // Skip invalid frames
              frameIndex++;
              setTimeout(drawNextFrame, frameDuration);
              return;
            }
            
            const img = new Image();
            img.onload = () => {
              outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
              outputCtx.drawImage(img, 0, 0, outputCanvas.width, outputCanvas.height);
              frameIndex++;
              setTimeout(drawNextFrame, frameDuration);
            };
            
            img.onerror = () => {
              console.warn(`Error loading frame ${frameIndex}`);
              frameIndex++;
              setTimeout(drawNextFrame, frameDuration);
            };
            
            img.src = frameData;
          }
          
          // Start the animation
          drawNextFrame();
          
        } catch (recorderError) {
          console.error("MediaRecorder error:", recorderError);
          resolve(videoBlob); // Fall back to original video
        }
        
      } catch (error) {
        console.error("Error in boomerang effect creation:", error);
        // Always resolve with the original blob on error
        resolve(videoBlob);
      }
    });
  };
  
  // Fonction pour récupérer le thumbnail/overlay depuis canvas_layouts
  const fetchProjectThumbnail = async (projectId) => {
    try {
      console.log('Récupération du layout pour le projet:', projectId);
      
      if (!projectId) {
        console.warn('No project ID provided to fetchProjectThumbnail');
        return { thumbnailUrl: null, orientationData: null };
      }
      
      // Vérifier s'il existe des canvas_layouts pour ce projet
      const { data: layoutsData, error: layoutsError } = await supabase
        .from('canvas_layouts')
        .select('id, orientation_id')
        .eq('project_id', projectId);
        
      if (layoutsError) {
        console.error('Erreur lors de la vérification des layouts:', layoutsError);
        return { thumbnailUrl: null, orientationData: null };
      }
      
      if (!layoutsData || layoutsData.length === 0) {
        console.log('Aucun layout trouvé pour ce projet');
        return { thumbnailUrl: null, orientationData: null };
      }
      
      console.log(`${layoutsData.length} layouts trouvés, récupération du thumbnail et de l'orientation...`);
      
      // Récupérer l'URL du thumbnail et l'orientation_id du layout le plus récent
      const { data, error } = await supabase
        .from('canvas_layouts')
        .select('thumbnail_url, orientation_id')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error) {
        console.error('Erreur lors de la récupération du thumbnail:', error);
        return { thumbnailUrl: null, orientationData: null };
      }
      
      const thumbnailUrl = data?.thumbnail_url || null;
      const orientationId = data?.orientation_id || null;
      
      console.log('URL du thumbnail trouvée:', thumbnailUrl || 'null');
      console.log('ID d\'orientation trouvé:', orientationId || 'null');
      
      // Récupérer les données d'orientation si on a un orientation_id
      let orientationData = null;
      if (orientationId) {
        const { data: orientationResult, error: orientationError } = await supabase
          .from('photobooth_orientation')
          .select('width, height, position_x, position_y, width_encart_photo, height_encart_photo')
          .eq('id_orientation', orientationId)
          .single();
          
        if (!orientationError && orientationResult) {
          orientationData = orientationResult;
          console.log('Données d\'orientation trouvées:', orientationData);
        } else {
          console.error('Erreur lors de la récupération des données d\'orientation:', orientationError);
        }
      }
      
      return { thumbnailUrl, orientationData };
    } catch (error) {
      console.error('Exception dans fetchProjectThumbnail:', error);
      return { thumbnailUrl: null, orientationData: null };
    }
  };

  // Fonction pour appliquer un overlay à une vidéo
  const applyOverlayToVideo = async (videoBlob, overlayUrl, orientationData) => {
    if (!videoBlob || !overlayUrl) {
      console.log('Overlay ou vidéo manquant, retour du blob original');
      return videoBlob;
    }
    
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🎬 Début de l\'application de l\'overlay à la vidéo...', {
          videoSize: videoBlob.size,
          overlayUrl: overlayUrl.substring(0, 50) + '...',
          hasOrientationData: !!orientationData
        });
        
        // 1. Create video element for source video
        const videoElement = document.createElement('video');
        videoElement.muted = true;
        videoElement.playsInline = true;
        
        // 2. Load the overlay image
        let overlayImage;
        try {
          overlayImage = await loadImage(overlayUrl);
          console.log('✅ Overlay image loaded:', overlayImage.width, 'x', overlayImage.height);
        } catch (imageError) {
          console.error('❌ Failed to load overlay image:', imageError);
          return resolve(videoBlob); // Return original if we can't load the overlay
        }
        
        // 3. Load source video
        const videoUrl = URL.createObjectURL(videoBlob);
        
        // Wait for video metadata to load with timeout
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout loading video metadata'));
          }, 10000);
          
          videoElement.onloadedmetadata = () => {
            clearTimeout(timeout);
            console.log('✅ Source video loaded:', videoElement.videoWidth, 'x', videoElement.videoHeight, 
                        'duration:', videoElement.duration);
            resolve();
          };
          
          videoElement.onerror = (e) => {
            clearTimeout(timeout);
            reject(new Error(`Video load error: ${e.target.error?.message || 'Unknown error'}`));
          };
          
          videoElement.src = videoUrl;
          videoElement.load();
        });
        
        // 4. Setup canvas for rendering frames with overlay
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions based on orientation data or overlay size
        const outputWidth = orientationData?.width || overlayImage.width || videoElement.videoWidth;
        const outputHeight = orientationData?.height || overlayImage.height || videoElement.videoHeight;
        
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        
        console.log('📐 Canvas dimensions:', canvas.width, 'x', canvas.height);
        
        // 5. Setup MediaRecorder with optimal settings
        const stream = canvas.captureStream(30); // 30fps
        
        // Find supported mime type
        const mimeTypes = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm'
        ];
        
        let mimeType = 'video/webm';
        for (const type of mimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            console.log('🎥 Using MIME type:', mimeType);
            break;
          }
        }
        
        const recorder = new MediaRecorder(stream, {
          mimeType: mimeType,
          videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
        });
        
        const chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        // 6. Setup completion handler
        recorder.onstop = () => {
          console.log(`🎬 Recording completed, collected ${chunks.length} chunks`);
          
          // Clean up video URL
          URL.revokeObjectURL(videoUrl);
          
          if (chunks.length === 0) {
            console.error('❌ No video data recorded');
            resolve(videoBlob); // Return original as fallback
            return;
          }
          
          // Create final video blob
          const combinedBlob = new Blob(chunks, { type: mimeType });
          
          // Validate output size
          if (combinedBlob.size < 10000) { // 10KB minimum
            console.warn('⚠️ Output blob too small, returning original');
            resolve(videoBlob);
          } else {
            console.log(`✅ Successfully created video with overlay: ${combinedBlob.size} bytes`);
            resolve(combinedBlob);
          }
        };
        
        // 7. Start recording
        recorder.start(100); // Capture in 100ms chunks
        
        // 8. Setup drawing function to render each frame
        const drawFrame = () => {
          // Stop if video ended or recorder stopped
          if (videoElement.ended || recorder.state === 'inactive') {
            console.log('🏁 Video playback complete or recorder stopped');
            if (recorder.state === 'recording') {
              recorder.stop();
            }
            return;
          }
          
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Fill with black background
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw video frame based on orientation data if available
          if (orientationData && 
              orientationData.width_encart_photo && 
              orientationData.height_encart_photo &&
              orientationData.position_x !== undefined &&
              orientationData.position_y !== undefined) {
            
            // Calculate dimensions to maintain aspect ratio
            const videoRatio = videoElement.videoWidth / videoElement.videoHeight;
            const encartRatio = orientationData.width_encart_photo / orientationData.height_encart_photo;
            
            let drawWidth, drawHeight, offsetX, offsetY;
            
            if (videoRatio > encartRatio) {
              // La vidéo est plus large (proportionnellement) que l'encart
              drawHeight = orientationData.height_encart_photo;
              drawWidth = drawHeight * videoRatio;
              offsetX = orientationData.position_x + (orientationData.width_encart_photo - drawWidth) / 2;
              offsetY = orientationData.position_y;
            } else {
              // La vidéo est plus haute (proportionnellement) que l'encart
              drawWidth = orientationData.width_encart_photo;
              drawHeight = drawWidth / videoRatio;
              offsetX = orientationData.position_x;
              offsetY = orientationData.position_y + (orientationData.height_encart_photo - drawHeight) / 2;
            }
            
            // Dessiner la vidéo dans l'encart
            ctx.save();
            ctx.fillStyle = '#000000'; // Fond noir pour les zones sans vidéo
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight, offsetX, offsetY, drawWidth, drawHeight);
                
            // Dessiner l'overlay par-dessus toute la zone
            ctx.drawImage(overlayImage, 0, 0, canvas.width, canvas.height);
            ctx.restore();
          } else {
            // Dessiner la vidéo à pleine taille si pas de données d'encart
            ctx.save();
            ctx.fillStyle = '#000000'; // Fond noir
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Calculer les dimensions pour centrer la vidéo et maintenir son ratio
            const videoRatio = videoElement.videoWidth / videoElement.videoHeight;
            const canvasRatio = canvas.width / canvas.height;
            
            let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
            
            if (videoRatio > canvasRatio) {
              // Vidéo plus large que le canvas (proportionnellement)
              drawWidth = canvas.width;
              drawHeight = canvas.width / videoRatio;
              offsetY = (canvas.height - drawHeight) / 2;
            } else {
              // Vidéo plus haute que le canvas (proportionnellement)
              drawHeight = canvas.height;
              drawWidth = canvas.height * videoRatio;
              offsetX = (canvas.width - drawWidth) / 2;
            }
            
            ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight, offsetX, offsetY, drawWidth, drawHeight);
                
            // Dessiner l'overlay par-dessus toute la zone
            ctx.drawImage(overlayImage, 0, 0, canvas.width, canvas.height);
            ctx.restore();
          }
          
          // Planifier la prochaine frame
          requestAnimationFrame(drawFrame);
        };
        
        // 9. Start video playback and rendering process
        try {
          // Make sure video starts from beginning
          videoElement.currentTime = 0;
          
          // Start playback and drawing
          const playPromise = videoElement.play();
          
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log('▶️ Video playback started');
              // Start drawing frames
              drawFrame();
            }).catch(error => {
              console.error('❌ Error playing video:', error);
              if (recorder.state === 'recording') {
                recorder.stop();
              }
              resolve(videoBlob); // Return original on error
            });
          } else {
            // Older browsers might not return a promise
            console.log('▶️ Video playback started (legacy)');
            drawFrame();
          }
        } catch (playbackError) {
          console.error('❌ Exception during video playback:', playbackError);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
          resolve(videoBlob);
        }
        
        // 10. Safety timeout in case video never ends
        const maxDuration = videoElement.duration && isFinite(videoElement.duration)
          ? Math.max(videoElement.duration * 1.5, 10) // 1.5x video duration or 10 seconds min
          : 20; // 20 seconds default if duration unknown
        
        console.log(`⏱️ Setting safety timeout for ${maxDuration} seconds`);
        
        setTimeout(() => {
          if (recorder.state === 'recording') {
            console.log('⚠️ Safety timeout triggered, stopping recorder');
            recorder.stop();
            videoElement.pause();
          }
        }, maxDuration * 1000);
        
        // 11. Add ended handler to stop recording when video completes
        videoElement.onended = () => {
          console.log('🔚 Video playback ended naturally');
          // Small delay to ensure the last frame is captured
          setTimeout(() => {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          }, 200);
        };
        
      } catch (error) {
        console.error('❌ Error in applyOverlayToVideo:', error);
        // Return the original video on any error
        resolve(videoBlob);
      }
    });
  };
  
  // Enhanced video handling functions
  const processRecordedVideo = async (blob) => {
    if (!blob || blob.size === 0) {
      setCameraError("Aucune donnée vidéo enregistrée");
      return;
    }
    
    setProcessing(true);
    setIsRecording(false);
    
    try {
      console.log(`🎬 Traitement vidéo: ${blob.size} octets`);
      
      // Nettoyer toute URL d'objet précédente pour éviter les fuites de mémoire
      if (recordedVideo) {
        URL.revokeObjectURL(recordedVideo);
      }
      
      // Stocker le blob pour utilisation ultérieure
      setRecordedBlob(blob);
      
      // Créer un élément vidéo temporaire pour analyser le blob
      const videoElement = document.createElement('video');
      videoElement.muted = true;
      
      // Charger la vidéo source
      const videoURL = URL.createObjectURL(blob);
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout chargement vidéo")), 10000);
        
        videoElement.onloadeddata = () => {
          clearTimeout(timeout);
          resolve();
        };
        
        videoElement.onerror = (e) => {
          clearTimeout(timeout);
          reject(new Error(`Erreur chargement vidéo: ${e.target.error?.message || 'Erreur inconnue'}`));
        };
        
        videoElement.src = videoURL;
        videoElement.load();
      });
      
      console.log(`📹 Vidéo source: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
      
      // Créer un canvas pour capturer et afficher les frames
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Définir les dimensions du canvas
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      // Préparer le stream du canvas pour l'enregistrement
      const canvasStream = canvas.captureStream(0); // 0 = contrôle manuel des frames
      canvasStreamTrack = canvasStream.getVideoTracks()[0];
      
      // Créer le MediaRecorder pour enregistrer le résultat
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      
      const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
      console.log(`🎥 Utilisation du format: ${supportedMimeType}`);
      
      const recorder = new MediaRecorder(canvasStream, {
        mimeType: supportedMimeType,
        videoBitsPerSecond: 1000000
      });
      
      const chunks = [];
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      
      // Quand l'enregistrement est terminé, créer le blob final
      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: supportedMimeType });
        console.log(`✅ Boomerang créé: ${finalBlob.size} octets`);
        
        if (finalBlob.size < 5000) {
          console.warn("⚠️ Fichier trop petit, utilisation de l'original");
          setRecordedBlob(blob);
        } else {
          setRecordedBlob(finalBlob);
        }
        
        // Créer URL pour l'aperçu
        const boomerangURL = URL.createObjectURL(finalBlob.size < 5000 ? blob : finalBlob);
        setRecordedVideo(boomerangURL);
        
        // Configurer l'élément vidéo pour la lecture avec reset préalable
        if (previewVideoRef.current) {
          // Nettoyer toute lecture précédente
          previewVideoRef.current.pause();
          previewVideoRef.current.removeAttribute('src');
          previewVideoRef.current.load();
          
          // Configurer la nouvelle vidéo
          previewVideoRef.current.src = boomerangURL;
          previewVideoRef.current.loop = true;
          previewVideoRef.current.muted = true;
          previewVideoRef.current.style.display = 'block';
          previewVideoRef.current.play().catch(e => {
            console.error("Erreur lecture vidéo:", e);
          });
        }
      };
      
      // Capturer les frames
      boomerangFrames = []; // Réinitialiser
    
    // Lecture de la vidéo et capture des frames
    videoElement.currentTime = 0;
    await videoElement.play();
    
    // Définir le nombre de frames à capturer
    const frameRate = 10; // Framerate raisonnable
    const frameInterval = 1000 / frameRate;
    let lastCaptureTime = 0;
    
    // Capturer les frames tant que la vidéo joue
    while (videoElement.currentTime < videoElement.duration && boomerangFrames.length < 20) {
      const now = Date.now();
      
      if (now - lastCaptureTime >= frameInterval) {
        // Capturer la frame actuelle
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Stocker les données de l'image
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        boomerangFrames.push(imageData);
        
        console.log(`✓ Frame ${boomerangFrames.length} capturée à ${videoElement.currentTime.toFixed(2)}s`);
        lastCaptureTime = now;
      }
      
      // Petit délai pour laisser la vidéo progresser
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Vérifier si assez de frames ont été capturées
    if (boomerangFrames.length < 3) {
      console.warn("⚠️ Pas assez de frames pour boomerang");
      // Utiliser la vidéo originale
      setRecordedVideo(videoURL);
      setEnabled(true);
      setProcessing(false);
      return;
    }
    
    console.log(`🔄 ${boomerangFrames.length} frames capturées, création boomerang`);
    
    // Créer la séquence boomerang: avant + arrière
    const reversedFrames = [...boomerangFrames].reverse();
    boomerangFrames = [...boomerangFrames, ...reversedFrames];
    
    // Démarrer l'enregistrement
    recorder.start(100);
    
    // Démarrer la lecture boomerang
    frameIdx = 0;
    isPlayingBoomerang = true;
    
    // Fonction pour rendre les frames
    const renderFrame = () => {
      if (!isPlayingBoomerang || boomerangFrames.length === 0) return;
      
      // Dessiner la frame actuelle
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(boomerangFrames[frameIdx], 0, 0);
      
      // Demander explicitement l'envoi de cette frame au stream
      if (canvasStreamTrack) {
        canvasStreamTrack.requestFrame();
      }
      
      // Passer à la frame suivante
      frameIdx = (frameIdx + 1) % boomerangFrames.length;
      
      // Arrêter l'enregistrement après une boucle complète
      if (frameIdx === 0 && recorder && recorder.state === 'recording') {
        recorder.stop();
        isPlayingBoomerang = false;
        return;
      }
      
      // Planifier la frame suivante
      setTimeout(renderFrame, frameInterval);
    };
    
    // Lancer le rendu
    renderFrame();
    
    // Activer l'aperçu
    setEnabled(true);
    
  } catch (error) {
    console.error("❌ Erreur création boomerang:", error);
    setCameraError(`Erreur: ${error.message}`);
    
    // En cas d'erreur, utiliser la vidéo originale
    if (blob) {
      const videoURL = URL.createObjectURL(blob);
      setRecordedVideo(videoURL);
      setEnabled(true);
    }
  } finally {
    setProcessing(false);
  }
};
  
  // Fonction simplifiée pour partager la vidéo
  const partagerVideo = async () => {
    if (!recordedBlob) {
      setCameraError("Aucune vidéo disponible à partager");
      return;
    }
    
    setProcessing(true);
    setLogs(["Préparation de la vidéo..."]);
    
    try {
      // Validate blob before proceeding
      if (recordedBlob.size < 1000) {
        throw new Error("Fichier vidéo trop petit ou invalide");
      }
      
      // Ensure project ID is available
      const projectId = project?.id || localStorage.getItem('currentProjectId');
      console.log("📋 Utilisation du projet ID:", projectId);
      setLogs(logs => [...logs, `Initialisation avec projet ID: ${projectId || 'inconnu'}`]);
      
      // 1. Récupération de l'overlay/watermark si disponible
      setLogs(logs => [...logs, "Récupération du layout du projet..."]);
      let thumbnailUrl = null;
      let orientationData = null;
      let hasWatermark = false;
      
      if (projectId) {
        try {
          console.log("🔍 Recherche du layout pour le projet:", projectId);
          const layoutData = await fetchProjectThumbnail(projectId);
          thumbnailUrl = layoutData.thumbnailUrl;
          orientationData = layoutData.orientationData;
          
          console.log("📋 Données de layout récupérées:", {
            thumbnailUrl: thumbnailUrl ? (thumbnailUrl.substring(0, 50) + '...') : 'non trouvé',
            hasOrientationData: !!orientationData
          });
          
          if (orientationData) {
            console.log("📐 Données d'orientation:", orientationData);
          }
        } catch (layoutError) {
          console.error("❌ Erreur lors de la récupération du layout:", layoutError);
          setLogs(logs => [...logs, "Erreur lors de la récupération du layout"]);
        }
      }
      
      let finalVideoBlob = recordedBlob;
      
      // 2. Application de l'overlay à la vidéo si disponible
      if (thumbnailUrl) {
        setLogs(logs => [...logs, "Application du layout à la vidéo..."]);
        try {
          console.log("🎨 Début de l'application du layout à la vidéo...");
          
          const overlaidVideo = await applyOverlayToVideo(recordedBlob, thumbnailUrl, orientationData);
          
          if (overlaidVideo && overlaidVideo !== recordedBlob && overlaidVideo.size > 1000) {
            console.log(`✅ Layout appliqué avec succès! Taille: ${Math.round(overlaidVideo.size/1024)}KB`);
            finalVideoBlob = overlaidVideo;
            hasWatermark = true;
            setLogs(logs => [...logs, `Layout appliqué avec succès! (${Math.round(overlaidVideo.size/1024)}KB)`]);
          } else {
            console.warn("⚠️ Échec de l'application du layout, utilisation de la vidéo originale");
            setLogs(logs => [...logs, "Échec de l'application du layout, utilisation de la vidéo originale"]);
          }
        } catch (overlayError) {
          console.error("❌ Erreur lors de l'application de l'overlay:", overlayError);
          setLogs(logs => [...logs, "Erreur lors de l'application du layout"]);
        }
      } else {
        console.log("ℹ️ Aucun layout trouvé pour ce projet, utilisation de la vidéo originale");
        setLogs(logs => [...logs, "Aucun layout trouvé pour ce projet"]);
      }
      
      // 3. Création du fichier et upload vers S3
      const timestamp = Date.now();
      const uniqueFilename = `boomerang_${timestamp}_${projectId || 'unknown'}.webm`;
      
      setLogs(logs => [...logs, `Préparation de l'upload: ${Math.round(finalVideoBlob.size/1024)}KB`]);
      console.log(`📦 Préparation de l'upload: ${Math.round(finalVideoBlob.size/1024)}KB`);
      
      // Upload the final video to S3
      const videoFile = new File(
        [finalVideoBlob], 
        uniqueFilename, 
        { 
          type: finalVideoBlob.type || 'video/webm',
          lastModified: timestamp
        }
      );
      
      // Create FormData with appropriate metadata
      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('projectId', projectId || 'unknown');
      formData.append('fileName', uniqueFilename);
      formData.append('contentType', finalVideoBlob.type || 'video/webm');
      
      // Log the upload attempt for debugging
      console.log("🔍 Upload FormData:", {
        fileName: uniqueFilename,
        fileSize: videoFile.size,
        fileType: videoFile.type,
        projectId: projectId || 'unknown'
      });
      
      // Send to S3 upload API
      setLogs(logs => [...logs, "Envoi de la vidéo vers le cloud..."]);
      const uploadResponse = await fetch('/api/upload-to-s3', {
        method: 'POST',
        body: formData
      });
      
      // Handle upload errors
      if (!uploadResponse.ok) {
        const errorResponse = await uploadResponse.text().catch(() => 'Unknown error');
        console.error(`❌ S3 upload failed: ${uploadResponse.status} - ${errorResponse}`);
        throw new Error(`Erreur d'upload (${uploadResponse.status}): ${errorResponse}`);
      }
      
      // Parse response and verify URL
      const uploadData = await uploadResponse.json();
      
      if (!uploadData || !uploadData.url) {
        console.error("❌ Invalid upload response:", uploadData);
        throw new Error("Réponse invalide du service d'upload");
      }
      
      console.log("✅ Upload successful:", uploadData.url);
      setLogs(logs => [...logs, "Vidéo uploadée avec succès!"]);
      
      // Stocker l'URL dans localStorage pour la page de résultat
      localStorage.setItem("videoURLResult", uploadData.url);
      localStorage.setItem("videoURLResultS3", uploadData.url);
      
      // 4. Enregistrement des données dans la base de données
      try {
        setLogs(logs => [...logs, "Enregistrement des données de session..."]);
        
        // Simplified session payload to avoid DB schema issues
        const sessionPayload = {
          user_email: null,
          style_id: localStorage.getItem('selectedStyleId') || null,
          style_key: localStorage.getItem('selectedStyleKey') || null,
          gender: styleGender || null,
          result_image_url: uploadData.url, // Store video URL in image_url field
          result_s3_url: uploadData.url,
          processing_time_ms: 0,
          is_success: true,
          error_message: null,
          project_id: projectId || null,
          created_by: null,
          has_watermark: hasWatermark,
          moderation: null,
          created_at: new Date().toISOString()
        };
        
        console.log("Insertion des données de session:", sessionPayload);
        
        // Use a simpler insert request to avoid 406 errors
        const { error } = await supabase
          .from('sessions')
          .insert(sessionPayload);
        
        if (error) {
          console.error("Database error:", error);
          console.error("Code:", error.code, "Message:", error.message, "Details:", error.details);
          setLogs(logs => [...logs, "Note: La vidéo a été uploadée mais les données de session n'ont pas pu être enregistrées"]);
        } else {
          setLogs(logs => [...logs, "Session enregistrée avec succès"]);
        }
      } catch (dbError) {
        console.error("Error saving session:", dbError);
        setLogs(logs => [...logs, "Note: Vidéo uploadée mais les données de session n'ont pas pu être sauvegardées"]);
      }
      
      // 5. Redirection vers la page de résultat
      setLogs(logs => [...logs, "Redirection vers la page de résultat..."]);
      
      setTimeout(() => {
        router.push(`/photobooth-boomerang/${slug}/result`);
      }, 1000);
      
    } catch (error) {
      console.error("Erreur lors du partage:", error);
      setCameraError(`Erreur: ${error.message}`);
      setLogs(logs => [...logs, `Erreur: ${error.message}`]);
    } finally {
      // S'assurer que l'indicateur de traitement est désactivé après un court délai
      setTimeout(() => {
        setProcessing(false);
      }, 500);
    }
  };

  // Fonction pour recommencer - améliorée pour nettoyer correctement la vidéo précédente
  const retake = useCallback(() => {
    // Nettoyer la vidéo précédente en révoquant son URL
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
    }
    
    // Arrêter la lecture de la vidéo de prévisualisation et nettoyer sa source
    if (previewVideoRef.current) {
      previewVideoRef.current.pause();
      previewVideoRef.current.removeAttribute('src');
      previewVideoRef.current.load(); // Force le rechargement pour vider la source
      previewVideoRef.current.style.display = 'none';
    }
    
    setEnabled(false);
    setRecordedVideo(null);
    setRecordedChunks([]);
    setRecordedBlob(null);
    
    // Nettoyer les ressources du boomerang
    isPlayingBoomerang = false;
    boomerangFrames = [];
    frameIdx = 0;
    if (canvasStreamTrack) {
      canvasStreamTrack.stop();
      canvasStreamTrack = null;
    }
    
    // Make sure video is visible again
    if (videoRef.current) {
      videoRef.current.style.display = 'block';
    }
  }, [recordedVideo]);

  // Fonction pour le compte à rebours et démarrage de l'enregistrement
  const captureVideo = useCallback(() => {
    if (isRecording || showCountdown || processing) {
      console.log("Capture déjà en cours, ignorée");
      return;
    }
    
    console.log("Démarrage du compte à rebours pour la capture vidéo");
    
    // Démarrer le compte à rebours
    setShowCountdown(true);
    setCountdownNumber(3);
    
    setTimeout(() => setCountdownNumber(2), 1000);
    setTimeout(() => setCountdownNumber(1), 2000);
    setTimeout(() => {
      setShowCountdown(false);
      startRecording();
    }, 3000);
  }, [isRecording, showCountdown, processing]);

  // Add this missing function
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
  }, [slug, supabase]);

    // Fetch orientation data
    useEffect(() => {
        const fetchOrientation = async () => {
            if (!project?.id) return;
            
            try {
                const { data: layoutsData, error: layoutsError } = await supabase
                    .from('canvas_layouts')
                    .select('orientation_id')
                    .eq('project_id', project.id)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .single();

                if (layoutsError || !layoutsData) return;

                const { data: orientationResult, error: orientationError } = await supabase
                    .from('photobooth_orientation')
                    .select('width, height')
                    .eq('id_orientation', layoutsData.orientation_id)
                    .single();

                if (!orientationError && orientationResult) {
                    setOrientationData(orientationResult);
                }
            } catch (e) {
                console.error("Error fetching orientation:", e);
            }
        };

        fetchOrientation();
    }, [project?.id, supabase]);
  
  // Add effect to load project data
  useEffect(() => {
    let isMounted = true;
    
    // Async function to load data without setting state directly
    const loadInitialData = async () => {
      // Load project data and settings from localStorage first for faster rendering
      const cachedProject = localStorage.getItem('projectData');
      const cachedSettings = localStorage.getItem('projectSettings');
      
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
  }, [fetchProjectData]);
  
  // Fetch quota using the existing pattern
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

  // Load quota when project is loaded
  useEffect(() => {
    if (project && supabase) {
      fetchQuota();
    }
  }, [project, supabase, fetchQuota]);

  // The rest of your existing functions remain unchanged
  // ...existing code...

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

  // Définition des styles du conteneur vidéo avec ratio d'aspect adaptatif
  const containerStyle = {
    width: '100%',
    maxWidth: '1400px',
    aspectRatio: aspectRatio,
    border: cameraError ? `1px solid rgba(255, 0, 0, 0.5)` : `1px solid ${secondaryColor}30`,
    backgroundColor: 'black',
  };

  // Fonction pour déterminer le style du conteneur vidéo
  const getContainerStyle = () => {
    // Déterminer si l'appareil est mobile/tablette ou desktop
    const isMobileOrTablet = typeof window !== 'undefined' && window.innerWidth <= 1024;
    
    // Ajuster les dimensions selon le type d'appareil
    const style = {
      width: '100%',
      border: cameraError ? `1px solid rgba(255, 0, 0, 0.5)` : `1px solid ${secondaryColor}30`,
      backgroundColor: 'black',
    };
    
    if (isMobileOrTablet) {
      // Format carré pour mobiles et tablettes
      style.maxWidth = '100vw';
      style.aspectRatio = '1/1';
      style.maxHeight = 'min(100vw, 90vh)';
    } else {
      // Format 16:9 pour grands écrans avec taille réduite
      style.maxWidth = '1920px'; // Réduits de 1400px à 900px
      style.aspectRatio = '16/9';
     
      style.margin = '0 auto'; // Centrer horizontalement
    }
    
    return style;
  };

  return (
    <main 
      className="flex fixed h-full w-full overflow-auto flex-col items-center justify-center pt-2 pb-20 px-5 relative"
    >
      {/* Animated gradient background */}
      <motion.div
        className="fixed inset-0 z-0"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}10, ${primaryColor}20, ${secondaryColor}15)`,
        }}
        animate={{
          background: [
            `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}10, ${primaryColor}20, ${secondaryColor}15)`,
            `linear-gradient(225deg, ${secondaryColor}20, ${primaryColor}10, ${secondaryColor}15, ${primaryColor}25)`,
            `linear-gradient(315deg, ${primaryColor}20, ${secondaryColor}15, ${primaryColor}10, ${secondaryColor}20)`,
            `linear-gradient(45deg, ${secondaryColor}15, ${primaryColor}20, ${secondaryColor}10, ${primaryColor}15)`,
          ]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Floating background elements */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* Large floating orbs */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute rounded-full opacity-20 backdrop-blur-sm"
            style={{
              backgroundColor: i % 2 === 0 ? primaryColor : secondaryColor,
              width: `${100 + Math.random() * 200}px`,
              height: `${100 + Math.random() * 200}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50, 0],
              y: [0, Math.random() * 100 - 50, 0],
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          />
        ))}

        {/* Small sparkle particles */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              backgroundColor: i % 3 === 0 ? primaryColor : secondaryColor,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}

        {/* Geometric shapes */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`shape-${i}`}
            className="absolute opacity-10"
            style={{
              width: '60px',
              height: '60px',
              borderRadius: i % 2 === 0 ? '50%' : '0%',
              backgroundColor: 'transparent',
              border: `2px solid ${i % 2 === 0 ? primaryColor : secondaryColor}`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              rotate: [0, 360],
              scale: [1, 1.5, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      <motion.div 
        className={`w-full mx-auto mt-4 relative z-10 ${processing ? 'opacity-20 pointer-events-none' : ''} ${
          deviceType === 'mobile' || deviceType === 'tablet' 
            ? 'flex flex-col items-center justify-center min-h-screen px-4' 
            : 'max-w-6xl'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: processing ? 0.2 : 1, y: 0 }}
        transition={{ duration:  0.7 }}
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
          {enabled ? 'Vérifiez votre vidéo boomerang' : 'Enregistrez une vidéo pour l\'effet boomerang'}
        </motion.h2>
        
        {/* Cadre vidéo avec style responsif adaptatif selon l'appareil */}
        <motion.div 
          className={`relative overflow-hidden rounded-lg shadow-2xl ${
            deviceType === 'mobile' || deviceType === 'tablet' 
              ? 'mx-auto' 
              : 'mx-auto'
          }`}
          style={{ 
            // Gestion dynamique de la taille pour respecter le ratio
            width: 'auto',
            height: 'auto',
            
            // Contraintes pour rester dans l'écran
            maxWidth: '100%',
            maxHeight: deviceType === 'mobile' ? '65vh' : '75vh',
            
            // Le ratio d'aspect est prioritaire
            aspectRatio: orientationData ? `${orientationData.width}/${orientationData.height}` : (deviceType === 'mobile' ? '3/4' : deviceType === 'tablet' ? '4/3' : '16/9'),
            
            border: cameraError ? '1px solid rgba(255, 0, 0, 0.5)' : `1px solid ${secondaryColor}30`,
            backgroundColor: 'black',
            margin: '0 auto'
          }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {/* Compte à rebours amélioré */}
          <AnimatePresence>
            {showCountdown && (
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
            )}
          </AnimatePresence>
          
          {/* Indicateur d'enregistrement amélioré */}
          <AnimatePresence>
            {isRecording && (
              <motion.div 
                className="absolute top-4 right-4 z-10 flex items-center space-x-2 rounded-full px-4 py-2"
                style={{ backgroundColor: `${primaryColor}80` }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <motion.div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: secondaryColor }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                ></motion.div>
                <span className="text-white text-sm font-medium">Enregistrement...</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Indicateur de traitement Web 3.0 sophistiqué - Boomerang */}
          <AnimatePresence>
            {processing && (
              <motion.div 
                className="absolute inset-0 z-20 flex flex-col items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, 
                    rgba(0, 0, 0, 0.95) 0%, 
                    rgba(0, 0, 0, 0.85) 50%, 
                    rgba(0, 0, 0, 0.95) 100%
                  )`,
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)'
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {/* Particules d'ambiance pour effet boomerang */}
                {[...Array(18)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full"
                    style={{
                      backgroundColor: i % 3 === 0 ? primaryColor : secondaryColor,
                      left: `${20 + (i * 3.5)}%`,
                      top: `${30 + Math.sin(i * 0.5) * 20}%`,
                    }}
                    animate={{
                      x: [0, Math.cos(i * 0.8) * 30, 0],
                      y: [0, Math.sin(i * 0.8) * 30, 0],
                      opacity: [0.3, 1, 0.3],
                      scale: [0.5, 1.2, 0.5]
                    }}
                    transition={{
                      duration: 3 + (i * 0.1),
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.15
                    }}
                  />
                ))}

                {/* Container principal glassmorphisme */}
                <motion.div
                  className="relative p-8 rounded-3xl border"
                  style={{
                    background: `linear-gradient(135deg, 
                      rgba(255, 255, 255, 0.1) 0%,
                      rgba(255, 255, 255, 0.05) 100%
                    )`,
                    borderColor: `rgba(255, 255, 255, 0.2)`,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: `
                      0 25px 50px rgba(0, 0, 0, 0.25),
                      inset 0 1px 0 rgba(255, 255, 255, 0.2)
                    `
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                >
                  {/* Logo central avec animation boomerang */}
                  <div className="relative flex items-center justify-center mb-6">
                    {/* Cercle de rotation extérieur */}
                    <motion.div
                      className="absolute w-20 h-20 rounded-full border-2"
                      style={{
                        borderColor: `${primaryColor}40`,
                        borderTopColor: primaryColor,
                        borderRightColor: secondaryColor
                      }}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                    
                    {/* Forme losange représentant le boomerang */}
                    <motion.div
                      className="absolute w-12 h-12 transform rotate-45"
                      style={{
                        background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})`,
                        borderRadius: '20% 80% 20% 80%'
                      }}
                      animate={{
                        rotateZ: [0, 180, 360],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />

                    {/* Points orbitaux représentant le mouvement */}
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: i % 2 === 0 ? primaryColor : secondaryColor,
                        }}
                        animate={{
                          x: Math.cos((i * 60 * Math.PI) / 180) * 35,
                          y: Math.sin((i * 60 * Math.PI) / 180) * 35,
                          scale: [0.5, 1, 0.5],
                          opacity: [0.4, 1, 0.4]
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.2
                        }}
                      />
                    ))}

                    {/* Icône centrale de traitement vidéo */}
                    <motion.div
                      className="relative z-10 text-3xl"
                      animate={{ 
                        rotateY: [0, 180, 360],
                        scale: [0.9, 1.1, 0.9]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      🎬
                    </motion.div>
                  </div>

                  {/* Texte principal */}
                  <motion.div
                    className="text-center mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    <h3 className="text-white text-xl font-bold mb-2">
                      Création de votre Boomerang
                    </h3>
                    <p className="text-gray-300 text-sm">
                      Traitement magique en cours...
                    </p>
                  </motion.div>

                  {/* Barre de progression sophistiquée */}
                  <motion.div
                    className="w-64 h-2 rounded-full overflow-hidden mb-4"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor}, ${primaryColor})`
                      }}
                      animate={{
                        x: ["-100%", "100%"]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.div>

                  {/* Affichage des logs stylisé */}
                  {logs.length > 0 && (
                    <motion.div
                      className="text-center p-4 rounded-xl border max-w-sm"
                      style={{
                        backgroundColor: `rgba(255, 255, 255, 0.05)`,
                        borderColor: `rgba(255, 255, 255, 0.1)`,
                        backdropFilter: 'blur(10px)'
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                    >
                      <motion.p
                        className="text-white text-sm leading-relaxed"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {logs[logs.length - 1]}
                      </motion.p>
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Video elements responsive */}
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover"
            style={{ 
              display: enabled ? 'none' : 'block',
              transform: 'scaleX(-1)',
              backgroundColor: '#000'
            }} 
            playsInline
            autoPlay
            muted
          />
          
          <video 
            ref={previewVideoRef} 
            className="w-full h-full object-cover"
            style={{ display: enabled ? 'block' : 'none' }}
            playsInline
            autoPlay
            muted
            // Suppression de l'attribut "controls" pour masquer la barre de lecture
            preload="auto"
            onCanPlay={() => console.log("Vidéo prête à être lue")}
            onError={(e) => console.error("Erreur vidéo:", e)}
          />
          
          {/* Viewfinder overlay - only show when camera is working */}
          {!enabled && cameraLoaded && !isRecording && (
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
        </motion.div>
        
        {/* Boutons d'action améliorés */}
        <motion.div 
          className="mt-8 flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {/* Affiche le bouton uniquement si quota non atteint */}
          {!enabled && !quotaAtteint ? (
            <motion.button
              onClick={captureVideo}
              className="relative px-12 py-6 rounded-2xl font-black text-2xl overflow-hidden group shadow-2xl"
              style={{ 
                backgroundColor: secondaryColor, 
                color: primaryColor,
                opacity: cameraLoaded && !showCountdown && !isRecording ? 1 : 0.5,
                boxShadow: `0 20px 40px ${secondaryColor}40`
              }}
              whileHover={cameraLoaded && !showCountdown && !isRecording ? { 
                scale: 1.05,
                boxShadow: `0 25px 50px ${secondaryColor}60`
              } : {}}
              whileTap={cameraLoaded && !showCountdown && !isRecording ? { scale: 0.95 } : {}}
              disabled={isRecording || showCountdown || processing || !cameraLoaded}
            >
              {/* Animated floating bubbles */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={`record-bubble-${i}`}
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

              {/* Button text */}
              <span className="relative z-10 flex items-center gap-3">
                🎬
                {isRecording 
                  ? "ENREGISTREMENT..." 
                  : showCountdown 
                    ? `PRÉPARATION (${countdownNumber})` 
                    : processing
                      ? "TRAITEMENT EN COURS..."
                      : "ENREGISTRER POUR BOOMERANG"}
              </span>

              {/* Enhanced pulse effect when ready */}
              {cameraLoaded && !showCountdown && !isRecording && (
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
          ) : null}

          {/* Affiche les boutons de partage et téléchargement si vidéo capturée */}
          {enabled && !processing ? (
            <div className="flex flex-wrap gap-4 justify-center">
              {/* Bouton Partager amélioré */}
              <motion.button
                onClick={partagerVideo}
                className="relative px-12 py-6 rounded-2xl font-black text-xl overflow-hidden group shadow-2xl min-w-[180px]"
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
                disabled={processing || !recordedBlob}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Animated elements */}
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
                
                {processing ? (
                  <div className="flex items-center gap-2 relative z-10">
                    <motion.div 
                      className="w-4 h-4 rounded-full"
                      style={{ 
                        borderWidth: '2px',
                        borderColor: `${primaryColor}50`,
                        borderTopColor: primaryColor,
                        borderStyle: 'solid'
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    ></motion.div>
                    <span>TRAITEMENT...</span>
                  </div>
                ) : (
                  <span className="relative z-10 flex items-center gap-2">✨ PARTAGER</span>
                )}
              </motion.button>
              
              {/* Bouton télécharger amélioré */}
              <motion.button
                onClick={() => {
                  if (recordedVideo) {
                    const a = document.createElement('a');
                    a.href = recordedVideo;
                    a.download = 'boomerang-video.webm';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }
                }}
                className="relative px-12 py-6 rounded-2xl font-black text-xl overflow-hidden group shadow-2xl min-w-[180px]"
                style={{ 
                  backgroundColor: `${primaryColor}90`, 
                  color: 'white',
                  boxShadow: `0 10px 30px ${primaryColor}40`
                }}
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: `0 15px 30px ${primaryColor}60`
                }}
                whileTap={{ scale: 0.95 }}
                disabled={!recordedVideo || processing}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <span className="relative z-10">⬇️ TÉLÉCHARGER</span>
              </motion.button>
              
              {/* Bouton recommencer amélioré */}
              <motion.button
                onClick={retake}
                className="px-12 py-6 rounded-2xl font-black text-xl backdrop-blur-md border border-white/30 min-w-[180px]"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
                whileHover={{ 
                  scale: 1.05,
                  backgroundColor: 'rgba(255,255,255,0.25)'
                }}
                whileTap={{ scale: 0.95 }}
                disabled={processing}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                🔄 RECOMMENCER
              </motion.button>
            </div>
          ) : null}
          
          {/* Affichage du quota restant ou message quota atteint */}
          <div className="mt-4 text-center">
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
        
        {/* Logs détaillés pour le développement */}
        {process.env.NODE_ENV === 'development' && processing && logs.length > 0 && (
          <motion.div 
            className="mt-4 p-4 rounded-lg text-white text-xs max-w-2xl mx-auto"
            style={{ backgroundColor: `${primaryColor}30` }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="font-bold mb-2">Logs:</p>
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="opacity-80">{log}</div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}