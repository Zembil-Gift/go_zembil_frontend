import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, X, Loader2, Volume2, Languages } from 'lucide-react';
import VoiceSearchButton from '@/components/VoiceSearchButton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SearchResult {
  originalQuery: string;
  translatedQuery?: string;
  detectedLanguage?: string;
  suggestions?: string[];
}

interface MultilingualSearchProps {
  onSearch?: (query: string, translatedQuery?: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function MultilingualSearch({ 
  onSearch, 
  placeholder = "Search products in any language...",
  className,
  autoFocus = false 
}: MultilingualSearchProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [translatedQuery, setTranslatedQuery] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('goZembil_search_history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    }
  }, []);

  // Save search history to localStorage
  const saveToHistory = (result: SearchResult) => {
    const newHistory = [result, ...searchHistory.slice(0, 9)]; // Keep last 10 searches
    setSearchHistory(newHistory);
    localStorage.setItem('goZembil_search_history', JSON.stringify(newHistory));
  };

  // Translate search query
  const translateQuery = async (text: string) => {
    if (!text.trim() || text === translatedQuery) return;

    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          targetLanguage: 'en',
          sourceLanguage: 'auto',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTranslatedQuery(data.translatedText);
        setDetectedLanguage(data.detectedLanguage);
        setShowTranslation(data.translatedText !== text && data.detectedLanguage !== 'en');
      } else {
        console.warn('Translation service unavailable');
        setTranslatedQuery(text);
        setShowTranslation(false);
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedQuery(text);
      setShowTranslation(false);
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const finalQuery = translatedQuery || query;
    
    // Save to history
    const searchResult: SearchResult = {
      originalQuery: query,
      translatedQuery: translatedQuery !== query ? translatedQuery : undefined,
      detectedLanguage: detectedLanguage || 'en',
    };
    saveToHistory(searchResult);

    // Execute search
    onSearch?.(finalQuery, translatedQuery !== query ? translatedQuery : undefined);
    
    toast({
      title: "Searching...",
      description: `Finding products for "${finalQuery}"`,
    });
  };

  // Handle voice search result
  const handleVoiceSearch = (voiceQuery: string) => {
    setQuery(voiceQuery);
    translateQuery(voiceQuery);
  };

  // Handle query change with auto-translate
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      // Debounce translation
      const timeoutId = setTimeout(() => translateQuery(value), 500);
      return () => clearTimeout(timeoutId);
    } else {
      setTranslatedQuery('');
      setShowTranslation(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setTranslatedQuery('');
    setDetectedLanguage('');
    setShowTranslation(false);
  };

  // Use search from history
  const useHistoryItem = (item: SearchResult) => {
    setQuery(item.originalQuery);
    if (item.translatedQuery) {
      setTranslatedQuery(item.translatedQuery);
      setDetectedLanguage(item.detectedLanguage || '');
      setShowTranslation(true);
    }
  };

  // Speak text using browser TTS
  const speakText = (text: string, language: string = 'en-US') => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* Main Search Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          
          <Input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="pl-12 pr-20 h-12 text-lg border-2 focus:border-primary"
          />

          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {/* Voice Search Button */}
            <VoiceSearchButton
              onSearchQuery={handleVoiceSearch}
              size="sm"
              variant="ghost"
            />

            {/* Clear Button */}
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {/* Search Button */}
            <Button
              type="submit"
              size="sm"
              disabled={!query.trim() || isTranslating}
              className="h-8 px-3"
            >
              {isTranslating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Translation Display */}
      {showTranslation && translatedQuery && (
        <Card className="mt-3 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Translation:</span>
                {detectedLanguage && (
                  <Badge variant="secondary" className="text-xs">
                    {detectedLanguage.toUpperCase()} → EN
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => speakText(translatedQuery, 'en-US')}
                className="h-6 px-2 text-blue-600 hover:text-blue-700"
              >
                <Volume2 className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm text-blue-700 mt-1 font-medium">
              "{translatedQuery}"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search History */}
      {searchHistory.length > 0 && (
        <Card className="mt-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {searchHistory.slice(0, 6).map((item, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => useHistoryItem(item)}
                  className="h-auto py-1 px-2 text-xs text-left justify-start"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{item.originalQuery}</span>
                    {item.translatedQuery && (
                      <span className="text-gray-500 text-xs">
                        → {item.translatedQuery}
                      </span>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MultilingualSearch;