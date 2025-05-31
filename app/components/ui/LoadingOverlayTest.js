'use client';

import { useState } from 'react';
import LoadingOverlay from './LoadingOverlay';

export default function LoadingOverlayTest() {
  const [isVisible, setIsVisible] = useState(false);
  const [useCustomProgress, setUseCustomProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  
  const startLoading = () => {
    setIsVisible(true);
    setLogs([]);
    
    if (useCustomProgress) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 100) {
            clearInterval(interval);
            setTimeout(() => setIsVisible(false), 1000);
            return 100;
          }
          return newProgress;
        });
        
        // Add some fake logs
        if (progress < 30) {
          setLogs(prev => [...prev, 'Initializing process...']);
        } else if (progress < 60) {
          setLogs(prev => [...prev, 'Processing image data...']);
        } else if (progress < 90) {
          setLogs(prev => [...prev, 'Finalizing transformation...']);
        } else {
          setLogs(prev => [...prev, 'Completed!']);
        }
      }, 500);
    } else {
      // Use the automatic progress and close after 5 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    }
  };
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Loading Overlay Test</h2>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <input 
            type="checkbox" 
            id="useCustomProgress" 
            checked={useCustomProgress}
            onChange={() => setUseCustomProgress(!useCustomProgress)}
          />
          <label htmlFor="useCustomProgress">Use custom progress</label>
        </div>
        
        <button 
          onClick={startLoading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Show Loading Overlay
        </button>
      </div>
      
      <LoadingOverlay 
        isVisible={isVisible}
        title="Test Loading"
        message="This is a test of the loading overlay component"
        progress={useCustomProgress ? progress : undefined}
        logs={logs}
        onCancel={() => setIsVisible(false)}
      />
    </div>
  );
}
