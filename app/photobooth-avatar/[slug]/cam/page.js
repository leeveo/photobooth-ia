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

// Hook webcam
let streamCam = null;
const useWebcam = ({ videoRef }) => {
  useEffect(() => {
    let isMounted = true;
    
    const initializeCamera = async () => {
      console.log("🎥 Initializing camera...");
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Votre navigateur ne prend pas en charge l'accès à la caméra");
        return;
      }
      
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
      
      // Méthode standard si pas iPad ou si méthode iPad a échoué
      if (!stream) {
        try {
          console.log("🔄 Tentative méthode standard...");
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          console.log("✅ Caméra initialisée via méthode standard");
        } catch (err) {
          console.error("❌ Erreur accès caméra:", err);
          return;
        }
      }
      
      if (!isMounted) {
        // Component unmounted during async call, clean up
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      // Stocker le stream
      streamCam = stream;
      window.localStream = stream;
      
      // Appliquer le stream à l'élément vidéo
      if (videoRef.current !== null) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    };
    
    initializeCamera();
    
    return () => {
      isMounted = false;
      if (streamCam) {
        streamCam.getTracks().forEach(track => track.stop());
        streamCam = null;
        window.localStream = null;
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
  const [stylePrompt, setStylePrompt] = useState(null);
  const [styleGender, setStyleGender] = useState("male"); // Default to male
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // ✅ ÉTATS IPAD CAMERA SWITCHING 
  const [isIPadDevice, setIsIPadDevice] = useState(false);
  const [currentCameraFacing, setCurrentCameraFacing] = useState('user'); // 'user' = avant, 'environment' = arrière
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // State pour stocker les dimensions de l'orientation
  const [orientationData, setOrientationData] = useState(null);
  
  // Initialize webcam
  useWebcam({ videoRef, previewRef });
  
  useEffect(() => {
    // ✅ DÉTECTION IPAD AU DÉMARRAGE
    const detectIPadDevice = () => {
      const isIPad = /iPad/i.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                    (/Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent));
      setIsIPadDevice(isIPad);
      console.log("🔍 Détection iPad:", isIPad ? "✅ iPad détecté" : "❌ Pas un iPad");
    };
    
    detectIPadDevice();
    
    // Load project data and settings from localStorage
    const cachedProject = localStorage.getItem('projectData');
    const cachedSettings = localStorage.getItem('projectSettings');
    const storedGender = localStorage.getItem('styleGender');
    const storedPrompt = localStorage.getItem('stylePrompt');
    
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
    
    if (storedGender) {
      setStyleGender(storedGender);
    }
    
    if (storedPrompt) {
      setStylePrompt(storedPrompt);
    }
    
    // Always fetch fresh data
    fetchProjectData();
  }, [fetchProjectData]);
  
  // First, convert fetchProjectData to useCallback to prevent infinite loops
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

  // Charger les données d'orientation
  useEffect(() => {
    const fetchOrientation = async () => {
      if (!project?.id) return;
      
      try {
        // 1. Récupérer le layout actif pour ce projet
        const { data: layoutData, error: layoutError } = await supabase
          .from('canvas_layouts')
          .select('orientation_id')
          .eq('project_id', project.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
          
        if (layoutError || !layoutData?.orientation_id) {
          console.log("Pas de layout ou orientation trouvée, utilisation défaut");
          return;
        }

        // 2. Récupérer les détails de l'orientation
        const { data: orientation, error: orientationError } = await supabase
          .from('photobooth_orientation')
          .select('width, height')
          .eq('id_orientation', layoutData.orientation_id)
          .single();
          
        if (orientation && !orientationError) {
          console.log("Orientation chargée:", orientation);
          setOrientationData(orientation);
        }
      } catch (err) {
        console.error("Erreur chargement orientation:", err);
      }
    };
    
    fetchOrientation();
  }, [project?.id, supabase]);
  
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
    
    // Get video dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // Set canvas dimensions
    // Use orientation data if available, otherwise default to 512x512
    const targetWidth = orientationData?.width || 512;
    const targetHeight = orientationData?.height || 512;
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const context = canvas.getContext('2d');
    if (context === null) return;
    
    // Calculate scaling to maintain aspect ratio while filling the canvas (cover)
    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = targetWidth / targetHeight;
    
    let sx, sy, sWidth, sHeight;

    if (videoAspect > canvasAspect) {
      // Vidéo plus large que le canvas (en ratio)
      // On garde toute la hauteur de la vidéo
      sHeight = videoHeight;
      // On calcule la largeur nécessaire pour respecter le ratio du canvas
      sWidth = sHeight * canvasAspect;
      // On centre horizontalement
      sx = (videoWidth - sWidth) / 2;
      sy = 0;
    } else {
      // Vidéo plus haute que le canvas (en ratio)
      // On garde toute la largeur de la vidéo
      sWidth = videoWidth;
      // On calcule la hauteur nécessaire
      sHeight = sWidth / canvasAspect;
      // On centre verticalement
      sy = (videoHeight - sHeight) / 2;
      sx = 0;
    }
    
    // Draw image to canvas with proper cropping
    context.drawImage(
      video,
      sx, sy, sWidth, sHeight, // Source (crop)
      0, 0, targetWidth, targetHeight // Destination (full canvas)
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
  
  // ✅ FONCTION SWITCH CAMERA POUR IPAD
  const switchCamera = async () => {
    if (!isIPadDevice || switchingCamera) {
      console.log("⚠️ Switch camera: Pas un iPad ou déjà en cours de switch");
      return;
    }
    
    setSwitchingCamera(true);
    console.log("🔄 Changement de caméra en cours...");
    
    try {
      // Stopper le stream actuel
      if (streamCam) {
        streamCam.getTracks().forEach(track => track.stop());
        streamCam = null;
        window.localStream = null;
      }
      
      // Déterminer la nouvelle direction
      const newFacing = currentCameraFacing === 'user' ? 'environment' : 'user';
      console.log(`📱 Changement: ${currentCameraFacing} → ${newFacing}`);
      
      let newStream = null;
      
      // Essayer d'abord les méthodes ciblées
      const configs = [
        { video: { facingMode: { exact: newFacing } } },
        { video: { facingMode: newFacing } },
        { video: true } // Fallback
      ];
      
      for (const config of configs) {
        try {
          newStream = await navigator.mediaDevices.getUserMedia(config);
          console.log("✅ Nouveau stream obtenu avec config:", config);
          break;
        } catch (err) {
          console.log("❌ Config échouée:", config, err.message);
        }
      }
      
      // Si échec, utiliser la méthode iPad spécialisée
      if (!newStream && newFacing === 'user') {
        console.log("🍎 Utilisation méthode iPad spécialisée pour caméra frontale...");
        newStream = await tryIPadSafariFrontCamera();
      }
      
      if (newStream) {
        streamCam = newStream;
        window.localStream = newStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          await videoRef.current.play();
        }
        
        setCurrentCameraFacing(newFacing);
        console.log("✅ Changement de caméra réussi!");
      } else {
        throw new Error("Impossible d'obtenir le nouveau stream");
      }
      
    } catch (error) {
      console.error("❌ Erreur lors du changement de caméra:", error);
      
      // Réinitialiser la caméra originale en cas d'erreur
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamCam = fallbackStream;
        window.localStream = fallbackStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
      } catch (fallbackError) {
        console.error("❌ Erreur critique - impossible de réinitialiser la caméra:", fallbackError);
      }
    } finally {
      setSwitchingCamera(false);
    }
  };

  // Generate avatar using easel-avatar API
  const generateAvatar = async () => {
    setProcessing(true);
    setProcessingStep(1);
    setError(null);
    setLogs([]);
    setElapsedTime(0);
    setLoadingProgress(0);
    
    const start = Date.now();
    
    // Simuler le progress pendant que l'IA travaille
    const progressInterval = setInterval(() => {
      setElapsedTime(Date.now() - start);
      const elapsed = Date.now() - start;
      const maxTime = (settings?.max_processing_time || 60) * 1000;
      const progress = Math.min(95, (elapsed / maxTime) * 100); // Max 95% jusqu'à la fin
      setLoadingProgress(progress);
    }, 100);
    
    try {
      // Get the selected style and gender from localStorage or state
      const gender = styleGender || "male";
      const prompt = stylePrompt || "at the Met Gala, dressed in very fancy outfits, captured in a full body shot";
      
      // Add initial log
      setLogs([`Initializing avatar generation with gender: ${gender}...`]);
      
      // Log input parameters for debugging
      console.log('easel-avatar input:', {
        face_image_0: imageFile ? 'base64_image...' : null,
        gender_0: gender,
        prompt: prompt,
      });
      
      setLogs(prev => [...prev, "Preparing your image for avatar generation..."]);
      
      // Call the easel-avatar API
      const result = await fal.subscribe(
        "easel-ai/easel-avatar",
        {
          input: {
            face_image_0: imageFile,
            gender_0: gender,
            prompt: prompt
          },
          pollInterval: 5000, // Poll every 5 seconds
          logs: true,
          onQueueUpdate: (update) => {
            setElapsedTime(Date.now() - start);
            if (update.status === 'IN_PROGRESS' || update.status === 'COMPLETED') {
              const newLogs = (update.logs || []).map((log) => log.message);
              setLogs(prevLogs => {
                const uniqueLogs = [...prevLogs];
                newLogs.forEach(log => {
                  if (!uniqueLogs.includes(log)) {
                    uniqueLogs.push(log);
                  }
                });
                return uniqueLogs;
              });
            }
          },
        }
      );
      
      setProcessingStep(2); // Avatar generated
      
      console.log(result.data);
      console.log(result.requestId);
      
      // Store metadata for debugging
      const generationMetadata = {
        requestTime: new Date().toISOString(),
        processingTime: Date.now() - start,
        modelUsed: 'easel-ai/easel-avatar',
        parameters: {
          gender: gender,
          prompt: prompt,
        },
        projectId: project?.id,
        styleId: localStorage.getItem('selectedStyleId'),
        requestId: result.requestId
      };
      
      // Get the avatar image URL from the result
      // For easel-avatar, images are in the images array property
      const resultImageUrl = result.image_urls?.[0] || result.data?.image_urls?.[0];
      
      if (!resultImageUrl) {
        throw new Error("Avatar image URL not found in response");
      }
      
      // Store results in localStorage
      localStorage.setItem("avatarGenerationMetadata", JSON.stringify(generationMetadata));
      localStorage.setItem("avatarImageUrl", resultImageUrl);
      
      // Convert to base64 and store
      try {
        const dataUrl = await toDataURL(resultImageUrl);
        localStorage.setItem("avatarBase64", dataUrl);
      } catch (conversionError) {
        console.error("Error converting avatar to base64:", conversionError);
        // Continue anyway, we have the image URL
      }
      
      // 1. Log session to database
      let sessionId = null;
      try {
        const { data: sessionData, error: sessionError } = await supabase.from('sessions').insert({
          user_email: null, // Anonymous user
          style_id: localStorage.getItem('selectedStyleId'),
          prompt: prompt,
          result_image_url: resultImageUrl,
          processing_time_ms: Date.now() - start,
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
            prompt: prompt,
            gender: gender,
            processingTime: Date.now() - start,
            model: 'easel-ai/easel-avatar',
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
      
      // Finaliser le progress
      clearInterval(progressInterval);
      setLoadingProgress(100);
      
      // Redirect to results page after a short delay
      setTimeout(() => {
        router.push(`/photobooth-avatar/${slug}/result`);
      }, 1000);
      
    } catch (error) {
      console.error("Error generating avatar:", error);
      setError(error.message || "Une erreur est survenue");
      
      // Nettoyer l'interval en cas d'erreur
      clearInterval(progressInterval);
      
      // Log failed attempt
      try {
        await supabase.from('sessions').insert({
          user_email: null,
          style_id: localStorage.getItem('selectedStyleId'),
          prompt: stylePrompt || "Default prompt",
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
                    Création de votre avatar...
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
                    
                    <div className="flex justify-between text-xs text-white/60">
                      <span>{Math.round(loadingProgress)}%</span>
                      <span>ETA: {Math.max(0, Math.round(((settings?.max_processing_time || 60) * 1000 - elapsedTime) / 1000))}s</span>
                    </div>
                  </motion.div>

                  {/* Zone de logs avec style moderne */}
                  <motion.div 
                    className="mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1, duration: 0.6 }}
                  >
                    <div 
                      className="h-24 overflow-y-auto text-sm text-left p-3 rounded-xl"
                      style={{ 
                        background: 'rgba(0,0,0,0.3)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                      }}
                    >
                      {logs.length > 0 ? (
                        logs.map((log, index) => (
                          <motion.div 
                            key={index}
                            className="text-white/80 leading-relaxed mb-1"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <span className="text-green-400 mr-2">•</span>
                            {log}
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-white/60 italic">Initialisation du processus...</div>
                      )}
                    </div>
                  </motion.div>
                  
                  {/* Bouton d'annulation modernisé */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3, duration: 0.6 }}
                  >
                    <Link 
                      href={`/photobooth-avatar/${slug}`}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105"
                      style={{ 
                        background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`,
                        color: 'white',
                        boxShadow: `0 4px 15px ${secondaryColor}30, inset 0 1px 0 rgba(255,255,255,0.2)`
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      Annuler
                    </Link>
                  </motion.div>

                  {/* Gestion des erreurs */}
                  {error && (
                    <motion.div 
                      className="mt-4 p-4 rounded-xl border"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        color: '#fecaca'
                      }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <span className="font-medium">Erreur</span>
                      </div>
                      <p className="text-sm">{error}</p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`w-full max-w-2xl mx-auto mt-[20vh] ${processing ? 'opacity-20' : ''}`}>
        <h2 
          className="text-xl font-bold text-center mb-6"
          style={{ color: secondaryColor }}
        >
          {enabled ? 'Vérifiez votre photo' : 'Prenez une photo de votre visage'}
        </h2>
        
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
          
          {/* ✅ BOUTON SWITCH CAMERA - SEULEMENT SUR IPAD */}
          {isIPadDevice && !enabled && (
            <motion.button
              onClick={switchCamera}
              disabled={switchingCamera}
              className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
              style={{ 
                backgroundColor: switchingCamera ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.6)',
                cursor: switchingCamera ? 'default' : 'pointer'
              }}
              whileTap={{ scale: switchingCamera ? 1 : 0.9 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              {switchingCamera ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 4H16.83L15 2H9L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 18H4V6H8.05L9.88 4H14.12L15.95 6H20V18Z" fill="white"/>
                  <path d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12C17 9.24 14.76 7 12 7ZM12 15C10.34 15 9 13.66 9 12C9 10.34 10.34 9 12 9C13.66 9 15 10.34 15 12C15 13.66 13.66 15 12 15Z" fill="white"/>
                  <path d="M15 2L12 5L15 8V6H18V4H15V2Z" fill="white"/>
                </svg>
              )}
            </motion.button>
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
                onClick={generateAvatar}
                className="px-8 py-3 rounded-lg font-bold"
                style={{ backgroundColor: secondaryColor, color: primaryColor }}
              >
                CRÉER MON AVATAR
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
