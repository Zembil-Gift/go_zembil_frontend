import { useState } from "react";
import { motion } from "framer-motion";

interface SingleDeliveryAnimationProps {
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
}

export default function SingleDeliveryAnimation({ 
  className = "", 
  autoPlay = false, 
  loop = true 
}: SingleDeliveryAnimationProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  const handleAnimationComplete = () => {
    if (loop) {
      setTimeout(() => {
        setIsPlaying(false);
        setTimeout(() => setIsPlaying(true), 100);
      }, 2000);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <svg viewBox="0 0 400 160" className="w-full h-full">
        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="softGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF7ED" />
            <stop offset="50%" stopColor="#FEFCF9" />
            <stop offset="100%" stopColor="#FDF4E8" />
          </linearGradient>
          
          <linearGradient id="basketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D2691E" />
            <stop offset="50%" stopColor="#8B4513" />
            <stop offset="100%" stopColor="#654321" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="160" fill="url(#softGradient)" rx="12" />

        {/* Walking in Place Delivery Person */}
        <motion.g
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isPlaying ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ 
            duration: 0.8, 
            ease: "easeOut",
            delay: 0.2 
          }}
        >
          {/* Body with subtle bounce */}
          <motion.rect 
            x="188" y="76" width="24" height="30" fill="#1C3A2D" rx="6"
            animate={isPlaying ? {
              y: [76, 74, 76, 74, 76],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Head with cheerful expression */}
          <motion.circle 
            cx="200" cy="60" r="16" fill="#8B4513"
            animate={isPlaying ? {
              y: [60, 58, 60, 58, 60],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Eyes - always bright and cheerful */}
          <motion.circle 
            cx="196" cy="56" r="1.5" fill="#000"
            animate={isPlaying ? {
              y: [56, 54, 56, 54, 56],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.circle 
            cx="204" cy="56" r="1.5" fill="#000"
            animate={isPlaying ? {
              y: [56, 54, 56, 54, 56],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Big Smile */}
          <motion.path 
            d="M 192 63 Q 200 70 208 63" 
            stroke="#000" 
            strokeWidth="2" 
            fill="none" 
            strokeLinecap="round"
            animate={isPlaying ? {
              y: [63, 61, 63, 61, 63],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Basket-holding arm (left arm - stays steady) */}
          <motion.ellipse 
            cx="180" cy="85" rx="4" ry="15" fill="#8B4513"
            animate={isPlaying ? {
              rotate: [0, 5, -5, 5, 0],
              y: [85, 83, 85, 83, 85],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Waving arm (right arm - animated waving every 3 seconds) */}
          <motion.g
            animate={isPlaying ? {
              rotate: [0, 0, 0, 30, 50, 30, 0, 0, 0],
              y: [85, 83, 85, 83, 80, 83, 85, 83, 85],
            } : {}}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{ transformOrigin: "220px 85px" }}
          >
            <ellipse cx="220" cy="85" rx="4" ry="15" fill="#8B4513" />
            <circle cx="220" cy="72" r="3" fill="#8B4513" />
          </motion.g>
          
          {/* Walking Legs - alternating motion */}
          <motion.ellipse 
            cx="195" cy="125" rx="4" ry="20" fill="#654321"
            animate={isPlaying ? {
              rotate: [0, 15, -15, 15, 0],
              y: [125, 123, 125, 123, 125],
            } : {}}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.ellipse 
            cx="205" cy="125" rx="4" ry="20" fill="#654321"
            animate={isPlaying ? {
              rotate: [0, -15, 15, -15, 0],
              y: [125, 123, 125, 123, 125],
            } : {}}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          />
        </motion.g>

        {/* Traditional Zembil Basket held in hand */}
        <motion.g
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isPlaying ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ 
            duration: 0.8, 
            ease: "easeOut",
            delay: 0.4 
          }}
        >
          {/* Basket Body - Traditional Zembil Shape (positioned near left arm) */}
          <motion.ellipse 
            cx="165" cy="90" rx="12" ry="10" fill="url(#basketGradient)"
            animate={isPlaying ? {
              rotate: [0, 2, -2, 2, 0],
              y: [90, 88, 90, 88, 90],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.ellipse 
            cx="165" cy="80" rx="14" ry="5" fill="#D2691E"
            animate={isPlaying ? {
              rotate: [0, 2, -2, 2, 0],
              y: [80, 78, 80, 78, 80],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Weaving Pattern */}
          <motion.path 
            d="M 155 85 Q 165 82 175 85" stroke="#654321" strokeWidth="0.8" fill="none"
            animate={isPlaying ? {
              y: [85, 83, 85, 83, 85],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.path 
            d="M 155 88 Q 165 85 175 88" stroke="#654321" strokeWidth="0.8" fill="none"
            animate={isPlaying ? {
              y: [88, 86, 88, 86, 88],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.path 
            d="M 155 91 Q 165 88 175 91" stroke="#654321" strokeWidth="0.8" fill="none"
            animate={isPlaying ? {
              y: [91, 89, 91, 89, 91],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.path 
            d="M 155 94 Q 165 91 175 94" stroke="#654321" strokeWidth="0.8" fill="none"
            animate={isPlaying ? {
              y: [94, 92, 94, 92, 94],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Vertical Weaving */}
          <motion.line 
            x1="160" y1="80" x2="160" y2="100" stroke="#8B4513" strokeWidth="0.8"
            animate={isPlaying ? {
              y1: [80, 78, 80, 78, 80],
              y2: [100, 98, 100, 98, 100],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.line 
            x1="165" y1="78" x2="165" y2="100" stroke="#8B4513" strokeWidth="0.8"
            animate={isPlaying ? {
              y1: [78, 76, 78, 76, 78],
              y2: [100, 98, 100, 98, 100],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.line 
            x1="170" y1="80" x2="170" y2="100" stroke="#8B4513" strokeWidth="0.8"
            animate={isPlaying ? {
              y1: [80, 78, 80, 78, 80],
              y2: [100, 98, 100, 98, 100],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Handle */}
          <motion.ellipse 
            cx="157" cy="85" rx="2" ry="6" fill="#228B22"
            animate={isPlaying ? {
              y: [85, 83, 85, 83, 85],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.g>

        {/* Continuous floating hearts and sparkles */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={isPlaying ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1, delay: 1 }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.g key={i}>
              {/* Floating Hearts */}
              <motion.path
                d="M 6,10.5 C 6,8.5 4.2,6.7 2,6.7 C -0.2,6.7 -2,8.5 -2,10.5 C -2,14 6,20.5 6,20.5 C 6,20.5 14,14 14,10.5 C 14,8.5 12.2,6.7 10,6.7 C 7.8,6.7 6,8.5 6,10.5 Z"
                fill="#E94E1B"
                opacity="0.8"
                transform={`translate(${240 + i * 20}, ${100 + i * 5}) scale(0.6)`}
                animate={{
                  y: [0, -30, -60],
                  scale: [0.6, 0.8, 0.4],
                  opacity: [0, 0.8, 0]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  delay: i * 0.8,
                  ease: "easeOut"
                }}
              />
              
              {/* Sparkles around character */}
              <motion.circle
                cx={200 + Math.cos(i * 1.2) * 40}
                cy={70 + Math.sin(i * 1.2) * 20}
                r="1.5"
                fill="#FDCB2D"
                animate={{
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeInOut"
                }}
              />
              
              {/* Additional warm sparkles */}
              <motion.polygon
                points={`${180 + i * 25},${50 + i * 8} ${182 + i * 25},${52 + i * 8} ${184 + i * 25},${50 + i * 8} ${182 + i * 25},${48 + i * 8}`}
                fill="#F4A460"
                animate={{
                  scale: [0, 1, 0],
                  rotate: [0, 180, 360],
                  opacity: [0, 0.9, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.6,
                  ease: "easeInOut"
                }}
              />
            </motion.g>
          ))}
        </motion.g>

        {/* Brand Text Animation */}
        <motion.g
          initial={{ opacity: 0, y: 20 }}
          animate={isPlaying ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1.5, delay: 2, ease: "easeOut" }}
          onAnimationComplete={handleAnimationComplete}
        >
          {/* goZembil Text */}
          <text x="200" y="140" textAnchor="middle" className="font-bold text-xl">
            <tspan className="fill-deep-forest">go</tspan>
            <tspan className="fill-zembil-brown">Zembil</tspan>
          </text>
          
          {/* Tagline */}
          <text x="200" y="152" textAnchor="middle" className="fill-gray-600 font-medium text-xs">
            Gifting with Heart
          </text>
        </motion.g>
      </svg>
    </div>
  );
}