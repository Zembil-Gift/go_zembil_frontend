import React, { createContext, useContext, useState, useEffect } from 'react';
import { format } from 'date-fns';

export interface SeasonalTheme {
  id: string;
  name: string;
  displayName: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  decorations: string[];
  icons: string[];
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
}

export const seasonalThemes: SeasonalTheme[] = [
  {
    id: 'default',
    name: 'default',
    displayName: 'Classic goZembil',
    description: 'Our warm Ethiopian colors',
    colors: {
      primary: '#FDCB2D',
      secondary: '#1C3A2D',
      accent: '#E94E1B',
      background: '#F8F8F8',
      text: '#222222',
    },
    decorations: [],
    icons: ['🎁', '❤️'],
    isActive: true,
  },
  {
    id: 'meskel',
    name: 'meskel',
    displayName: 'Meskel Festival',
    description: 'Celebrating the Finding of the True Cross',
    colors: {
      primary: '#FFD700',
      secondary: '#8B4513',
      accent: '#FF6B35',
      background: '#FFF8DC',
      text: '#4A4A4A',
    },
    decorations: ['✝️', '🌼', '🔥'],
    icons: ['✨', '🙏', '💐'],
    isActive: false,
    startDate: new Date(new Date().getFullYear(), 8, 27), // September 27
    endDate: new Date(new Date().getFullYear(), 9, 5), // October 5
  },
  {
    id: 'timkat',
    name: 'timkat',
    displayName: 'Timkat Celebration',
    description: 'Ethiopian Epiphany - Baptism of Jesus',
    colors: {
      primary: '#4A90E2',
      secondary: '#FFFFFF',
      accent: '#87CEEB',
      background: '#F0F8FF',
      text: '#2F4F4F',
    },
    decorations: ['💧', '🕊️', '⛪'],
    icons: ['🌊', '✨', '🙏'],
    isActive: false,
    startDate: new Date(new Date().getFullYear(), 0, 19), // January 19
    endDate: new Date(new Date().getFullYear(), 0, 21), // January 21
  },
  {
    id: 'enkutatash',
    name: 'enkutatash',
    displayName: 'Enkutatash (Ethiopian New Year)',
    description: 'New Year celebration with yellow daisies',
    colors: {
      primary: '#FFD700',
      secondary: '#228B22',
      accent: '#FF69B4',
      background: '#F5FFFA',
      text: '#2F4F4F',
    },
    decorations: ['🌼', '🌻', '🌸'],
    icons: ['🎊', '🎉', '✨'],
    isActive: false,
    startDate: new Date(new Date().getFullYear(), 8, 11), // September 11
    endDate: new Date(new Date().getFullYear(), 8, 13), // September 13
  },
  {
    id: 'genna',
    name: 'genna',
    displayName: 'Genna (Ethiopian Christmas)',
    description: 'Orthodox Christmas celebration',
    colors: {
      primary: '#DC143C',
      secondary: '#228B22',
      accent: '#FFD700',
      background: '#FFF8F8',
      text: '#2F4F4F',
    },
    decorations: ['🎄', '⭐', '🕯️'],
    icons: ['🎁', '❄️', '✨'],
    isActive: false,
    startDate: new Date(new Date().getFullYear(), 0, 7), // January 7
    endDate: new Date(new Date().getFullYear(), 0, 9), // January 9
  },
  {
    id: 'easter',
    name: 'easter',
    displayName: 'Ethiopian Easter (Fasika)',
    description: 'Resurrection celebration',
    colors: {
      primary: '#9370DB',
      secondary: '#FFD700',
      accent: '#FF69B4',
      background: '#F8F8FF',
      text: '#4B0082',
    },
    decorations: ['🐣', '🌷', '🌺'],
    icons: ['✨', '🌸', '🙏'],
    isActive: false,
  },
  {
    id: 'irreecha',
    name: 'irreecha',
    displayName: 'Irreecha Festival',
    description: 'Oromo thanksgiving celebration',
    colors: {
      primary: '#32CD32',
      secondary: '#FFD700',
      accent: '#FF4500',
      background: '#F0FFF0',
      text: '#2F4F4F',
    },
    decorations: ['🌾', '🌻', '💧'],
    icons: ['🙏', '✨', '🌿'],
    isActive: false,
    startDate: new Date(new Date().getFullYear(), 9, 1), // October 1
    endDate: new Date(new Date().getFullYear(), 9, 3), // October 3
  },
  {
    id: 'winter',
    name: 'winter',
    displayName: 'Winter Warmth',
    description: 'Cozy gifts for cold diaspora winters',
    colors: {
      primary: '#4682B4',
      secondary: '#F5F5DC',
      accent: '#CD853F',
      background: '#F0F8FF',
      text: '#2F4F4F',
    },
    decorations: ['❄️', '🧣', '☕'],
    icons: ['🫖', '📚', '🕯️'],
    isActive: false,
    startDate: new Date(new Date().getFullYear(), 11, 21), // December 21
    endDate: new Date(new Date().getFullYear() + 1, 2, 20), // March 20
  },
  {
    id: 'summer',
    name: 'summer',
    displayName: 'Summer Celebration',
    description: 'Bright and vibrant summer gifts',
    colors: {
      primary: '#FF6347',
      secondary: '#32CD32',
      accent: '#FFD700',
      background: '#FFFAF0',
      text: '#2F4F4F',
    },
    decorations: ['🌞', '🌺', '🦋'],
    icons: ['🌻', '🍯', '🌿'],
    isActive: false,
    startDate: new Date(new Date().getFullYear(), 5, 21), // June 21
    endDate: new Date(new Date().getFullYear(), 8, 20), // September 20
  },
];

