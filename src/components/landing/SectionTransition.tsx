import React from 'react';

interface SectionTransitionProps {
  variant?: 'wave' | 'curve' | 'gradient' | 'divider';
  fromColor?: string;
  toColor?: string;
  className?: string;
}

export default function SectionTransition({ 
  variant = 'wave', 
  fromColor = 'bg-white',
  toColor = 'bg-light-cream',
  className = ''
}: SectionTransitionProps) {
  
  if (variant === 'wave') {
    // Get color values - default to white and light-cream
    const getColorValue = (color: string) => {
      if (color.includes('gray-50')) return '#f9fafb';
      if (color.includes('light-cream')) return '#fef9f4';
      if (color.includes('white')) return '#ffffff';
      return '#ffffff';
    };
    
    const fromColorValue = getColorValue(fromColor);
    const toColorValue = getColorValue(toColor);
    
    return (
      <div className={`relative w-full h-16 overflow-hidden ${className}`}>
        <svg 
          className="absolute bottom-0 left-0 w-full h-full" 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M0,60 Q300,20 600,60 T1200,60 L1200,120 L0,120 Z" 
            fill={toColorValue}
          />
          <path 
            d="M0,60 Q300,100 600,60 T1200,60 L1200,0 L0,0 Z" 
            fill={fromColorValue}
          />
        </svg>
      </div>
    );
  }

  if (variant === 'curve') {
    const getColorValue = (color: string) => {
      if (color.includes('gray-50')) return '#f9fafb';
      if (color.includes('light-cream')) return '#fef9f4';
      if (color.includes('white')) return '#ffffff';
      return '#ffffff';
    };
    
    const fromColorValue = getColorValue(fromColor);
    const toColorValue = getColorValue(toColor);
    
    return (
      <div className={`relative w-full h-20 overflow-hidden ${className}`}>
        <svg 
          className="absolute bottom-0 left-0 w-full h-full" 
          viewBox="0 0 1200 80" 
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M0,80 C200,40 400,40 600,40 C800,40 1000,40 1200,80 L1200,80 L0,80 Z" 
            fill={toColorValue}
          />
          <path 
            d="M0,0 C200,40 400,40 600,40 C800,40 1000,40 1200,0 L1200,0 L0,0 Z" 
            fill={fromColorValue}
          />
        </svg>
      </div>
    );
  }

  if (variant === 'gradient') {
    return (
      <div className={`relative w-full h-12 ${className}`}>
        <div className={`absolute inset-0 bg-gradient-to-b ${fromColor} to-transparent`}></div>
        <div className={`absolute inset-0 bg-gradient-to-t ${toColor} from-transparent`}></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-ethiopian-gold/30 to-transparent"></div>
        </div>
      </div>
    );
  }

  if (variant === 'divider') {
    return (
      <div className={`relative w-full py-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-4 w-full max-w-md">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-ethiopian-gold/20"></div>
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-ethiopian-gold/40"></div>
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-ethiopian-gold/20 animate-ping"></div>
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-200 to-ethiopian-gold/20"></div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
