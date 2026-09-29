/**
 * Speech Recognition Service for ElderCare AI
 * Wraps browser Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 * with silence detection auto-submit, interim recovery, and multilingual support.
 */

export interface SpeechRecognitionHandlers {
  lang?: string;
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export class SpeechRecognitionService {
  private static recognition: any = null;
  private static isListening = false;
  private static currentTranscript = '';
  private static silenceTimeoutId: any = null;
  private static activeHandlers: SpeechRecognitionHandlers | null = null;
  private static hasDispatchedFinal = false;

  public static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public static startListening(handlers: SpeechRecognitionHandlers): boolean {
    if (!this.isSupported()) {
      handlers.onError?.('Speech recognition is not supported in this browser. You can type directly.');
      return false;
    }

    try {
      this.stopListening();

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      const rec = new SpeechRecognition();
      rec.continuous = true; // continuous allows smoother pauses without premature abort
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      // Select target language (default to Hindi for native elder interaction)
      const targetLang = handlers.lang || 'hi-IN';
      rec.lang = targetLang;

      this.currentTranscript = '';
      this.hasDispatchedFinal = false;
      this.activeHandlers = handlers;

      const clearSilenceTimer = () => {
        if (this.silenceTimeoutId) {
          clearTimeout(this.silenceTimeoutId);
          this.silenceTimeoutId = null;
        }
      };

      const startSilenceTimer = (textToFinalize: string) => {
        clearSilenceTimer();
        // After 1.4 seconds of silence, finalize and trigger AI response
        this.silenceTimeoutId = setTimeout(() => {
          if (this.isListening && textToFinalize.trim() && !this.hasDispatchedFinal) {
            this.hasDispatchedFinal = true;
            this.activeHandlers?.onResult?.(textToFinalize.trim(), true);
            this.stopListening();
          }
        }, 1400);
      };

      rec.onstart = () => {
        this.isListening = true;
        handlers.onStart?.();
      };

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const combined = (finalTranscript || interimTranscript || '').trim();
        if (combined) {
          this.currentTranscript = combined;
          handlers.onResult?.(combined, false);
          // Arm silence timer
          startSilenceTimer(combined);
        }

        if (finalTranscript && finalTranscript.trim().length > 0) {
          clearSilenceTimer();
          this.hasDispatchedFinal = true;
          handlers.onResult?.(finalTranscript.trim(), true);
          this.stopListening();
        }
      };

      rec.onerror = (event: any) => {
        clearSilenceTimer();
        // Ignore 'no-speech' if we already captured transcript
        if (event.error === 'no-speech') {
          if (this.currentTranscript.trim() && !this.hasDispatchedFinal) {
            this.hasDispatchedFinal = true;
            handlers.onResult?.(this.currentTranscript.trim(), true);
          }
          return;
        }

        this.isListening = false;
        let message = 'Could not capture speech.';
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          message = 'Microphone permission denied. Please allow microphone access in your browser.';
        } else if (event.error === 'network') {
          message = 'Network error during speech recognition. Please check internet connection.';
        }
        handlers.onError?.(message);
      };

      rec.onend = () => {
        clearSilenceTimer();
        const pendingText = this.currentTranscript.trim();
        this.isListening = false;

        // If recognition ended with unsubmitted transcript, dispatch it now!
        if (pendingText && !this.hasDispatchedFinal) {
          this.hasDispatchedFinal = true;
          handlers.onResult?.(pendingText, true);
        }

        handlers.onEnd?.();
        this.activeHandlers = null;
      };

      rec.start();
      this.recognition = rec;
      return true;
    } catch (err: any) {
      this.isListening = false;
      this.activeHandlers = null;
      handlers.onError?.(err.message || 'Failed to start microphone.');
      return false;
    }
  }

  public static stopListening(): void {
    if (this.silenceTimeoutId) {
      clearTimeout(this.silenceTimeoutId);
      this.silenceTimeoutId = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.isListening = false;
  }

  public static getIsListening(): boolean {
    return this.isListening;
  }

  public static getCurrentTranscript(): string {
    return this.currentTranscript;
  }
}

