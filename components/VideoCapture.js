import React, { useRef, useState, useEffect } from 'react';

const VideoCapture = () => {
  const videoRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [processedVideoUrl, setProcessedVideoUrl] = useState('');

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };

    initCamera();

    return () => {
      // Cleanup function to stop video stream
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = () => {
    setIsRecording(true);
    // ...existing code for starting recording...
  };

  const stopRecording = () => {
    setIsRecording(false);
    // ...existing code for stopping recording...
  };

  const applyBackground = async () => {
    try {
      const response = await fetch('/api/applyBackground', {
        method: 'POST',
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Background processing failed:', data.error);
        // Handle error
      } else {
        console.log('Background processing completed (simplified)');
        // Update UI as needed
        // For example, if you were displaying the processed video:
        setProcessedVideoUrl(data.outputPath);
      }
    } catch (error) {
      console.error('Error in background processing:', error);
      // Handle error
    }
  };

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline />
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      <button onClick={applyBackground}>Apply Background</button>
      {processedVideoUrl && (
        <div>
          <h3>Processed Video:</h3>
          <video src={processedVideoUrl} controls />
        </div>
      )}
    </div>
  );
};

export default VideoCapture;