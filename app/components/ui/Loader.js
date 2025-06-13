'use client';

import React, { useEffect, useRef } from 'react';

export default function Loader({ size = 'default', message = 'Chargement en cours...', variant = 'premium' }) {
  const particlesRef = useRef(null);
  
  // Size variations
  const sizeClasses = {
    small: 'h-8 w-8',
    default: 'h-16 w-16',
    large: 'h-24 w-24'
  };
  
  const textSizes = {
    small: 'text-xs',
    default: 'text-sm',
    large: 'text-base'
  };

  // Particle animation effect
  useEffect(() => {
    if (variant === 'premium' && particlesRef.current) {
      const canvas = particlesRef.current;
      const ctx = canvas.getContext('2d');
      const particles = [];
      
      // Set canvas size
      const setCanvasSize = () => {
        const containerSize = Math.max(
          size === 'small' ? 80 : size === 'large' ? 240 : 160,
          message ? 200 : 160
        );
        canvas.width = containerSize;
        canvas.height = containerSize;
      };
      
      setCanvasSize();

      // Create particles
      class Particle {
        constructor() {
          this.x = Math.random() * canvas.width;
          this.y = Math.random() * canvas.height;
          this.size = Math.random() * 3 + 1;
          this.speedX = Math.random() * 1 - 0.5;
          this.speedY = Math.random() * 1 - 0.5;
          this.color = `hsla(${Math.random() * 60 + 220}, 100%, 70%, ${Math.random() * 0.5 + 0.2})`;
        }
        
        update() {
          this.x += this.speedX;
          this.y += this.speedY;
          
          // Keep particles in bounds with a fade effect near edges
          if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.size -= 0.1;
          }
          
          // Regenerate particles that get too small
          if (this.size <= 0.2) {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1;
            this.color = `hsla(${Math.random() * 60 + 220}, 100%, 70%, ${Math.random() * 0.5 + 0.2})`;
          }
        }
        
        draw() {
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      const initParticles = () => {
        for (let i = 0; i < 30; i++) {
          particles.push(new Particle());
        }
      };
      
      const animateParticles = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < particles.length; i++) {
          particles[i].update();
          particles[i].draw();
        }
        
        requestAnimationFrame(animateParticles);
      };
      
      initParticles();
      animateParticles();
      
      return () => {
        // Cleanup logic if needed
      };
    }
  }, [size, message, variant]);

  // Render different loader variants
  const renderLoader = () => {
    if (variant === 'premium') {
      return (
        <div className="relative flex items-center justify-center">
          {/* Background canvas for particles */}
          <canvas 
            ref={particlesRef} 
            className="absolute inset-0 z-0"
            style={{ width: '100%', height: '100%' }}
          />

          {/* Multi-layered spinner with 3D effect */}
          <div className="relative z-10">
            {/* Glow effect */}
            <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-indigo-500 opacity-20 blur-xl animate-pulse-slow`}></div>
            
            {/* Outer spinning ring with gradient and shadow */}
            <div className={`relative ${sizeClasses[size]} rounded-full animate-spin-slow duration-3000 shadow-lg`}>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600 opacity-90"></div>
              <div className="absolute inset-[3px] rounded-full bg-white"></div>
            </div>
            
            {/* Middle spinning ring (opposite direction) */}
            <div className={`absolute inset-[6px] rounded-full animate-spin-reverse shadow-inner`}>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-indigo-400 to-blue-500 opacity-90"></div>
              <div className="absolute inset-[3px] rounded-full bg-white"></div>
            </div>
            
            {/* Inner spinning gradient circle */}
            <div className={`absolute inset-[25%] rounded-full animate-spin-slow animate-pulse shadow-inner`}>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600"></div>
            </div>
            
            {/* Highlight effects */}
            <div className="absolute top-0 left-1/4 w-1/4 h-1/4 bg-white opacity-30 rounded-full blur-sm"></div>
            
            {/* Spinning dots around the circle */}
            <div className="absolute inset-0 animate-spin-slower">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className="absolute w-2 h-2 bg-white rounded-full shadow-md"
                  style={{ 
                    top: '10%', 
                    left: '50%', 
                    transform: `rotate(${i * 60}deg) translateY(-${sizeClasses[size].split('-')[1].split('w')[0] / 2 + 6}px)` 
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Fallback to simpler loader if needed
    return (
      <div className="relative">
        {/* ...existing code... */}
      </div>
    );
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-6">
      {renderLoader()}
      
      {/* Animated loading text with fade-in effect */}
      {message && (
        <div className="mt-6 text-center">
          <p className={`font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 ${textSizes[size]} animate-fade-in`}>
            {message}
          </p>
          <div className="mt-2 flex justify-center gap-1.5">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                style={{ animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite` }}
              ></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
