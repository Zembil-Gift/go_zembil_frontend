import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface SeasonalTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  decorations: {
    primary: string;
    secondary: string;
  };
}

export const seasonalThemes: Record<string, SeasonalTheme> = {
  default: {
    id: 'default',
    name: 'Default',
    colors: {
      primary: '#FDCB2D',
      secondary: '#1C3A2D',
      accent: '#E94E1B',
      background: '#F8F8F8',
      text: '#222222',
    },
    decorations: {
      primary: '🎁',
      secondary: '✨',
    },
  },
  meskel: {
    id: 'meskel',
    name: 'Meskel Festival',
    colors: {
      primary: '#FFD700',
      secondary: '#8B4513',
      accent: '#FF6B35',
      background: '#FFF8DC',
      text: '#4A4A4A',
    },
    decorations: {
      primary: '✝️',
      secondary: '🌼',
    },
  },
  timkat: {
    id: 'timkat',
    name: 'Timkat (Epiphany)',
    colors: {
      primary: '#4A90E2',
      secondary: '#FFFFFF',
      accent: '#87CEEB',
      background: '#F0F8FF',
      text: '#2F4F4F',
    },
    decorations: {
      primary: '💧',
      secondary: '🕊️',
    },
  },
  enkutatash: {
    id: 'enkutatash',
    name: 'Enkutatash (New Year)',
    colors: {
      primary: '#FFD700',
      secondary: '#228B22',
      accent: '#FF69B4',
      background: '#F5FFFA',
      text: '#2F4F4F',
    },
    decorations: {
      primary: '🌸',
      secondary: '🌿',
    },
  },
  genna: {
    id: 'genna',
    name: 'Genna (Christmas)',
    colors: {
      primary: '#DC143C',
      secondary: '#228B22',
      accent: '#FFD700',
      background: '#FFF8F8',
      text: '#2F4F4F',
    },
    decorations: {
      primary: '🎄',
      secondary: '⭐',
    },
  },
  easter: {
    id: 'easter',
    name: 'Ethiopian Easter',
    colors: {
      primary: '#9370DB',
      secondary: '#FFD700',
      accent: '#FF69B4',
      background: '#F8F8FF',
      text: '#4B0082',
    },
    decorations: {
      primary: '🥚',
      secondary: '🐰',
    },
  },
  irreecha: {
    id: 'irreecha',
    name: 'Irreecha Festival',
    colors: {
      primary: '#32CD32',
      secondary: '#FFD700',
      accent: '#FF4500',
      background: '#F0FFF0',
      text: '#2F4F4F',
    },
    decorations: {
      primary: '🌾',
      secondary: '🌻',
    },
  },
  winter: {
    id: 'winter',
    name: 'Winter Season',
    colors: {
      primary: '#4682B4',
      secondary: '#F5F5DC',
      accent: '#CD853F',
      background: '#F0F8FF',
      text: '#2F4F4F',
    },
    decorations: {
      primary: '❄️',
      secondary: '🏔️',
    },
  },
  summer: {
    id: 'summer',
    name: 'Summer Season',
    colors: {
      primary: '#FF6347',
      secondary: '#32CD32',
      accent: '#FFD700',
      background: '#FFFAF0',
      text: '#2F4F4F',
    },
    decorations: {
      primary: '☀️',
      secondary: '🌺',
    },
  },
};

interface LocalSeasonalContextType {
  currentTheme: SeasonalTheme;
  isSeasonalMode: boolean;
  setTheme: (themeId: string) => void;
  toggleSeasonalMode: () => void;
}

const LocalSeasonalContext = createContext<LocalSeasonalContextType | undefined>(undefined);

interface LocalSeasonalProviderProps {
  children: ReactNode;
}

export function LocalSeasonalProvider({ children }: LocalSeasonalProviderProps) {
  const [currentThemeId, setCurrentThemeId] = useState('default');
  const [isSeasonalMode, setIsSeasonalMode] = useState(false);

  const currentTheme = seasonalThemes[currentThemeId] || seasonalThemes.default;

  const setTheme = (themeId: string) => {
    setCurrentThemeId(themeId);
  };

  const toggleSeasonalMode = () => {
    setIsSeasonalMode(!isSeasonalMode);
  };

  return (
    <LocalSeasonalContext.Provider value={{
      currentTheme,
      isSeasonalMode,
      setTheme,
      toggleSeasonalMode,
    }}>
      {children}
    </LocalSeasonalContext.Provider>
  );
}

export function useLocalSeasonalTheme() {
  const context = useContext(LocalSeasonalContext);
  if (context === undefined) {
    throw new Error('useLocalSeasonalTheme must be used within a LocalSeasonalProvider');
  }
  return context;
}