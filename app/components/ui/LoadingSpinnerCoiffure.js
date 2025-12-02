"use client";

import { motion } from 'framer-motion';

const LoadingSpinnerCoiffure = ({ 
  size = "large", 
  primaryColor = "#FFFFFF", 
  secondaryColor = "#00FFFF",
  accentColor = "#FF00FF",
  message = "Préparation de votre coiffure..."
}) => {
  // Different sizes
  const sizeConfig = {
    small: { container: 80, scissors: 24, text: "text-sm" },
    medium: { container: 120, scissors: 32, text: "text-base" },
    large: { container: 160, scissors: 40, text: "text-lg" }
  };

  const config = sizeConfig[size] || sizeConfig.large;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      {/* Main spinner container */}
      <div 
        className="relative flex items-center justify-center mb-8"
        style={{ 
          width: config.container, 
          height: config.container 
        }}
      >
        {/* Outer rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-transparent"
          style={{
            borderTopColor: primaryColor,
            borderRightColor: secondaryColor,
            borderBottomColor: accentColor,
            borderLeftColor: 'transparent'
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        {/* Inner pulsing circle */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: config.container * 0.7,
            height: config.container * 0.7,
            backgroundColor: `${primaryColor}20`
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.8, 0.2]
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Animated scissors */}
        <motion.div
          className="relative z-10"
          animate={{
            rotate: [0, 15, -15, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <svg
            width={config.scissors}
            height={config.scissors}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Scissors SVG */}
            <g>
              {/* Left blade */}
              <motion.path
                d="M8 12c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4z"
                fill={primaryColor}
                animate={{
                  rotate: [0, -5, 0]
                }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{ transformOrigin: "12px 16px" }}
              />
              <motion.path
                d="M12 16l12 8"
                stroke={primaryColor}
                strokeWidth="2"
                strokeLinecap="round"
                animate={{
                  pathLength: [0.8, 1, 0.8],
                  stroke: [primaryColor, secondaryColor, primaryColor]
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Right blade */}
              <motion.path
                d="M8 32c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4z"
                fill={primaryColor}
                animate={{
                  rotate: [0, 5, 0]
                }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{ transformOrigin: "12px 36px" }}
              />
              <motion.path
                d="M12 36l12-8"
                stroke={primaryColor}
                strokeWidth="2"
                strokeLinecap="round"
                animate={{
                  pathLength: [0.8, 1, 0.8],
                  stroke: [primaryColor, secondaryColor, primaryColor]
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Handle/Pivot */}
              <motion.circle
                cx="24"
                cy="24"
                r="3"
                fill={secondaryColor}
                stroke={primaryColor}
                strokeWidth="1"
                animate={{
                  fill: [secondaryColor, accentColor, secondaryColor]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Hair strands being cut */}
              <motion.g
                animate={{
                  opacity: [0, 1, 0],
                  x: [0, 8, 15]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              >
                <motion.path
                  d="M30 20c2 0 4 2 6 4"
                  stroke={accentColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  animate={{
                    stroke: [accentColor, secondaryColor, accentColor]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.path
                  d="M30 24c2 0 4 2 6 4"
                  stroke={accentColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  animate={{
                    stroke: [accentColor, secondaryColor, accentColor]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                />
                <motion.path
                  d="M30 28c2 0 4 2 6 4"
                  stroke={accentColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  animate={{
                    stroke: [accentColor, secondaryColor, accentColor]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                />
              </motion.g>
            </g>
          </svg>
        </motion.div>

        {/* Sparkle effects */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              backgroundColor: i % 2 === 0 ? secondaryColor : accentColor,
              left: `${(20 + Math.cos((i * 60) * Math.PI / 180) * (config.container * 0.4)).toFixed(2)}px`,
              top: `${(20 + Math.sin((i * 60) * Math.PI / 180) * (config.container * 0.4)).toFixed(2)}px`
            }}
            animate={{
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
              backgroundColor: [
                i % 2 === 0 ? secondaryColor : accentColor,
                i % 2 === 0 ? accentColor : secondaryColor,
                i % 2 === 0 ? secondaryColor : accentColor
              ]
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Loading message */}
      <motion.div
        className={`text-center ${config.text} font-medium max-w-xs text-white`}
        animate={{
          opacity: [0.7, 1, 0.7],
          color: [primaryColor, secondaryColor, primaryColor]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {message}
      </motion.div>

      {/* Subtle dots animation */}
      <motion.div
        className="flex space-x-2 mt-6"
        animate={{
          opacity: [0.5, 1, 0.5]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full"
            animate={{
              y: [0, -12, 0],
              backgroundColor: [
                i === 0 ? primaryColor : i === 1 ? secondaryColor : accentColor,
                i === 0 ? secondaryColor : i === 1 ? accentColor : primaryColor,
                i === 0 ? primaryColor : i === 1 ? secondaryColor : accentColor
              ]
            }}
            transition={{
              duration: 3.2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut"
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default LoadingSpinnerCoiffure;
