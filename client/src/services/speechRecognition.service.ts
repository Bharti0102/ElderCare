/**
 * Speech Recognition Service for ElderCare AI
 * Wraps browser Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 */

export interface SpeechRecognitionHandlers {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export class SpeechRecognitionService {
  private static recognition: any = null;
  private static isListening = false;

  public static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public static startListening(handlers: SpeechRecognitionHandlers): boolean {
    if (!this.isSupported()) {
      handlers.onError?.('Speech recognition is not supported in this browser. You can type commands directly.');
      return false;
    }

    try {
      if (this.recognition && this.isListening) {
        this.stopListening();
      }

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.maxAlternatives = 1;

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

        if (finalTranscript) {
          handlers.onResult?.(finalTranscript.trim(), true);
        } else if (interimTranscript) {
          handlers.onResult?.(interimTranscript.trim(), false);
        }
      };

      rec.onerror = (event: any) => {
        this.isListening = false;
        let message = 'Could not capture speech.';
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          message = 'Microphone permission was denied. Please allow microphone access.';
        } else if (event.error === 'no-speech') {
          message = 'No speech detected. Please tap the microphone and speak clearly.';
        }
        handlers.onError?.(message);
      };

      rec.onend = () => {
        this.isListening = false;
        handlers.onEnd?.();
      };

      rec.start();
      this.recognition = rec;
      return true;
    } catch (err: any) {
      this.isListening = false;
      handlers.onError?.(err.message || 'Failed to start microphone.');
      return false;
    }
  }

  public static stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
      this.isListening = false;
    }
  }

  public static getIsListening(): boolean {
    return this.isListening;
  }
}
