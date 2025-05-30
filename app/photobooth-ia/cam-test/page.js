'use client';

import { useState, useEffect, useRef } from 'react';
import Image from "next/image";
import { useRouter } from 'next/navigation';

export default function CamTest() {
  const router = useRouter();
  const videoRef = useRef(null);
  const previewRef = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Webcam setup
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(err => console.error('Error accessing camera:', err));
    }
  }, []);
  
  const captureImage = () => {
    setCaptured(true);
    setTimeout(() => {
      setEnabled(true);
      setCaptured(false);
      
      const canvas = previewRef.current;
      const video = videoRef.current;
      
      if (!canvas || !video) return;
      
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImageFile(dataUrl);
      localStorage.setItem('faceImage', dataUrl);
    }, 3000);
  };
  
  const retake = () => setEnabled(false);
  
  const simulateGeneration = () => {
    setLoading(true);
    const startTime = Date.now();
    
    // Log timer
    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
      setLogs(prev => [...prev, `Processing... ${((Date.now() - startTime)/1000).toFixed(1)}s`]);
    }, 1000);
    
    // Get style image from localStorage
    const styleFix = localStorage.getItem('styleFix');
    
    // After 5 seconds, simulate a successful generation
    setTimeout(() => {
      clearInterval(timer);
      
      // Use the style image as the "result" for testing
      localStorage.setItem('faceURLResult', styleFix);
      localStorage.setItem('resulAIBase64', styleFix);
      
      // Save test metadata
      localStorage.setItem('falGenerationMetadata', JSON.stringify({
        requestTime: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        modelUsed: 'test-mode/no-api-call',
        status: 'SUCCESS'
      }));
      
      // Redirect to result page
      router.push('/photobooth-ia/result');
    }, 5000);
  };
  
  return (
    <main className="flex fixed h-full w-full bg-gray-900 overflow-auto flex-col items-center justify-center pt-2 pb-5 px-5">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Test Mode - No API Call</h1>
        
        {loading ? (
          <div className="text-center">
            <div className="mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto"></div>
            </div>
            <p className="text-white">Processing... {(elapsedTime / 1000).toFixed(1)}s</p>
            <pre className="mt-4 bg-gray-800 p-4 rounded text-green-400 text-left max-h-40 overflow-y-auto">
              {logs.join('\n')}
            </pre>
          </div>
        ) : (
          <>
            <div className="relative aspect-square w-full bg-black rounded-lg overflow-hidden mb-4">
              {!enabled ? (
                <video 
                  ref={videoRef} 
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                />
              ) : (
                <canvas 
                  ref={previewRef} 
                  width={512} 
                  height={512} 
                  className="w-full h-full"
                />
              )}
              
              {captured && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-5xl text-white font-bold animate-bounce">3...2...1</div>
                </div>
              )}
            </div>
            
            {!enabled ? (
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded"
                onClick={captureImage}
              >
                CAPTURE
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded"
                  onClick={simulateGeneration}
                >
                  GENERATE (Simulate)
                </button>
                <button
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                  onClick={retake}
                >
                  RETAKE
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
