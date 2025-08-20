"use client";

import { motion } from 'framer-motion';

const SimpleCoiffureSpinner = ({ 
  primaryColor = "#FFFFFF", 
  secondaryColor = "#00FFFF" 
}) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="relative">
        {/* Rotating scissors */}
        <motion.div
          className="relative z-10"
          animate={{ rotate: 360 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left blade */}
            <motion.path
              d="M8 12c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4z"
              fill={primaryColor}
              animate={{
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.path
              d="M12 16l12 8"
              stroke={primaryColor}
              strokeWidth="2"
              strokeLinecap="round"
              animate={{
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
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.5
              }}
            />
            <motion.path
              d="M12 36l12-8"
              stroke={primaryColor}
              strokeWidth="2"
              strokeLinecap="round"
              animate={{
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
                fill: [secondaryColor, primaryColor, secondaryColor]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </svg>
        </motion.div>

        {/* Pulsing background circle */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-transparent"
          style={{
            borderTopColor: primaryColor,
            borderBottomColor: secondaryColor,
            width: 80,
            height: 80,
            left: -8,
            top: -8
          }}
          animate={{
            rotate: -360,
            scale: [1, 1.2, 1],
            borderTopColor: [primaryColor, secondaryColor, primaryColor],
            borderBottomColor: [secondaryColor, primaryColor, secondaryColor]
          }}
          transition={{
            rotate: {
              duration: 4,
              repeat: Infinity,
              ease: "linear"
            },
            scale: {
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            },
            borderTopColor: {
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut"
            },
            borderBottomColor: {
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
        />
      </div>
    </div>
  );
};

export default SimpleCoiffureSpinner;
