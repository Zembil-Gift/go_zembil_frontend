import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Globe, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface VoiceSearchProps {
  onSearch: (query: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'am-ET', name: 'አማርኛ (Amharic)', flag: '🇪🇹' },
  { code: 'om-ET', name: 'Oromiffa', flag: '🇪🇹' },
  { code: 'ti-ET', name: 'ትግርኛ (Tigrinya)', flag: '🇪🇹' },
  { code: 'ar-SA', name: 'العربية (Arabic)', flag: '🇸🇦' },
  { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' }
];

export default function VoiceSearch({ onSearch, isOpen, onClose }: VoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = selectedLanguage;

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setTranscript(transcript);

        if (event.results[current].isFinal) {
          handleTranslation(transcript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        setError(`Voice recognition error: ${event.error}`);
        setIsListening(false);
      };
    }

    synthRef.current = window.speechSynthesis;

    // Load search history from localStorage
    const history = localStorage.getItem('voiceSearchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, [selectedLanguage]);

  const handleTranslation = async (text: string) => {
    if (selectedLanguage === 'en-US') {
      setTranslatedText(text);
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceLang: selectedLanguage,
          targetLang: 'en'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTranslatedText(data.translatedText);
      } else {
        setTranslatedText(text); // Fallback to original text
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedText(text); // Fallback to original text
    }
    setIsTranslating(false);
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      setError('Voice recognition not supported in this browser');
      return;
    }

    setError('');
    setTranscript('');
    setTranslatedText('');
    setIsListening(true);
    
    recognitionRef.current.lang = selectedLanguage;
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleSearch = () => {
    const searchQuery = translatedText || transcript;
    if (searchQuery.trim()) {
      onSearch(searchQuery);
      
      // Add to search history
      const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('voiceSearchHistory', JSON.stringify(newHistory));
      
      onClose();
    }
  };

  const playTranscript = () => {
    if (synthRef.current && transcript) {
      const utterance = new SpeechSynthesisUtterance(transcript);
      utterance.lang = selectedLanguage;
      synthRef.current.speak(utterance);
    }
  };

  const handleHistorySearch = (query: string) => {
    onSearch(query);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Multilingual Voice Search
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Language Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Language
            </label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Voice Recording Interface */}
          <div className="text-center mb-6">
            <Button
              onClick={isListening ? stopListening : startListening}
              className={`w-20 h-20 rounded-full transition-all duration-300 ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-teal-600 hover:bg-teal-700'
              }`}
              disabled={!recognitionRef.current}
            >
              {isListening ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </Button>
            <p className="mt-2 text-sm text-gray-600">
              {isListening ? 'Listening... Speak now' : 'Click to start voice search'}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Transcript Display */}
          {transcript && (
            <div className="mb-4 p-4 bg-gray-50 rounded-md">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">Transcript:</h3>
                <Button variant="ghost" size="sm" onClick={playTranscript}>
                  <Volume2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-gray-700">{transcript}</p>
            </div>
          )}

          {/* Translation Display */}
          {(translatedText || isTranslating) && selectedLanguage !== 'en-US' && (
            <div className="mb-4 p-4 bg-blue-50 rounded-md">
              <h3 className="font-medium text-gray-900 mb-2">English Translation:</h3>
              {isTranslating ? (
                <p className="text-gray-600">Translating...</p>
              ) : (
                <p className="text-gray-700">{translatedText}</p>
              )}
            </div>
          )}

          {/* Search Button */}
          {(transcript || translatedText) && (
            <div className="mb-6">
              <Button
                onClick={handleSearch}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                disabled={isTranslating}
              >
                Search Products
              </Button>
            </div>
          )}

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Recent Voice Searches:</h3>
              <div className="space-y-2">
                {searchHistory.slice(0, 5).map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistorySearch(query)}
                    className="w-full text-left p-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}