interface SeasonalThemeContextType {
  currentTheme: SeasonalTheme;
  availableThemes: SeasonalTheme[];
  setTheme: (themeId: string) => void;
  isSeasonalMode: boolean;
  toggleSeasonalMode: () => void;
  getActiveSeasonalTheme: () => SeasonalTheme | null;
}

const SeasonalThemeContext = createContext<SeasonalThemeContextType | undefined>(undefined);

export function SeasonalThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<SeasonalTheme>(seasonalThemes[0]);
  const [isSeasonalMode, setIsSeasonalMode] = useState(false);

  // Determine if current date falls within any seasonal theme period
  const getActiveSeasonalTheme = (): SeasonalTheme | null => {
    const now = new Date();
    const currentDate = format(now, 'MM-dd');
    
    for (const theme of seasonalThemes) {
      if (theme.id === 'default') continue;
      
      if (theme.startDate && theme.endDate) {
        const startDate = format(theme.startDate, 'MM-dd');
        const endDate = format(theme.endDate, 'MM-dd');
        
        // Handle year-crossing seasons (like winter)
        if (startDate > endDate) {
          if (currentDate >= startDate || currentDate <= endDate) {
            return theme;
          }
        } else {
          if (currentDate >= startDate && currentDate <= endDate) {
            return theme;
          }
        }
      }
    }
    
    return null;
  };

  // Auto-activate seasonal themes
  useEffect(() => {
    const activeSeasonalTheme = getActiveSeasonalTheme();
    const savedMode = localStorage.getItem('goZembil_seasonalMode');
    const savedTheme = localStorage.getItem('goZembil_currentTheme');
    
    // Initialize seasonal mode
    if (savedMode !== null) {
      setIsSeasonalMode(savedMode === 'true');
    } else if (activeSeasonalTheme) {
      setIsSeasonalMode(true);
      localStorage.setItem('goZembil_seasonalMode', 'true');
    }
    
    // Set appropriate theme
    if (savedTheme && savedMode === 'true') {
      const savedThemeObj = seasonalThemes.find(t => t.id === savedTheme);
      if (savedThemeObj) {
        setCurrentTheme(savedThemeObj);
      }
    } else if (isSeasonalMode && activeSeasonalTheme) {
      setCurrentTheme(activeSeasonalTheme);
    } else {
      setCurrentTheme(seasonalThemes[0]); // Default theme
    }
  }, [isSeasonalMode]);

  // Apply theme CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--seasonal-primary', currentTheme.colors.primary);
    root.style.setProperty('--seasonal-secondary', currentTheme.colors.secondary);
    root.style.setProperty('--seasonal-accent', currentTheme.colors.accent);
    root.style.setProperty('--seasonal-background', currentTheme.colors.background);
    root.style.setProperty('--seasonal-text', currentTheme.colors.text);
    
    // Update body class for theme-specific styling
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${currentTheme.id}`);
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    const theme = seasonalThemes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem('goZembil_currentTheme', themeId);
    }
  };

  const toggleSeasonalMode = () => {
    const newMode = !isSeasonalMode;
    setIsSeasonalMode(newMode);
    localStorage.setItem('goZembil_seasonalMode', newMode.toString());
    
    if (newMode) {
      const activeTheme = getActiveSeasonalTheme();
      if (activeTheme) {
        setCurrentTheme(activeTheme);
      }
    } else {
      setCurrentTheme(seasonalThemes[0]); // Default theme
    }
  };

  return (
    <SeasonalThemeContext.Provider value={{
      currentTheme,
      availableThemes: seasonalThemes,
      setTheme,
      isSeasonalMode,
      toggleSeasonalMode,
      getActiveSeasonalTheme,
    }}>
      {children}
    </SeasonalThemeContext.Provider>
  );
}

export function useSeasonalTheme() {
  const context = useContext(SeasonalThemeContext);
  if (context === undefined) {
    throw new Error('useSeasonalTheme must be used within a SeasonalThemeProvider');
  }
  return context;
}