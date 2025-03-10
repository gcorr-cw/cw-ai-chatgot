'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { MicrophoneIcon } from '@/components/icons-microphone'

// Define the SpeechRecognition interface
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  error: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
  };
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onstart: () => void;
  onspeechend: () => void;
  onnomatch: () => void;
  onaudiostart: () => void;
  onaudioend: () => void;
  onsoundstart: () => void;
  onsoundend: () => void;
  onspeechstart: () => void;
}

// Add the global types
declare global {
  interface Window {
    SpeechRecognition: undefined | {
      new (): SpeechRecognitionInterface;
    };
    webkitSpeechRecognition: undefined | {
      new (): SpeechRecognitionInterface;
    };
  }
}

// Create a type for the component props
interface SpeechRecognitionProps {
  onTranscript: (text: string) => void
  isLoading: boolean
}

const SpeechRecognitionButton: React.FC<SpeechRecognitionProps> = ({
  onTranscript,
  isLoading
}) => {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const maxListeningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  
  // Maximum listening duration (10 minutes) as a safety measure
  const MAX_LISTENING_TIME = 600000
  
  // Inactivity timeout (15 seconds)
  const INACTIVITY_TIMEOUT = 15000

  // Function to create a new recognition instance
  const createRecognitionInstance = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return null;
    
    const instance = new SpeechRecognitionClass();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = 'en-US';
    instance.maxAlternatives = 1;
    
    return instance;
  }, []);
  
  // Function to reset the inactivity timer
  const resetInactivityTimer = useCallback(() => {
    // Update last activity timestamp
    lastActivityRef.current = Date.now();
    
    // Clear existing timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    
    // Set new timeout
    inactivityTimeoutRef.current = setTimeout(() => {
      const currentTime = Date.now();
      const timeSinceLastActivity = currentTime - lastActivityRef.current;
      
      // If it's been more than the inactivity timeout since the last activity
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        console.log(`Stopping due to inactivity (${timeSinceLastActivity}ms)`);
        forceStopRecognition();
      }
    }, INACTIVITY_TIMEOUT);
  }, []);

  // Force stop function that ensures recognition is stopped
  const forceStopRecognition = useCallback(() => {
    console.log('Force stopping recognition');
    
    // Clear any timeouts
    if (maxListeningTimeoutRef.current) {
      clearTimeout(maxListeningTimeoutRef.current);
      maxListeningTimeoutRef.current = null;
    }
    
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    
    // Stop current recognition instance if it exists
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = (() => {}) as any; // Replace with empty function instead of null
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
    
    // Force state update
    setIsListening(false);
  }, []);

  // Start listening function
  const startListening = useCallback(() => {
    if (isLoading) return;
    
    console.log('Starting speech recognition...');
    
    // Create a new instance each time
    const instance = createRecognitionInstance();
    if (!instance) {
      console.error('Speech recognition not supported');
      setIsSupported(false);
      return;
    }
    
    // Set up event handlers
    instance.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      
      // Initialize inactivity timer
      resetInactivityTimer();
      
      // Safety timeout
      maxListeningTimeoutRef.current = setTimeout(() => {
        console.log('Max listening time reached');
        forceStopRecognition();
      }, MAX_LISTENING_TIME);
    };
    
    instance.onresult = (event: SpeechRecognitionEvent) => {
      // Reset inactivity timer when we get any results
      resetInactivityTimer();
      
      let finalTranscript = '';
      
      // Process results
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }
      
      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };
    
    instance.onerror = (event: SpeechRecognitionEvent) => {
      console.error('Speech recognition error:', event.error);
      
      // Only stop on critical errors
      if (event.error !== 'no-speech') {
        forceStopRecognition();
      }
    };
    
    instance.onspeechend = () => {
      console.log('Speech ended, waiting for inactivity timeout');
      // When speech ends, we don't immediately stop - we wait for the inactivity timeout
      resetInactivityTimer();
    };
    
    instance.onend = () => {
      console.log('Speech recognition ended');
      
      // If we're still supposed to be listening and the instance hasn't been nullified,
      // restart the recognition
      if (isListening && recognitionRef.current === instance) {
        try {
          console.log('Restarting recognition after it ended unexpectedly');
          instance.start();
          resetInactivityTimer();
        } catch (error) {
          console.error('Failed to restart recognition:', error);
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };
    
    // Store the instance
    recognitionRef.current = instance;
    
    // Start recognition
    try {
      instance.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      forceStopRecognition();
    }
  }, [isLoading, createRecognitionInstance, forceStopRecognition, onTranscript, isListening, resetInactivityTimer]);

  // Handle button click
  const handleButtonClick = useCallback(() => {
    console.log('Button clicked, isListening:', isListening);
    
    if (isListening) {
      forceStopRecognition();
    } else {
      startListening();
    }
  }, [isListening, startListening, forceStopRecognition]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, cleaning up');
      forceStopRecognition();
    };
  }, [forceStopRecognition]);

  if (!isSupported) {
    return null; // Don't render if not supported
  }

  return (
    <Button
      ref={buttonRef}
      variant="ghost"
      disabled={isLoading}
      onClick={handleButtonClick}
      className={`rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200 ${isListening ? 'bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-800/30' : ''}`}
      type="button"
      aria-label={isListening ? 'Stop listening' : 'Start speech recognition'}
      title={isListening ? 'Stop listening' : 'Start speech recognition'}
    >
      <MicrophoneIcon size={18} />
    </Button>
  )
}

export default SpeechRecognitionButton
