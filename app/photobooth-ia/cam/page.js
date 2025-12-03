'use client';

import * as fal from '@fal-ai/serverless-client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import TopLogoGG from '../../components/TopLogoGG';
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// @snippet:start(client.config)
fal.config({
    // credentials: 'FAL_KEY_ID:FAL_KEY_SECRET',
    requestMiddleware: fal.withProxy({
      targetUrl: '/api/fal/proxy', // the built-int nextjs proxy
      // targetUrl: 'http://localhost:3333/api/fal/proxy', // or your own external proxy
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


let streamCam = null;
const useWebcam = ({
    videoRef
  }) => {
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

let FACE_URL_RESULT = ''
let FACE_URL_RESULT2 = ''
let FACE_URL_RESULT3 = ''
export default function Cam() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [enabled, setEnabled] = useState(false);
    const [captured, setCaptured] = useState(false);
    // const [countDown, setCoundown] = useState(5);
    // const [counter, setCounter] = useState(60);
    // const waktuBatasTake = useRef(null);
    const videoRef = useRef(null);
    const previewRef = useRef(null);
    
    // State pour stocker les dimensions de l'orientation
    const [orientationData, setOrientationData] = useState(null);

    // Charger les données d'orientation
    useEffect(() => {
        const fetchOrientation = async () => {
            // Essayer de récupérer l'ID du projet depuis le localStorage
            // car cette page n'a pas de slug dans l'URL
            const projectId = typeof localStorage !== 'undefined' ? localStorage.getItem('currentProjectId') : null;
            
            if (!projectId) return;
            
            try {
                // 1. Récupérer le layout actif pour ce projet
                const { data: layoutData, error: layoutError } = await supabase
                .from('canvas_layouts')
                .select('orientation_id')
                .eq('project_id', projectId)
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
    }, [supabase]);

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

    useWebcam({ videoRef,previewRef});

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
            videoRef.current.play();
            
            // Mettre à jour l'état de la caméra
            setCurrentCameraFacing(newFacing);
          }
          
          console.log(`✅ Basculement terminé vers caméra ${newFacing}`);
        } else {
          throw new Error(`Impossible de basculer vers la caméra ${newFacing}`);
        }
        
      } catch (error) {
        console.error("❌ Erreur lors du basculement de caméra:", error);
        
        // En cas d'erreur, réessayer avec n'importe quelle caméra disponible
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
          
          streamCam = fallbackStream;
          window.localStream = fallbackStream;
          
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.play();
          }
          
          console.log("🔄 Fallback: Retour à une caméra par défaut");
        } catch (fallbackError) {
          console.error("❌ Erreur fallback:", fallbackError);
        }
        
      } finally {
        setSwitchingCamera(false);
      }
    };

    const captureVideo  = () => {
        setCaptured(true)
        setTimeout(() => {
            setEnabled(true)
            setCaptured(null)
            const canvas = previewRef.current;
            const video = videoRef.current;
            video.play;
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
            if (context === null) {
                return;
            }
            
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
        
            // Draw the image on the canvas (cropped and resized)
            context.drawImage(
                video,
                sx, sy, sWidth, sHeight, // Source (crop)
                0, 0, targetWidth, targetHeight // Destination (full canvas)
            );
    
            let faceImage = canvas.toDataURL();
            setImageFile(faceImage)
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem("faceImage", faceImage)
            }
            // setTimeout(() => {
            //     router.push('/generate');
            // }, 1250);
        }, 3000);
    }

    const retake = () => {
        setEnabled(false)
    }


    // AI
    const [imageFile, setImageFile] = useState(null);
    const [imageFile2, setImageFile2] = useState(null);
    const [imageFile3, setImageFile3] = useState(null);
    const [styleFix, setStyleFix] = useState(null);
    const [styleFix2, setStyleFix2] = useState(null);
    const [styleFix3, setStyleFix3] = useState(null);
    const [formasiFix, setFormasiFix] = useState(null);
    const [numProses, setNumProses] = useState(0);
    const [numProses1, setNumProses1] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [resultFaceSwap, setResultFaceSwap] = useState(null);
    const [resultFaceSwap2, setResultFaceSwap2] = useState(null);
    const [resultFaceSwap3, setResultFaceSwap3] = useState(null);
    const [logs, setLogs] = useState([]);
    const [elapsedTime, setElapsedTime] = useState(0);
    // @snippet:end
    useEffect(() => {
        // Perform localStorage action
        if (typeof localStorage !== 'undefined') {
            const item1 = localStorage.getItem('styleFix')
            // const item2 = localStorage.getItem('styleFix2')
            // const item3 = localStorage.getItem('styleFix3')
            // const item4 = localStorage.getItem('formasiFix')
            setStyleFix(item1)
            // setStyleFix2(item2)
            // setStyleFix3(item3)
            // setFormasiFix(item4)
        }
    }, [styleFix, styleFix2, styleFix3])

    const generateAI = () => {
        setNumProses1(true)
        generateImageSwap()

        // videoRef.current.stop();
        // videoRef.current.srcObject = ''
        // streamCam.getVideoTracks()[0].stop();
        // console.log(streamCam)

        
        // localStream.getVideoTracks()[0].stop();
        // console.log(streamCam)
        // console.log(videoRef)
        // videoRef.src=''
        // STOP CAM
        // streamCam.getTracks().forEach(function(track) {
        //     track.stop();
        // });
    }

    const reset2 = () => {
      setLoading(false);
      setError(null);
      setElapsedTime(0);
    };
    const toDataURL = url => fetch(url)
    .then(response => response.blob())
    .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    }))

    const generateImageSwap = async () => {
        setNumProses(2)
        reset2();
        setLoading(true);
        const start = Date.now();
        
        // Déterminer le genre en fonction du styleFix (basé sur votre logique existante)
        // Extraire le genre à partir de l'URL de l'image ou du localStorage
        let gender = "";
        const styleGenderFix = localStorage.getItem('styleGenderFix');
        if (styleGenderFix === 'f' || styleGenderFix === 'af') {
            gender = "female";
        } else if (styleGenderFix === 'm' || styleGenderFix === 'ag') {
            gender = "male";
        }
        
        try {
            // Log pour débogage des variables d'entrée
            console.log('Face swap input:', {
                face_image_0: imageFile,
                gender_0: gender,
                target_image: styleFix,
                workflow_type: "user_hair" // Utiliser le mode qui préserve les cheveux de l'utilisateur
            });
            
            const result = await fal.subscribe(
                'easel-ai/advanced-face-swap',
                {
                    input: {
                        face_image_0: imageFile,    // Image utilisateur (visage capturé)
                        gender_0: gender,           // Genre détecté ou spécifié par l'utilisateur
                        target_image: styleFix,     // Image de référence (mannequin)
                        workflow_type: "target_hair"  // Conserver les cheveux de l'utilisateur
                    },
                    pollInterval: 5000,
                    logs: true,
                    onQueueUpdate: (update) => {
                        setElapsedTime(Date.now() - start);
                        if (
                            update.status === 'IN_PROGRESS' ||
                            update.status === 'COMPLETED'
                        ) {
                            setLogs((update.logs || []).map((log) => log.message));
                        }
                    },
                }
            );
            
            setResultFaceSwap(result);
            
            // Stocker les métadonnées de génération pour le débogage
            const generationMetadata = {
                requestTime: new Date().toISOString(),
                processingTime: Date.now() - start,
                modelUsed: 'easel-ai/advanced-face-swap',
                parameters: {
                    face_image_0: imageFile ? imageFile.substring(0, 100) + '...' : null,
                    gender_0: gender,
                    target_image: styleFix ? styleFix.substring(0, 100) + '...' : null,
                    workflow_type: "user_hair"
                }
            };
            
            // La propriété où l'URL résultante est stockée peut différer dans la nouvelle API
            // Vérifiez result.image.url, result.data.url, ou result.data.image_url selon la structure retournée
            FACE_URL_RESULT = result.image?.url || result.data?.url || result.data?.image_url;
            
            if (!FACE_URL_RESULT) {
                console.error("URL d'image non trouvée dans la réponse:", result);
                throw new Error("URL d'image non trouvée dans la réponse");
            }
            
            // Stocker les métadonnées dans localStorage pour débogage
            localStorage.setItem("falGenerationMetadata", JSON.stringify(generationMetadata));
            
            toDataURL(FACE_URL_RESULT)
            .then(dataUrl => {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem("resulAIBase64", dataUrl)
                    localStorage.setItem("faceURLResult", FACE_URL_RESULT)
                }
                // Augmenter le délai avant redirection pour s'assurer que localStorage est bien mis à jour
                setTimeout(() => {
                    router.push('/photobooth-ia/result');
                }, 1000); // Augmentation de 500ms à 1000ms
            })
            .catch(error => {
                console.error("Erreur lors de la conversion de l'image en base64:", error);
                // Malgré l'erreur, rediriger avec l'URL directe
                localStorage.setItem("faceURLResult", FACE_URL_RESULT);
                setTimeout(() => {
                    router.push('/photobooth-ia/result');
                }, 1000);
            });
        } catch (error) {
            console.error("Erreur lors de la génération de l'image:", error);
            setError(error);
        } finally {
            setLoading(false);
            setElapsedTime(Date.now() - start);
        }
    };

    return (
        <main className="flex fixed h-full w-full bg-tautaufest overflow-auto flex-col items-center justify-center pt-2 pb-5 px-5 lg:pt-12 lg:px-20">
            <div className={`fixed top-10 w-[100%] mx-auto flex justify-center items-center z-50`}>
            {/* <TopLogoGG></TopLogoGG> */}
            </div>
            <div className={`relative top-0 w-[70%] mx-auto  mb-10 ${numProses1 ? `opacity-0 pointer-events-none` : ''}`}>
            <Image src='/photobooth-ia/title-take.png' width={916} height={336} alt='Leeveo' className='w-full' priority />
            </div>
            {/* LOADING */}
            {numProses1 && 
                <div className='absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center flex-col z-20'>
                    {/* <div className='relative w-[250px] h-[78px] lg:w-[555px] lg:h-[180px] overflow-hidden'>
                        <div className='animate-loading1 absolute left-0 top-0 w-full mx-auto flex justify-center items-center pointer-events-none'>
                            <Image src='/loading.png' width={770} height={714} alt='Leeveo' className='w-full' priority />
                        </div>
                    </div> */}

                    <div className="relative w-[70%] mx-auto mb-5">
                        <Image src='/photobooth-ia/logo.png' width={607} height={168} alt='Leeveo' className='w-full' priority />
                    </div>
                    <div className='animate-upDownCepet relative py-2 px-4 mt-5 lg:mt-10 lg:p-5 lg:text-4xl border-2 border-[#E5E40A] text-center bg-[#811A53] text-[#E5E40A] lg:font-bold rounded-lg'>
                        <p>{`Merci de patienter, En cours de chargement...`}</p>
                        <p>{`Processus de création : ${(elapsedTime / 1000).toFixed(2)} secondes (${numProses} sur 2)`}</p>
                        {error && <p>{error.message}</p>}
                    </div>

                    <pre className='relative py-2 px-4 mt-5 lg:mt-10 border-2 border-[#E5E40A] text-left bg-[#811A53] text-[#E5E40A] text-xs lg:text-sm overflow-auto no-scrollbar h-[100px] w-[80%] mx-auto rounded-lg'>
                        <code>
                        {logs.filter(Boolean).join('\n')}
                        </code>
                        Génération IA de votre visage ... <br></br>
                        Chargement du modèle d&apos;intelligence artificielle ...<br></br>
                        Fusion en attente ...<br></br>
                    </pre>
                    <button 
                        className="relative w-full mx-auto flex justify-center items-center mt-3 bg-yellow-500 text-black text-4xl font-bold py-2 px-4 rounded" 
                        onClick={() => router.push('/photobooth-ia')} 
                        style={{ width: '200px', height: '54px' }}
                    >
                        RETOUR
                    </button>
                </div>
            }
            {/* LOADING */}
            <div className={`relative w-full flex flex-col justify-center items-center mt-0 mb-10 ${numProses1 ? 'opacity-0 pointer-events-none' : ''}`}>
                <div className='relative lg:w-full'>
                    {/* {!enabled && 
                    <div className='absolute top-0 left-0 right-0 bottom-0 w-[50%] mx-auto flex justify-center items-center pointer-events-none z-10'>
                        <Image src='/icon-capture.png' width={389} height={220} alt='Leeveo' className='w-full' priority />
                    </div>
                    } */}

                    {captured && 
                    <div className='absolute top-0 left-0 right-0 bottom-0 w-[100px] h-[100px] lg:w-[174px] lg:h-[174px] overflow-hidden m-auto flex justify-center items-center pointer-events-none z-10'>
                        <div className='w-full animate-countdown translate-y-[35%]'>
                            <Image src='/countdown.png' width={174} height={522} alt='Leeveo' className='w-full' priority />
                        </div>
                    </div>
                    }

                    {!enabled && 
                    <div className='w-[55%] mx-auto absolute left-0 right-0 bottom-0 z-10'>
                        {/* <Image src='/frame-pose.png' width={426} height={461} alt='Leeveo' className='w-full' priority /> */}
                    </div>
                    }

                    <video ref={videoRef} className={`w-full mx-auto border-2 border-[#ffffff] rounded-sm ${enabled ? 'absolute opacity-0':'relative'}`} playsInline height={512}></video>
                    <canvas ref={previewRef} width="512" height="512" className={`${enabled ? 'relative':'absolute opacity-0'} w-[80%] top-0 left-0 right-0 mx-auto pointer-events-nones border-2 border-[#ffffff] rounded-sm`}></canvas>
                </div>
            </div>


            {!enabled && 
                                   <p className='block text-center text-4xl mt-0 mb-10 text-white' style={{ backgroundColor: '#f0e626', padding: '0 20px' }}>C&apos;est vous le mannequin ! </p>
            }
            
            {/* Camera switch button - only for iPad/tablets with multiple cameras */}
            {!enabled && isIPadDevice && (deviceType === 'tablet' || deviceType === 'mobile') && (
              <div className="relative w-full flex justify-center items-center mb-4">
                <button
                  onClick={switchCamera}
                  className="px-6 py-3 rounded-lg font-medium text-sm backdrop-blur-md border border-white/30 flex items-center gap-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
                >
                  {/* Icône de changement de caméra */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-current">
                    <path
                      d="M2 6C2 4.89543 2.89543 4 4 4H7L9 2H15L17 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                    <path
                      d="M16 8L18 6M8 8L6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  <span className="font-bold">
                    {currentCameraFacing === "user" ? "🔄 CAMÉRA ARRIÈRE" : "🔄 CAMÉRA FRONTALE"}
                  </span>
                  
                  {/* Icône de rotation */}
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className="text-current"
                  >
                    <path
                      d="M1 4V10H7M23 20V14H17M20.49 9A9 9 0 0 0 5.64 5.64L1 10M22.99 14A9 9 0 0 1 18.36 18.36L23 14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}
            
            {!enabled && 
                <div className="relative w-full flex justify-center items-center">
                    <button className="relative mx-auto flex  w-[80%] justify-center items-center" onClick={captureVideo}>
                        <Image src='/photobooth-ia/btn-capture.png' width={505} height={136} alt='Leeveo' className='w-full' priority />
                    </button>
                </div>
            }
            <div className={`relative w-full ${numProses1 ? 'opacity-0 pointer-events-none' : ''}`}>
            <div className={`relative w-full ${!enabled ? 'hidden' : ''}`}>
                <div className="relative w-[75%] mx-auto flex justify-center items-center flex-col mt-0">
                    <button className="w-full relative mx-auto flex justify-center items-center" onClick={generateAI}>
                        <Image src='/photobooth-ia/btn-next.png' width={505} height={136} alt='Leeveo' className='w-full' priority />
                    </button>
                    <button className="relative w-full mx-auto flex justify-center items-center mt-3" onClick={retake}>
                        <Image src='/photobooth-ia/btn-retake.png' width={505} height={136} alt='Leeveo' className='w-full' priority />
                    </button>
                </div>
            </div></div>
        </main>
    );
}
