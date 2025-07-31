import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, Languages, Loader2, X } from 'lucide-react';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

interface VoiceSearchButtonProps {
  onSearchQuery?: (query: string) => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'am-ET', name: 'አማርኛ (Amharic)', flag: '🇪🇹' },
  { code: 'or-ET', name: 'Afaan Oromoo', flag: '🇪🇹' },
  { code: 'ti-ET', name: 'ትግርኛ (Tigrinya)', flag: '🇪🇹' },
];

export function VoiceSearchButton({ 
  onSearchQuery, 
  className, 
  size = 'default',
  variant = 'outline' 
}: VoiceSearchButtonProps) {
  const [, navigate] = useLocation();
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const {
    isSupported,
    isListening,
    isTranslating,
    transcript,
    translatedText,
    detectedLanguage,
    startListening,
    stopListening,
    speakText,
    translateText,
  } = useVoiceSearch({
    language: selectedLanguage,
    continuous: false,
    autoTranslate: selectedLanguage !== 'en-US',
    onResult: (result) => {
      console.log('Voice search result:', result);
      const searchQuery = result.translatedText || result.transcript;
      if (searchQuery && searchQuery.trim()) {
        onSearchQuery?.(searchQuery);
        // Navigate to search results
        navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
        setShowTranscript(false);
      }
    },
    onError: (error) => {
      console.error('Voice search error:', error);
      setShowTranscript(false);
    }
  });

  useEffect(() => {
    if (transcript && isListening) {
      setShowTranscript(true);
    }
  }, [transcript, isListening]);

  const handleVoiceSearch = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    setShowLanguageSelector(false);
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage);

  const sizeClasses = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  if (!isSupported) {
    return null; // Don't show the button if voice search isn't supported
  }

  return (
    <div className="relative">
      {/* Language Selector */}
      {showLanguageSelector && (
        <>
          {/* Backdrop overlay for mobile */}
          <div 
            className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-sm md:hidden"
            onClick={() => setShowLanguageSelector(false)}
          />
          
          {/* Language selector dropdown */}
          <Card className={cn(
            "absolute z-[100] shadow-xl border border-gray-200 bg-white backdrop-blur-sm",
            // Desktop positioning
            "hidden md:block bottom-full mb-2 right-0 w-64",
            // Mobile positioning - center screen
            "md:relative"
          )}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-800">Select Language</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLanguageSelector(false)}
                  className="h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {SUPPORTED_LANGUAGES.map((language) => (
                  <Button
                    key={language.code}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-auto p-3 text-left transition-all duration-200 rounded-lg",
                      selectedLanguage === language.code 
                        ? 'bg-ethiopian-gold hover:bg-ethiopian-gold/90 text-white shadow-sm' 
                        : 'hover:bg-gray-50 text-gray-700'
                    )}
                    onClick={() => handleLanguageSelect(language.code)}
                  >
                    <span className="mr-3 text-base">{language.flag}</span>
                    <span className="text-sm font-medium">{language.name}</span>
                    {selectedLanguage === language.code && (
                      <span className="ml-auto text-white">✓</span>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Mobile-specific dropdown */}
          <Card className={cn(
            "fixed z-[100] shadow-xl border border-gray-200 bg-white backdrop-blur-sm",
            "md:hidden bottom-20 left-4 right-4 max-w-sm mx-auto rounded-xl"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base text-gray-800">Choose Voice Language</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLanguageSelector(false)}
                  className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {SUPPORTED_LANGUAGES.map((language) => (
                  <Button
                    key={language.code}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-auto p-4 text-left transition-all duration-200 rounded-xl",
                      selectedLanguage === language.code 
                        ? 'bg-ethiopian-gold hover:bg-ethiopian-gold/90 text-white shadow-md' 
                        : 'hover:bg-gray-50 text-gray-700 border border-gray-100'
                    )}
                    onClick={() => handleLanguageSelect(language.code)}
                  >
                    <span className="mr-4 text-lg">{language.flag}</span>
                    <span className="text-base font-medium">{language.name}</span>
                    {selectedLanguage === language.code && (
                      <span className="ml-auto text-white text-lg">✓</span>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Transcript Display */}
      {showTranscript && (transcript || translatedText) && (
        <Card className="absolute bottom-full mb-2 right-0 z-40 w-80 max-w-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Voice Input</span>
                {detectedLanguage && (
                  <Badge variant="secondary" className="text-xs">
                    {detectedLanguage.toUpperCase()}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTranscript(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {transcript && (
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-1">Original:</p>
                <p className="text-sm bg-gray-50 p-2 rounded">
                  {transcript}
                </p>
                {transcript && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speakText(transcript, selectedLanguage)}
                    className="mt-1 h-6 px-2 text-xs"
                  >
                    <Volume2 className="h-3 w-3 mr-1" />
                    Replay
                  </Button>
                )}
              </div>
            )}

            {translatedText && translatedText !== transcript && (
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-1">Translation:</p>
                <p className="text-sm bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                  {translatedText}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => speakText(translatedText, 'en-US')}
                  className="mt-1 h-6 px-2 text-xs"
                >
                  <Volume2 className="h-3 w-3 mr-1" />
                  Listen
                </Button>
              </div>
            )}

            {isTranslating && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Translating...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Voice Button with Language Indicator */}
      <div className="flex items-center gap-1">
        <Button
          variant={variant}
          size="icon"
          onClick={handleVoiceSearch}
          disabled={isTranslating}
          className={cn(
            'transition-all duration-200',
            isListening && 'bg-red-500 hover:bg-red-600 text-white animate-pulse',
            sizeClasses[size],
            className
          )}
          title={`Voice search in ${currentLanguage?.name}`}
        >
          {isListening ? (
            <MicOff className={iconSizes[size]} />
          ) : (
            <Mic className={iconSizes[size]} />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLanguageSelector(!showLanguageSelector)}
          className="px-2 h-6 text-xs"
          title="Select language"
        >
          <Languages className="h-3 w-3 mr-1" />
          <span className="hidden sm:inline">
            {currentLanguage?.flag}
          </span>
        </Button>
      </div>

      {/* Listening Indicator */}
      {isListening && (
        <div className="absolute -top-1 -right-1">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
          <div className="w-3 h-3 bg-red-500 rounded-full absolute top-0"></div>
        </div>
      )}
    </div>
  );
}

export default VoiceSearchButton;