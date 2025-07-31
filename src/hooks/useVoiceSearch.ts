import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceSearchOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  autoTranslate?: boolean;
  onResult?: (result: VoiceSearchResult) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

interface VoiceSearchResult {
  transcript: string;
  translatedText?: string;
  confidence: number;
  isFinal: boolean;
  detectedLanguage?: string;
}

export function useVoiceSearch({
  language = 'en-US',
  continuous = false,
  interimResults = true,
  autoTranslate = false,
  onResult,
  onError,
  onStart,
  onEnd,
}: VoiceSearchOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;
      
      recognition.onstart = () => {
        setIsListening(true);
        setError('');
        onStart?.();
      };

      recognition.onresult = async (event) => {
        const lastResult = event.results[event.results.length - 1];
        const newTranscript = lastResult[0].transcript;
        
        setTranscript(newTranscript);
        
        const result: VoiceSearchResult = {
          transcript: newTranscript,
          confidence: lastResult[0].confidence,
          isFinal: lastResult.isFinal,
          detectedLanguage: language,
        };

        // Auto-translate if needed and result is final
        if (autoTranslate && lastResult.isFinal && language !== 'en-US') {
          setIsTranslating(true);
          try {
            const translated = await translateText(newTranscript, language, 'en');
            result.translatedText = translated;
            setTranslatedText(translated);
          } catch (err) {
            console.error('Translation failed:', err);
          }
          setIsTranslating(false);
        }

        onResult?.(result);
      };

      recognition.onerror = (event) => {
        const errorMessage = `Speech recognition error: ${event.error}`;
        setError(errorMessage);
        onError?.(errorMessage);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        onEnd?.();
      };
    } else {
      setIsSupported(false);
    }

    // Initialize speech synthesis
    if (window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, continuous, interimResults, autoTranslate, onResult, onError, onStart, onEnd]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    
    setTranscript('');
    setTranslatedText('');
    setError('');
    
    try {
      recognitionRef.current.start();
    } catch (err) {
      setError('Failed to start speech recognition');
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    
    recognitionRef.current.stop();
  }, [isListening]);

  const speakText = useCallback((text: string, lang: string = 'en-US') => {
    if (!synthRef.current) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    synthRef.current.speak(utterance);
  }, []);

  const translateText = useCallback(async (
    text: string, 
    sourceLang: string, 
    targetLang: string = 'en'
  ): Promise<string> => {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          sourceLang,
          targetLang,
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }, []);

  return {
    isSupported,
    isListening,
    isTranslating,
    transcript,
    translatedText,
    detectedLanguage,
    error,
    startListening,
    stopListening,
    speakText,
    translateText,
  };
}

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}