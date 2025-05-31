'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Array of French messages describing the image generation process
const generationMessages = [
  "Préparation de votre image...",
  "Analyse de votre portrait...",
  "Détection des caractéristiques faciales...",
  "Application du style artistique...",
  "Génération de la transformation...",
  "Ajustement des détails...",
  "Finalisation du rendu...",
  "Optimisation de l'image...",
  "Presque terminé, patience..."
];

export default function LoadingOverlay({ 
  isVisible = false, 
  title = "Traitement en cours...",
  message = "Préparation de votre image...",
  progress = undefined,
  logs = [],
  primaryColor = '#6366F1',
  secondaryColor = '#8B5CF6',
  onCancel = null,
  showBackdrop = true,
  rotatingMessages = true,
  project = null // Accept project object to extract colors
}) {
  // If project is provided, use its colors instead of the defaults
  const finalPrimaryColor = project?.primary_color || primaryColor;
  const finalSecondaryColor = project?.secondary_color || secondaryColor;
  
  const [internalProgress, setInternalProgress] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayMessage, setDisplayMessage] = useState(message);
  
  // Handle rotating messages
  useEffect(() => {
    if (!isVisible || !rotatingMessages) {
      return;
    }
    
    // Reset message index when overlay becomes visible
    setCurrentMessageIndex(0);
    
    // Set up an interval to rotate through messages
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex(prevIndex => {
        const newIndex = (prevIndex + 1) % generationMessages.length;
        return newIndex;
      });
    }, 3000); // Change message every 3 seconds
    
    return () => clearInterval(messageInterval);
  }, [isVisible, rotatingMessages]);
  
  // Update displayed message when index changes
  useEffect(() => {
    if (rotatingMessages) {
      setDisplayMessage(generationMessages[currentMessageIndex]);
    } else {
      setDisplayMessage(message);
    }
  }, [currentMessageIndex, message, rotatingMessages]);
  
  // Increase the progress bar for visual effect when no external progress is provided
  useEffect(() => {
    if (!isVisible) {
      // Reset internal progress when loader becomes invisible
      setInternalProgress(0);
      return;
    }
    
    let interval = null;
    
    // If external progress is provided, don't use the internal progress animation
    if (progress === undefined) {
      // Simulate progress with irregular increments to feel more natural
      interval = setInterval(() => {
        setInternalProgress(prev => {
          // Progress gets slower near the end to give backend time to process
          if (prev < 30) return Math.min(30, prev + 2);
          if (prev < 60) return Math.min(60, prev + 1.5);
          if (prev < 85) return Math.min(85, prev + 0.8);
          if (prev < 95) return Math.min(95, prev + 0.2);
          return prev;
        });
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isVisible, progress]);

  // Determine which progress to use (external or internal)
  const progressToShow = progress !== undefined ? progress : internalProgress;

  // Important: Only render the component when isVisible is true
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: showBackdrop ? 'blur(8px)' : 'none' }}
    >
      {showBackdrop && <div className="absolute inset-0 bg-black/70"></div>}
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
        className="relative z-10 p-8 rounded-xl border border-white/10 shadow-2xl max-w-md w-full mx-4 backdrop-blur-md"
        style={{ 
          background: `linear-gradient(135deg, ${finalPrimaryColor}20, ${finalSecondaryColor}30)`,
          boxShadow: `0 20px 60px -10px ${finalPrimaryColor}40, 0 10px 20px -5px ${finalSecondaryColor}30`,
          borderLeft: `4px solid ${finalPrimaryColor}`,
          borderRight: `4px solid ${finalSecondaryColor}`
        }}
      >
        {/* Photo Processing Visual Elements */}
        <div className="flex justify-center mb-6 relative">
          {/* Camera shutter animation */}
          <motion.div 
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(from 0deg, ${finalPrimaryColor}, ${finalSecondaryColor}, ${finalPrimaryColor})`,
              boxShadow: '0 0 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.8)'
            }}
          >
            {/* Animated shutter blades */}
            <motion.div 
              className="absolute w-full h-full"
              animate={{ 
                scale: [0.8, 1, 0.8],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              {[...Array(6)].map((_, i) => (
                <motion.div 
                  key={i}
                  className="absolute top-1/2 left-1/2 w-1/2 h-5 bg-black/80"
                  style={{ 
                    transformOrigin: 'left center',
                    rotate: `${i * 60}deg`,
                    borderRadius: '2px'
                  }}
                  animate={{
                    opacity: [0.7, 0.9, 0.7]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: i * 0.1
                  }}
                />
              ))}
            </motion.div>
            
            {/* Center circle */}
            <motion.div 
              className="w-16 h-16 rounded-full z-10 flex items-center justify-center text-white font-bold text-xs"
              style={{ 
                background: `linear-gradient(135deg, ${finalPrimaryColor}, ${finalSecondaryColor})`,
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)'
              }}
              animate={{
                scale: [1, 0.85, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              PHOTOBOOTH
            </motion.div>
          </motion.div>
          
          {/* Light flash effects in background */}
          <div className="absolute -z-10 inset-0 flex items-center justify-center">
            {[...Array(8)].map((_, i) => (
              <motion.div 
                key={i}
                className="absolute w-full h-full"
                style={{ 
                  background: `radial-gradient(circle, ${i % 2 === 0 ? finalPrimaryColor : finalSecondaryColor}20 0%, transparent 70%)`,
                  transform: `rotate(${i * 45}deg)`,
                  opacity: 0.3
                }}
                animate={{
                  opacity: [0.1, 0.4, 0.1]
                }}
                transition={{
                  duration: 2 + Math.random(),
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Processing visual pattern */}
        <div className="flex items-end justify-center space-x-1 mb-8 h-12">
          {[...Array(20)].map((_, i) => (
            <motion.div 
              key={i} 
              className="w-1.5 rounded-full"
              style={{ 
                background: `linear-gradient(to top, ${i % 2 ? finalPrimaryColor : finalSecondaryColor}, transparent)`,
                opacity: 0.8
              }}
              animate={{
                height: [
                  `${10 + Math.random() * 40}%`, 
                  `${60 + Math.random() * 40}%`, 
                  `${10 + Math.random() * 30}%`, 
                  `${50 + Math.random() * 50}%`
                ]
              }}
              transition={{
                duration: 1.2,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "mirror",
                delay: i * 0.05
              }}
            />
          ))}
        </div>
        
        <motion.h3 
          className="text-white text-2xl font-bold text-center mb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ 
            background: `linear-gradient(to right, ${finalPrimaryColor}, ${finalSecondaryColor})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          {title}
        </motion.h3>
        
        <motion.div
          className="h-16 text-center mb-6"
        >
          <motion.p 
            key={displayMessage} // Key helps with animation when message changes
            className="text-gray-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
          >
            {displayMessage}
          </motion.p>
        </motion.div>
        
        {/* Progress bar with gradient */}
        <div className="w-full h-3 bg-gray-800/80 rounded-full overflow-hidden mb-3">
          <motion.div 
            className="h-full"
            style={{ 
              background: `linear-gradient(90deg, ${finalPrimaryColor}, ${finalSecondaryColor})`,
              boxShadow: `0 0 10px ${finalPrimaryColor}`
            }}
            initial={{ width: "3%" }}
            animate={{ width: `${progressToShow}%` }}
            transition={{ ease: "easeInOut" }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-300 px-1 mb-4">
          <span>Traitement...</span>
          <span>{Math.round(progressToShow)}%</span>
        </div>
        
        {/* Logs display area */}
        {logs && logs.length > 0 && (
          <div className="mt-4 max-h-32 overflow-y-auto text-sm p-3 rounded bg-black/20 text-gray-300">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        )}
        
        {/* Cancel button if provided */}
        {onCancel && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              Annuler
            </button>
          </div>
        )}
        
        {/* Floating photo elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{ 
                color: i % 2 === 0 ? finalPrimaryColor : finalSecondaryColor,
                opacity: 0.15,
                fontSize: `${1 + Math.random() * 1.5}rem`
              }}
              initial={{ 
                x: `${Math.random() * 100}%`, 
                y: "120%",
                rotate: Math.random() * 360
              }}
              animate={{ 
                y: "-20%",
                rotate: Math.random() > 0.5 ? 360 : -360
              }}
              transition={{
                duration: 3 + Math.random() * 7,
                repeat: Infinity,
                repeatType: "loop",
                ease: "linear",
                delay: Math.random() * 5
              }}
            >
              {['📷', '🖼️', '📱', '🎞️', '📸', '✨'][Math.floor(Math.random() * 6)]}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
