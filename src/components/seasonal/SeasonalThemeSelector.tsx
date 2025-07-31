import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Palette, Sparkles, X } from 'lucide-react';
import { useSeasonalTheme } from './SeasonalThemeProvider';

interface SeasonalThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SeasonalThemeSelector({ isOpen, onClose }: SeasonalThemeSelectorProps) {
  const {
    currentTheme,
    availableThemes,
    setTheme,
    isSeasonalMode,
    toggleSeasonalMode,
    getActiveSeasonalTheme,
  } = useSeasonalTheme();

  const activeSeasonalTheme = getActiveSeasonalTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg">
                      <Palette className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Seasonal Themes</h2>
                      <p className="text-gray-600">Celebrate Ethiopian culture and seasons</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-6 w-6" />
                  </Button>
                </div>
                
                {/* Seasonal Mode Toggle */}
                <div className="mt-4 flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <div>
                      <h3 className="font-medium text-gray-900">Seasonal Mode</h3>
                      <p className="text-sm text-gray-600">
                        {activeSeasonalTheme 
                          ? `${activeSeasonalTheme.displayName} is currently active`
                          : 'Automatically switch themes for Ethiopian celebrations'
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isSeasonalMode}
                    onCheckedChange={toggleSeasonalMode}
                  />
                </div>
              </div>
              
              {/* Theme Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableThemes.map((theme) => {
                    const isActive = currentTheme.id === theme.id;
                    const isCurrentSeasonal = activeSeasonalTheme?.id === theme.id;
                    
                    return (
                      <motion.div
                        key={theme.id}
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card 
                          className={`cursor-pointer transition-all duration-200 ${
                            isActive ? 'ring-2 ring-amber-400 shadow-lg' : 'hover:shadow-md'
                          }`}
                          onClick={() => setTheme(theme.id)}
                        >
                          <CardContent className="p-4">
                            {/* Theme Preview */}
                            <div 
                              className="h-20 rounded-lg mb-3 relative overflow-hidden"
                              style={{
                                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center gap-2">
                                {theme.decorations.slice(0, 3).map((decoration, index) => (
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
                                      delay: index * 0.2,
                                    }}
                                  >
                                    {decoration}
                                  </motion.span>
                                ))}
                              </div>
                              
                              {/* Active indicator */}
                              {isActive && (
                                <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                              )}
                              
                              {/* Seasonal indicator */}
                              {isCurrentSeasonal && (
                                <div className="absolute top-2 left-2 px-2 py-1 bg-amber-400 text-white text-xs rounded-full font-medium">
                                  Active Now
                                </div>
                              )}
                            </div>
                            
                            {/* Theme Info */}
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {theme.displayName}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                                {theme.description}
                              </p>
                              
                              {/* Color Palette */}
                              <div className="flex gap-1">
                                {Object.values(theme.colors).slice(0, 3).map((color, index) => (
                                  <div
                                    key={index}
                                    className="w-4 h-4 rounded-full border border-gray-200"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Current theme: <span className="font-medium">{currentTheme.displayName}</span>
                  </p>
                  <Button onClick={onClose}>
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function SeasonalThemeButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentTheme, isSeasonalMode, getActiveSeasonalTheme } = useSeasonalTheme();
  
  const activeSeasonalTheme = getActiveSeasonalTheme();
  const hasActiveSeason = activeSeasonalTheme && isSeasonalMode;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`relative transition-all duration-200 ${
          hasActiveSeason ? 'text-amber-600 hover:text-amber-700' : 'hover:text-amber-600'
        }`}
        title={hasActiveSeason ? `${activeSeasonalTheme.displayName} theme active` : 'Change theme'}
      >
        <Palette className="h-5 w-5" />
        {hasActiveSeason && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
        )}
      </Button>
      
      <SeasonalThemeSelector isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}