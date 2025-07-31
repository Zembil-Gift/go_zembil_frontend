import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface GiftingJourneyAnimationProps {
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  onComplete?: () => void;
}

export default function GiftingJourneyAnimation({ 
  className = "", 
  autoPlay = true, 
  loop = false,
  onComplete 
}: GiftingJourneyAnimationProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    if (autoPlay) {
      setIsPlaying(true);
    }
  }, [autoPlay]);

  const handleAnimationComplete = () => {
    if (loop) {
      setTimeout(() => setIsPlaying(false), 500);
      setTimeout(() => setIsPlaying(true), 1000);
    } else {
      onComplete?.();
    }
  };

  return (
    <div className={`relative w-full h-full flex items-center justify-center bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg ${className}`}>
      <svg
        viewBox="0 0 400 300"
        className="w-full h-full max-w-lg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Elements */}
        <defs>
          <linearGradient id="warmGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDF6E3" />
            <stop offset="100%" stopColor="#F5E6D3" />
          </linearGradient>
          
          <linearGradient id="basketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D2691E" />
            <stop offset="50%" stopColor="#CD853F" />
            <stop offset="100%" stopColor="#8B4513" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="300" fill="url(#warmGradient)" rx="8" />

        {/* Delivery Person */}
        <motion.g
          initial={{ x: -100, opacity: 0 }}
          animate={isPlaying ? { x: 120, opacity: 1 } : { x: -100, opacity: 0 }}
          transition={{ 
            duration: 2.5, 
            ease: [0.4, 0.0, 0.2, 1],
            delay: 0.3 
          }}
        >
          {/* Body */}
          <ellipse cx="50" cy="180" rx="20" ry="35" fill="#1C3A2D" />
          
          {/* Head */}
          <circle cx="50" cy="130" r="18" fill="#8B4513" />
          
          {/* Smile */}
          <motion.path
            d="M 42 135 Q 50 142 58 135"
            stroke="#654321"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={isPlaying ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 0.5, delay: 1.5 }}
          />
          
          {/* Arms */}
          <ellipse cx="35" cy="155" rx="8" ry="20" fill="#8B4513" transform="rotate(-20 35 155)" />
          <ellipse cx="65" cy="155" rx="8" ry="20" fill="#8B4513" transform="rotate(20 65 155)" />
          
          {/* Legs */}
          <ellipse cx="42" cy="210" rx="6" ry="25" fill="#654321" />
          <ellipse cx="58" cy="210" rx="6" ry="25" fill="#654321" />
        </motion.g>

        {/* Traditional Zembil Basket */}
        <motion.g
          initial={{ x: -80, y: 0, scale: 0.8, opacity: 0 }}
          animate={isPlaying ? { x: 140, y: 0, scale: 1, opacity: 1 } : { x: -80, y: 0, scale: 0.8, opacity: 0 }}
          transition={{ 
            duration: 2.5, 
            ease: [0.4, 0.0, 0.2, 1],
            delay: 0.4 
          }}
        >
          {/* Basket Body */}
          <path
            d="M 30 140 Q 30 120 50 120 L 90 120 Q 110 120 110 140 L 105 170 Q 105 180 95 180 L 45 180 Q 35 180 35 170 Z"
            fill="url(#basketGradient)"
          />
          
          {/* Basket Weaving Pattern */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={isPlaying ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`h-${i}`}
                x1="35"
                y1={130 + i * 10}
                x2="105"
                y2={130 + i * 10}
                stroke="#654321"
                strokeWidth="1"
                opacity="0.6"
              />
            ))}
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <line
                key={`v-${i}`}
                x1={35 + i * 12}
                y1="125"
                x2={35 + i * 12}
                y2="175"
                stroke="#654321"
                strokeWidth="1"
                opacity="0.6"
              />
            ))}
          </motion.g>
          
          {/* Basket Handle */}
          <path
            d="M 45 120 Q 70 105 95 120"
            stroke="#228B22"
            strokeWidth="4"
            fill="none"
          />
          
          {/* Gifts Inside Basket */}
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={isPlaying ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            transition={{ duration: 0.6, delay: 1.8 }}
          >
            {/* Gift 1 */}
            <rect x="45" y="135" width="12" height="12" fill="#E94E1B" rx="2" />
            <rect x="49" y="135" width="4" height="12" fill="#FDCB2D" />
            
            {/* Gift 2 */}
            <rect x="62" y="140" width="10" height="10" fill="#1C3A2D" rx="2" />
            <circle cx="67" cy="145" r="3" fill="#FDCB2D" />
            
            {/* Gift 3 */}
            <rect x="78" y="138" width="14" height="8" fill="#CD853F" rx="2" />
            <rect x="85" y="138" width="1" height="8" fill="#8B4513" />
          </motion.g>
        </motion.g>

        {/* Recipient */}
        <motion.g
          initial={{ x: 50, opacity: 0 }}
          animate={isPlaying ? { x: 0, opacity: 1 } : { x: 50, opacity: 0 }}
          transition={{ 
            duration: 1.5, 
            ease: "easeInOut",
            delay: 1.5 
          }}
        >
          {/* Body */}
          <ellipse cx="280" cy="180" rx="18" ry="32" fill="#8B4513" />
          
          {/* Head */}
          <circle cx="280" cy="135" r="16" fill="#CD853F" />
          
          {/* Happy Expression */}
          <motion.g
            initial={{ scale: 0 }}
            animate={isPlaying ? { scale: 1 } : { scale: 0 }}
            transition={{ duration: 0.4, delay: 2.8 }}
          >
            <circle cx="275" cy="132" r="2" fill="#654321" />
            <circle cx="285" cy="132" r="2" fill="#654321" />
            <path
              d="M 272 140 Q 280 147 288 140"
              stroke="#654321"
              strokeWidth="2"
              fill="none"
            />
          </motion.g>
          
          {/* Arms reaching out */}
          <motion.ellipse 
            cx="260" 
            cy="155" 
            rx="6" 
            ry="18" 
            fill="#CD853F" 
            transform="rotate(-30 260 155)"
            initial={{ rotate: 0 }}
            animate={isPlaying ? { rotate: -30 } : { rotate: 0 }}
            transition={{ duration: 0.8, delay: 2.2 }}
          />
          <motion.ellipse 
            cx="300" 
            cy="155" 
            rx="6" 
            ry="18" 
            fill="#CD853F" 
            transform="rotate(30 300 155)"
            initial={{ rotate: 0 }}
            animate={isPlaying ? { rotate: 30 } : { rotate: 0 }}
            transition={{ duration: 0.8, delay: 2.2 }}
          />
          
          {/* Legs */}
          <ellipse cx="272" cy="205" rx="5" ry="22" fill="#654321" />
          <ellipse cx="288" cy="205" rx="5" ry="22" fill="#654321" />
        </motion.g>

        {/* Heart symbols floating */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={isPlaying ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ duration: 1.2, delay: 3, ease: "easeOut" }}
        >
          {[0, 1, 2].map((i) => (
            <motion.path
              key={i}
              d="M 12,21.35 C 12,17 8.35,13.35 4,13.35 C -0.35,13.35 -4,17 -4,21.35 C -4,28 12,41 12,41 C 12,41 28,28 28,21.35 C 28,17 24.35,13.35 20,13.35 C 15.65,13.35 12,17 12,21.35 Z"
              fill="#E94E1B"
              opacity="0.8"
              transform={`translate(${180 + i * 25}, ${70 + i * 12}) scale(0.4)`}
              animate={{
                y: [0, -15, 0],
                scale: [0.4, 0.5, 0.4],
                opacity: [0.6, 1, 0.6]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.g>

        {/* Brand Text Animation */}
        <motion.g
          initial={{ opacity: 0, y: 20 }}
          animate={isPlaying ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1.2, delay: 3.5, ease: "easeOut" }}
          onAnimationComplete={handleAnimationComplete}
        >
          <text
            x="200"
            y="260"
            textAnchor="middle"
            fill="#1C3A2D"
            style={{ 
              fontSize: "28px", 
              fontWeight: "bold",
              fontFamily: "system-ui, -apple-system, sans-serif"
            }}
          >
            <tspan fill="#1C3A2D">go</tspan>
            <tspan fill="#654321">Zembil</tspan>
          </text>
          
          <motion.text
            x="200"
            y="280"
            textAnchor="middle"
            fill="#CD853F"
            style={{ 
              fontSize: "14px", 
              fontWeight: "500",
              fontFamily: "system-ui, -apple-system, sans-serif"
            }}
            initial={{ opacity: 0 }}
            animate={isPlaying ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.8, delay: 3.5 }}
          >
            Gifting with Heart
          </motion.text>
        </motion.g>
      </svg>
    </div>
  );
}