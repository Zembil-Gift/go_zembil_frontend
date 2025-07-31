import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface GiftingHeartAnimationProps {
  className?: string;
  showText?: boolean;
  size?: "small" | "medium" | "large";
}

export default function GiftingHeartAnimation({ 
  className = "", 
  showText = true,
  size = "medium" 
}: GiftingHeartAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const sizeClasses = {
    small: "w-64 h-48",
    medium: "w-96 h-72", 
    large: "w-[32rem] h-96"
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* SVG Animation Container */}
      <motion.div
        className={`${sizeClasses[size]} relative`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.8 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <svg
          viewBox="0 0 400 300"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background with Ethiopian pattern */}
          <defs>
            <pattern id="ethiopianPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="#F8F8F8"/>
              <circle cx="10" cy="10" r="2" fill="#FDCB2D" opacity="0.3"/>
            </pattern>
            
            {/* Glow effect for basket */}
            <filter id="basketGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Coffee steam gradient */}
            <linearGradient id="steamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{stopColor:"#8B4513", stopOpacity:0.8}} />
              <stop offset="100%" style={{stopColor:"#8B4513", stopOpacity:0.1}} />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width="400" height="300" fill="url(#ethiopianPattern)"/>

          {/* Ground/Base */}
          <ellipse cx="200" cy="280" rx="180" ry="15" fill="#E5D4B1" opacity="0.3"/>

          {/* Coffee beans scattered on ground */}
          {[
            { cx: 50, cy: 270, delay: 0.5 },
            { cx: 80, cy: 275, delay: 0.7 },
            { cx: 320, cy: 268, delay: 0.9 },
            { cx: 350, cy: 272, delay: 1.1 }
          ].map((bean, index) => (
            <motion.ellipse
              key={index}
              cx={bean.cx}
              cy={bean.cy}
              rx="4"
              ry="6"
              fill="#4A2C17"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: bean.delay, duration: 0.5 }}
            />
          ))}

          {/* Giver Character (Man with traditional attire) */}
          <motion.g
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          >
            {/* Body */}
            <ellipse cx="120" cy="220" rx="25" ry="45" fill="#8B4513"/>
            
            {/* Traditional Ethiopian shirt pattern */}
            <rect x="100" y="190" width="40" height="30" fill="#D2691E" rx="5"/>
            <rect x="105" y="195" width="30" height="3" fill="#FDCB2D"/>
            <rect x="105" y="205" width="30" height="3" fill="#FDCB2D"/>
            
            {/* Arms */}
            <ellipse cx="95" cy="200" rx="12" ry="30" fill="#8B4513"/>
            <ellipse cx="145" cy="200" rx="12" ry="30" fill="#8B4513"/>
            
            {/* Legs */}
            <ellipse cx="110" cy="250" rx="10" ry="25" fill="#654321"/>
            <ellipse cx="130" cy="250" rx="10" ry="25" fill="#654321"/>
            
            {/* Head */}
            <circle cx="120" cy="160" r="20" fill="#D2691E"/>
            
            {/* Traditional hat */}
            <ellipse cx="120" cy="145" rx="22" ry="12" fill="#8B4513"/>
            <rect x="110" y="140" width="20" height="8" fill="#FDCB2D"/>
            
            {/* Facial features */}
            <circle cx="115" cy="158" r="2" fill="#000"/>
            <circle cx="125" cy="158" r="2" fill="#000"/>
            <path d="M 115 165 Q 120 170 125 165" stroke="#000" strokeWidth="2" fill="none"/>
          </motion.g>

          {/* Traditional Zembil Basket */}
          <motion.g
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
          >
            {/* Basket body with traditional weaving pattern */}
            <ellipse cx="180" cy="210" rx="30" ry="25" fill="#8B4513" filter="url(#basketGlow)"/>
            <ellipse cx="180" cy="205" rx="28" ry="23" fill="#D2691E"/>
            
            {/* Weaving pattern */}
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.path
                key={i}
                d={`M ${160 + i * 10} 190 Q ${170 + i * 10} 200 ${160 + i * 10} 220`}
                stroke="#654321"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 2 + i * 0.1, duration: 0.5 }}
              />
            ))}
            
            {/* Basket handles */}
            <ellipse cx="155" cy="195" rx="8" ry="15" fill="#228B22"/>
            <ellipse cx="205" cy="195" rx="8" ry="15" fill="#228B22"/>
            
            {/* Gift contents visible at top */}
            <circle cx="175" cy="190" r="6" fill="#E94E1B"/>
            <circle cx="185" cy="188" r="5" fill="#FDCB2D"/>
            <rect x="178" y="185" width="4" height="8" fill="#228B22"/>
          </motion.g>

          {/* Glowing heart effect */}
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8] }}
            transition={{ delay: 2.5, duration: 1.5 }}
          >
            <path
              d="M 200 180 C 200 175, 190 170, 185 175 C 180 170, 170 175, 170 180 C 170 185, 200 205, 200 205 C 200 205, 230 185, 230 180 C 230 175, 220 170, 215 175 C 210 170, 200 175, 200 180 Z"
              fill="#E94E1B"
              opacity="0.6"
            />
          </motion.g>

          {/* Receiver Character (Simplified family member) */}
          <motion.g
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 2, ease: "easeOut" }}
          >
            {/* Body */}
            <ellipse cx="280" cy="220" rx="20" ry="40" fill="#654321"/>
            
            {/* Traditional dress */}
            <rect x="265" y="195" width="30" height="40" fill="#E94E1B" rx="15"/>
            <rect x="270" y="200" width="20" height="3" fill="#FDCB2D"/>
            <rect x="270" y="210" width="20" height="3" fill="#FDCB2D"/>
            
            {/* Arms reaching out */}
            <ellipse cx="255" cy="200" rx="10" ry="25" fill="#D2691E"/>
            <ellipse cx="305" cy="200" rx="10" ry="25" fill="#D2691E"/>
            
            {/* Head */}
            <circle cx="280" cy="160" r="18" fill="#D2691E"/>
            
            {/* Hair/head covering */}
            <ellipse cx="280" cy="150" rx="20" ry="15" fill="#8B4513"/>
            
            {/* Facial features */}
            <circle cx="276" cy="158" r="1.5" fill="#000"/>
            <circle cx="284" cy="158" r="1.5" fill="#000"/>
            <path d="M 276 165 Q 280 168 284 165" stroke="#000" strokeWidth="1.5" fill="none"/>
          </motion.g>

          {/* Coffee steam rising */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0.6] }}
            transition={{ delay: 3, duration: 2, repeat: Infinity, repeatType: "reverse" }}
          >
            <path d="M 180 180 Q 185 170 180 160 Q 175 150 180 140" stroke="url(#steamGradient)" strokeWidth="2" fill="none"/>
            <path d="M 185 175 Q 190 165 185 155 Q 180 145 185 135" stroke="url(#steamGradient)" strokeWidth="1.5" fill="none"/>
          </motion.g>

          {/* Sparkle effects around the scene */}
          {[
            { cx: 100, cy: 120, delay: 3 },
            { cx: 320, cy: 140, delay: 3.2 },
            { cx: 80, cy: 180, delay: 3.4 },
            { cx: 340, cy: 200, delay: 3.6 }
          ].map((sparkle, index) => (
            <motion.g
              key={index}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                delay: sparkle.delay, 
                duration: 1.5, 
                repeat: Infinity, 
                repeatDelay: 2 
              }}
            >
              <path
                d={`M ${sparkle.cx} ${sparkle.cy - 8} L ${sparkle.cx + 3} ${sparkle.cy - 3} L ${sparkle.cx + 8} ${sparkle.cy} L ${sparkle.cx + 3} ${sparkle.cy + 3} L ${sparkle.cx} ${sparkle.cy + 8} L ${sparkle.cx - 3} ${sparkle.cy + 3} L ${sparkle.cx - 8} ${sparkle.cy} L ${sparkle.cx - 3} ${sparkle.cy - 3} Z`}
                fill="#FDCB2D"
              />
            </motion.g>
          ))}
        </svg>
      </motion.div>

      {/* Text Content */}
      {showText && (
        <motion.div
          className="text-center mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 4, duration: 1 }}
        >
          <motion.h2
            className="font-display text-2xl md:text-3xl font-bold text-charcoal mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 4.5, duration: 1 }}
          >
            Gifting with Heart
          </motion.h2>
          <motion.p
            className="text-gray-600 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 5, duration: 1 }}
          >
            Connecting hearts across distances through meaningful Ethiopian gifts
          </motion.p>
        </motion.div>
      )}
    </div>
  );
}