import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Palette, Sparkles } from 'lucide-react';
import { useLocalSeasonalTheme, seasonalThemes } from './LocalSeasonalTheme';

export function LocalSeasonalThemeSelector() {
  const { currentTheme, isSeasonalMode, setTheme, toggleSeasonalMode } = useLocalSeasonalTheme();

  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-ethiopian-gold" />
        <span className="font-medium text-gray-700">Seasonal Themes</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Switch
          checked={isSeasonalMode}
          onCheckedChange={toggleSeasonalMode}
          className="data-[state=checked]:bg-ethiopian-gold"
        />
        <span className="text-sm text-gray-600">
          {isSeasonalMode ? 'On' : 'Off'}
        </span>
      </div>

      {isSeasonalMode && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Palette className="h-4 w-4" />
              {currentTheme.name}
              <Badge variant="secondary" className="ml-1">
                {currentTheme.decorations.primary}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="p-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Choose Theme</p>
              <DropdownMenuSeparator />
            </div>
            {Object.entries(seasonalThemes).map(([id, theme]) => (
              <DropdownMenuItem
                key={id}
                onClick={() => setTheme(id)}
                className={`flex items-center justify-between cursor-pointer ${
                  currentTheme.id === id ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{theme.decorations.primary}</span>
                  <span className="text-sm">{theme.name}</span>
                </div>
                {currentTheme.id === id && (
                  <Badge variant="secondary" className="text-xs">
                    ✓
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}