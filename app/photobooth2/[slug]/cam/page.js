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
  const [styleFix, setStyleFix] = useState(null);
  const [styleGender, setStyleGender] = useState(null);
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
    const storedImageUrl = localStorage.getItem('styleFix');
    const storedGender = localStorage.getItem('styleGenderFix');
    
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
    
    if (storedGender) {
      setStyleGender(storedGender);
    }
    
    // Always fetch fresh data
    fetchProjectData();
  }, []);
  
  // First, ensure fetchProjectData is wrapped in useCallback with proper dependencies
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
    // Ne pas modifier le contenu de cet useEffect
    fetchProjectData();
  }, [fetchProjectData]); // Add fetchProjectData to dependencies
  
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
  
  // Generate image using new fal.ai hidream model
  const generateImage = async () => {
    setProcessing(true);
    setProcessingStep(1);
    setError(null);
    setLogs([]);
    setElapsedTime(0);
    
    const start = Date.now();
    
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
        image_url: imageFile ? 'base64_image...' : null,
      });
      
      // Call the new fal.ai hidream API with additional parameters
      const result = await fal.subscribe(
        'fal-ai/hidream-i1-full/image-to-image',
        {
          input: {
            prompt: defaultPrompt,
            image_url: imageFile,  // Using the captured photo as image_url
            negative_prompt: "poor quality, extra hand, extra finger, blur, bluriness",   // Added parameter
            num_inference_steps: 50, // Added parameter
            guidance_scale: 16,     // Added parameter
            num_images: 1,         // Added parameter
            enable_safety_checker: true, // Added parameter
            output_format: "jpeg", // Added parameter
            strength: 0.29         // Added parameter
          },
          pollInterval: 5000, // Poll every 5 seconds
          logs: true,
          onQueueUpdate: (update) => {
            setElapsedTime(Date.now() - start);
            if (update.status === 'IN_PROGRESS' || update.status === 'COMPLETED') {
              setLogs((update.logs || []).map((log) => log.message));
            }
          },
        }
      );
      
      setProcessingStep(2); // Image generated
      
      console.log(result.data);
      console.log(result.requestId);
      
      // Store metadata for debugging
      const generationMetadata = {
        requestTime: new Date().toISOString(),
        processingTime: Date.now() - start,
        modelUsed: 'fal-ai/hidream-i1-full/image-to-image',
        parameters: {
          prompt: defaultPrompt,
          image_url: '[BASE64_IMAGE]',
          num_inference_steps: 50,
          guidance_scale: 2,
          strength: 0.75
          // Add other parameters as needed
        },
        projectId: project?.id,
        styleId: localStorage.getItem('selectedStyleId'),
        requestId: result.requestId
      };
      
      // Get the image URL from the result object
      // The hidream model returns images in a different format
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
            prompt: defaultPrompt,
            processingTime: Date.now() - start,
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
      setError(error.message || "Une erreur est survenue");
      
      // Log failed attempt
      try {
        await supabase.from('sessions').insert({
          user_email: null,
          style_id: localStorage.getItem('selectedStyleId'),
          prompt: defaultPrompt || "A beautiful portrait in professional lighting",
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
  
  const handleCaptureAndSave = useCallback(async (imageData) => {
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
  }, [router, slug]);
  
  // Remove unnecessary dependencies from the useCallback
  const handleGetSelectedDevice = useCallback(() => {
    const video = videoRef.current;
    if (!video) return null;
    
    const stream = video.srcObject;
    if (!stream) return null;
    
    const tracks = stream.getTracks();
    if (tracks.length === 0) return null;
    
    // Return the first video device found
    return tracks[0].getSettings().deviceId;
  }, []); // Remove router and slug if not used
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loader"></div>
      </div>
    );
  }
  
  if (!project || !settings) {
    return <div>Project not found</div>;
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <div className="flex flex-col items-center w-full max-w-4xl p-4 mx-auto bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          {project.name}
        </h1>
        
        <div className="flex flex-col items-center w-full mt-4">
          <div className="relative w-full max-w-md aspect-video">
            <video
              ref={videoRef}
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={previewRef}
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              style={{ display: enabled ? 'block' : 'none' }}
            />
          </div>
          
          <div className="flex items-center justify-center w-full mt-4 space-x-4">
            <button
              onClick={captureVideo}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700"
            >
              {captured ? 'Capturing...' : 'Capture'}
            </button>
            
            {enabled && (
              <button
                onClick={retake}
                className="px-4 py-2 text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700"
              >
                Retake
              </button>
            )}
          </div>
        </div>
        
        {error && (
          <div className="mt-4 text-red-600">
            {error}
          </div>
        )}
        
        {imageFile && (
          <div className="flex flex-col items-center w-full mt-4">
            <Image
              src={imageFile}
              alt="Captured Image"
              className="w-full max-w-md rounded-lg"
              width={512}
              height={512}
            />
            
            <button
              onClick={generateImage}
              className="px-4 py-2 mt-4 text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700"
            >
              {processing ? 'Processing...' : 'Generate Image'}
            </button>
          </div>
        )}
        
        <div className="flex flex-col items-center w-full mt-4">
          <Link
            href={`/photobooth2/${slug}/gallery`}
            className="text-sm text-blue-600 hover:underline"
          >
            View Gallery
          </Link>
        </div>
      </div>
    </div>
  );
}