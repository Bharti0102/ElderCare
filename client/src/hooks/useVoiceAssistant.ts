import { useState, useCallback, useEffect } from 'react';
import { SpeechRecognitionService } from '../services/speechRecognition.service';
import { processVoiceCommand } from '../services/voice.service';
import {
  speakText,
  stopSpeaking,
  playReminderChime,
  getVoiceSettings,
} from '../services/voiceNotification.service';
import { VoiceProcessResponse } from '../types';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface UseVoiceAssistantOptions {
  autoSpeak?: boolean;
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

  useEffect(() => {
    setIsSupported(SpeechRecognitionService.isSupported());
  }, []);

  const handleInterrupt = useCallback(() => {
    stopSpeaking();
    SpeechRecognitionService.stopListening();
    setState('idle');
  }, []);

  const handleProcessTranscript = useCallback(
    async (finalTranscript: string) => {
      if (!finalTranscript.trim()) {
        setState('idle');
        return;
      }

      setState('processing');
      setErrorMessage(null);

      try {
        const result = await processVoiceCommand(finalTranscript);
        setLastResult(result);
        options.onSuccess?.(result);

        const voiceSettings = getVoiceSettings();
        if (autoSpeak && voiceSettings.enabled && result.spokenText) {
          setState('speaking');
          speakText(result.spokenText, {
            rate: result.voiceSettings?.rate || 0.88,
            onEnd: () => {
              setState('idle');
            },
            onError: () => {
              setState('idle');
            },
          });
        } else {
          setState('idle');
        }
      } catch (err: any) {
        const msg = err.message || 'Failed to process voice request.';
        setErrorMessage(msg);
        setState('error');
        options.onError?.(msg);
      }
    },
    [autoSpeak, options]
  );

  const startListening = useCallback(() => {
    // If assistant is currently speaking, clicking mic interrupts speaking and starts listening
    stopSpeaking();
    setErrorMessage(null);
    setTranscript('');

    playReminderChime();

    const started = SpeechRecognitionService.startListening({
      onStart: () => {
        setState('listening');
      },
      onResult: (capturedTranscript, isFinal) => {
        setTranscript(capturedTranscript);

        if (isFinal) {
          SpeechRecognitionService.stopListening();
          handleProcessTranscript(capturedTranscript);
        }
      },
      onError: (err) => {
        setErrorMessage(err);
        setState('error');
        options.onError?.(err);
      },
      onEnd: () => {
        if (state === 'listening') {
          // If ended without final, revert to idle unless processing
          setState((prev) => (prev === 'listening' ? 'idle' : prev));
        }
      },
    });

    if (!started && !SpeechRecognitionService.isSupported()) {
      setIsSupported(false);
      setErrorMessage('Speech recognition is not supported in this browser. Please use text typing.');
      setState('error');
    }
  }, [handleProcessTranscript, options, state]);

  const stopListening = useCallback(() => {
    SpeechRecognitionService.stopListening();
    if (state === 'listening') {
      if (transcript.trim()) {
        handleProcessTranscript(transcript);
      } else {
        setState('idle');
      }
    }
  }, [handleProcessTranscript, state, transcript]);

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
  };
};
