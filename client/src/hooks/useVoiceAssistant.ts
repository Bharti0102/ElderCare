import { useState, useCallback, useEffect, useRef } from 'react';
import { SpeechRecognitionService } from '../services/speechRecognition.service';
import { processVoiceCommand } from '../services/voice.service';
import {
  speakText,
  stopSpeaking,
  getVoiceSettings,
} from '../services/voiceNotification.service';
import { VoiceProcessResponse } from '../types';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface UseVoiceAssistantOptions {
  autoSpeak?: boolean;
  lang?: string;
  continuousMode?: boolean;
  onSuccess?: (result: VoiceProcessResponse) => void;
  onError?: (error: string) => void;
}

export const useVoiceAssistant = (options: UseVoiceAssistantOptions = {}) => {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [lastResult, setLastResult] = useState<VoiceProcessResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  const autoSpeak = options.autoSpeak ?? true;
  const currentLang = options.lang || 'hi-IN';

  // Keep live refs to avoid stale closure state in callbacks
  const transcriptRef = useRef<string>('');
  const isProcessingRef = useRef<boolean>(false);
  const continuousModeRef = useRef<boolean>(!!options.continuousMode);
  const currentLangRef = useRef<string>(currentLang);
  const autoSpeakRef = useRef<boolean>(autoSpeak);
  const optionsRef = useRef(options);

  useEffect(() => {
    continuousModeRef.current = !!options.continuousMode;
    currentLangRef.current = options.lang || 'hi-IN';
    autoSpeakRef.current = options.autoSpeak ?? true;
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    setIsSupported(SpeechRecognitionService.isSupported());
  }, []);

  const handleInterrupt = useCallback(() => {
    stopSpeaking();
    SpeechRecognitionService.stopListening();
    isProcessingRef.current = false;
    setState('idle');
  }, []);

  const handleProcessTranscript = useCallback(
    async (textToProcess: string) => {
      const clean = textToProcess.trim();
      if (!clean || isProcessingRef.current) {
        setState('idle');
        return;
      }

      isProcessingRef.current = true;
      setState('processing');
      setErrorMessage(null);

      try {
        const result = await processVoiceCommand(clean);
        setLastResult(result);
        optionsRef.current.onSuccess?.(result);

        const voiceSettings = getVoiceSettings();
        const speechToRead = result.spokenText || result.reply;

        if (autoSpeakRef.current && voiceSettings.enabled && speechToRead) {
          setState('speaking');
          isProcessingRef.current = false;

          speakText(speechToRead, {
            lang: currentLangRef.current,
            rate: result.voiceSettings?.rate || 0.88,
            onEnd: () => {
              setState('idle');
              // Continuous Hands-Free: automatically reopen mic for user's next turn
              if (continuousModeRef.current) {
                setTimeout(() => {
                  startListening(currentLangRef.current);
                }, 500);
              }
            },
            onError: () => {
              setState('idle');
            },
          });
        } else {
          isProcessingRef.current = false;
          setState('idle');
        }
      } catch (err: any) {
        isProcessingRef.current = false;
        const msg = err.message || 'Failed to process voice request.';
        setErrorMessage(msg);
        setState('error');
        optionsRef.current.onError?.(msg);
      }
    },
    []
  );

  const startListening = useCallback(
    (lang?: string) => {
      stopSpeaking();
      setErrorMessage(null);
      setTranscript('');
      transcriptRef.current = '';
      isProcessingRef.current = false;

      const effectiveLang = lang || currentLangRef.current || 'hi-IN';

      const started = SpeechRecognitionService.startListening({
        lang: effectiveLang,
        onStart: () => {
          setState('listening');
        },
        onResult: (capturedTranscript, isFinal) => {
          setTranscript(capturedTranscript);
          transcriptRef.current = capturedTranscript;

          if (isFinal) {
            SpeechRecognitionService.stopListening();
            handleProcessTranscript(capturedTranscript);
          }
        },
        onError: (err) => {
          setErrorMessage(err);
          setState('error');
          optionsRef.current.onError?.(err);
        },
        onEnd: () => {
          if (!isProcessingRef.current) {
            const pending = transcriptRef.current.trim();
            if (pending) {
              handleProcessTranscript(pending);
            } else {
              setState((prev) => (prev === 'listening' ? 'idle' : prev));
            }
          }
        },
      });

      if (!started && !SpeechRecognitionService.isSupported()) {
        setIsSupported(false);
        setErrorMessage('Speech recognition is not supported in this browser. Please type directly.');
        setState('error');
      }
    },
    [handleProcessTranscript]
  );

  const stopListening = useCallback(() => {
    SpeechRecognitionService.stopListening();
    const pending = transcriptRef.current.trim();
    if (pending && !isProcessingRef.current) {
      handleProcessTranscript(pending);
    } else if (!isProcessingRef.current) {
      setState('idle');
    }
  }, [handleProcessTranscript]);

  const speak = useCallback((text: string, lang?: string) => {
    setState('speaking');
    speakText(text, {
      lang: lang || currentLangRef.current,
      onEnd: () => setState('idle'),
      onError: () => setState('idle'),
    });
  }, []);

  return {
    state,
    isListening: state === 'listening',
    isProcessing: state === 'processing',
    isSpeaking: state === 'speaking',
    transcript,
    lastResult,
    errorMessage,
    isSupported,
    startListening,
    stopListening,
    handleInterrupt,
    speak,
  };
};

