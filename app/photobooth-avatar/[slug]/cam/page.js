'use client';

import * as fal from '@fal-ai/serverless-client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';

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
      navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        streamCam = stream;
        window.localStream = stream;
        if (videoRef.current !== null) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }).catch(err => {
        console.error("Error accessing camera:", err);
      });
    }
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
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Initialize webcam
  useWebcam({ videoRef, previewRef });
  
  useEffect(() => {
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
  
  // Generate avatar using easel-avatar API
  const generateAvatar = async () => {
    setProcessing(true);
    setProcessingStep(1);
    setError(null);
    setLogs([]);
    setElapsedTime(0);
    
    const start = Date.now();
    
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
      
      // Redirect to results page after a short delay
      setTimeout(() => {
        router.push(`/photobooth-avatar/${slug}/result`);
      }, 1000);
      
    } catch (error) {
      console.error("Error generating avatar:", error);
      setError(error.message || "Une erreur est survenue");
      
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

      {/* Processing Overlay */}
      {processing && (
        <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center flex-col z-20">
          <div 
            className="py-4 px-6 rounded-lg text-center"
            style={{ backgroundColor: primaryColor, border: `2px solid ${secondaryColor}` }}
          >
            <h2 className="text-xl mb-2" style={{ color: secondaryColor }}>
              Création de votre avatar...
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
              href={`/photobooth-avatar/${slug}`}
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
