import React from 'react';
import { motion } from 'framer-motion';
import { useLocalSeasonalTheme } from './LocalSeasonalTheme';

interface LocalSeasonalDecorationsProps {
  position?: 'wishlist' | 'header' | 'footer';
  intensity?: 'subtle' | 'moderate' | 'high';
}

export function LocalSeasonalDecorations({ 
  position = 'wishlist', 
  intensity = 'moderate' 
}: LocalSeasonalDecorationsProps) {
  const { currentTheme, isSeasonalMode } = useLocalSeasonalTheme();

  if (!isSeasonalMode || currentTheme.id === 'default') {
    return null;
  }

  const decorationCount = {
    subtle: 3,
    moderate: 6,
    high: 10,
  }[intensity];

  const decorations = Array.from({ length: decorationCount }, (_, i) => ({
    id: i,
    emoji: i % 2 === 0 ? currentTheme.decorations.primary : currentTheme.decorations.secondary,
    delay: i * 0.2,
    duration: 3 + (i % 3),
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {decorations.map((decoration) => (
        <motion.div
          key={decoration.id}
          className="absolute text-2xl opacity-20"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            rotate: 0,
            scale: 0.5,
          }}
          animate={{
            y: [null, -20, 20, -10, 10, 0],
            rotate: [0, 360],
            scale: [0.5, 0.8, 0.6, 0.9, 0.7],
          }}
          transition={{
            duration: decoration.duration,
            delay: decoration.delay,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          style={{
            left: `${Math.random() * 90}%`,
            top: `${Math.random() * 90}%`,
          }}
        >
          {decoration.emoji}
        </motion.div>
      ))}
    </div>
  );
}

export function LocalSeasonalWishlistHeader() {
  const { currentTheme, isSeasonalMode } = useLocalSeasonalTheme();

  if (!isSeasonalMode || currentTheme.id === 'default') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-8 p-6 rounded-lg"
      style={{
        background: `linear-gradient(135deg, ${currentTheme.colors.primary}20, ${currentTheme.colors.secondary}20)`,
        borderColor: currentTheme.colors.accent + '40',
      }}
    >
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className="text-3xl">{currentTheme.decorations.primary}</span>
        <h2 className="text-2xl font-bold" style={{ color: currentTheme.colors.primary }}>
          {currentTheme.name} Wishlist
        </h2>
        <span className="text-3xl">{currentTheme.decorations.secondary}</span>
      </div>
      <p className="text-sm" style={{ color: currentTheme.colors.text + 'CC' }}>
        Your wishlist is celebrating the spirit of {currentTheme.name.toLowerCase()}
      </p>
    </motion.div>
  );
}

export function LocalSeasonalProductBadge() {
  const { currentTheme, isSeasonalMode } = useLocalSeasonalTheme();

  if (!isSeasonalMode || currentTheme.id === 'default') {
    return null;
  }

  return (
    <motion.div
      className="absolute top-2 left-2 text-lg opacity-60 pointer-events-none z-10"
      animate={{ 
        rotate: [0, 5, -5, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {currentTheme.decorations.secondary}
    </motion.div>
  );
}