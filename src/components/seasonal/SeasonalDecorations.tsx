import React from 'react';
import { motion } from 'framer-motion';
import { useSeasonalTheme } from './SeasonalThemeProvider';

interface SeasonalDecorationsProps {
  position?: 'header' | 'footer' | 'sidebar' | 'floating' | 'wishlist';
  intensity?: 'subtle' | 'moderate' | 'festive';
}

export function SeasonalDecorations({ 
  position = 'floating', 
  intensity = 'moderate' 
}: SeasonalDecorationsProps) {
  const { currentTheme, isSeasonalMode } = useSeasonalTheme();

  if (!isSeasonalMode || currentTheme.id === 'default') {
    return null;
  }

  const decorationCount = intensity === 'subtle' ? 3 : intensity === 'moderate' ? 6 : 12;
  const decorations = currentTheme.decorations.slice(0, decorationCount);

  const getAnimationVariants = () => {
    switch (position) {
      case 'floating':
        return {
          animate: {
            y: [-10, 10, -10],
            rotate: [-5, 5, -5],
            transition: {
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }
        };
      case 'header':
        return {
          animate: {
            scale: [1, 1.1, 1],
            transition: {
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }
        };
      case 'wishlist':
        return {
          animate: {
            rotate: [0, 360],
            scale: [1, 1.2, 1],
            transition: {
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }
        };
      default:
        return {
          animate: {
            opacity: [0.7, 1, 0.7],
            transition: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }
        };
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'header':
        return 'absolute top-2 right-4 flex gap-2';
      case 'footer':
        return 'absolute bottom-2 left-4 flex gap-2';
      case 'sidebar':
        return 'fixed right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-3';
      case 'wishlist':
        return 'absolute top-4 right-4 flex gap-1';
      case 'floating':
      default:
        return 'fixed top-20 right-4 flex flex-col gap-4 pointer-events-none z-10';
    }
  };

  return (
    <div className={getPositionStyles()}>
      {decorations.map((decoration, index) => (
        <motion.div
          key={`${decoration}-${index}`}
          className="text-2xl select-none"
          {...getAnimationVariants()}
          style={{
            animationDelay: `${index * 0.5}s`,
          }}
        >
          {decoration}
        </motion.div>
      ))}
    </div>
  );
}

export function SeasonalWishlistHeader() {
  const { currentTheme, isSeasonalMode } = useSeasonalTheme();

  if (!isSeasonalMode || currentTheme.id === 'default') {
    return null;
  }

  return (
    <div className="text-center mb-6 p-4 rounded-lg" style={{
      backgroundColor: currentTheme.colors.background,
      border: `2px solid ${currentTheme.colors.accent}`,
    }}>
      <div className="flex items-center justify-center gap-2 mb-2">
        {currentTheme.decorations.slice(0, 3).map((decoration, index) => (
          <motion.span
            key={index}
            className="text-2xl"
            animate={{
              rotate: [0, 10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: index * 0.3,
            }}
          >
            {decoration}
          </motion.span>
        ))}
      </div>
      <h2 
        className="text-xl font-semibold"
        style={{ color: currentTheme.colors.text }}
      >
        {currentTheme.displayName} Wishlist
      </h2>
      <p 
        className="text-sm opacity-80"
        style={{ color: currentTheme.colors.text }}
      >
        {currentTheme.description}
      </p>
    </div>
  );
}

export function SeasonalProductBadge({ className = "" }: { className?: string }) {
  const { currentTheme, isSeasonalMode } = useSeasonalTheme();

  if (!isSeasonalMode || currentTheme.id === 'default') {
    return null;
  }

  return (
    <motion.div
      className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${className}`}
      style={{
        backgroundColor: currentTheme.colors.accent,
        color: currentTheme.colors.background,
      }}
      whileHover={{ scale: 1.05 }}
      animate={{
        boxShadow: [
          `0 0 0 ${currentTheme.colors.accent}`,
          `0 0 10px ${currentTheme.colors.accent}40`,
          `0 0 0 ${currentTheme.colors.accent}`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
      }}
    >
      <span>{currentTheme.decorations[0]}</span>
      <span className="capitalize">{currentTheme.name}</span>
    </motion.div>
  );
}