import { SpeechFactory } from '../../integrations/speech';
import { OrchestratorService, OrchestratorResult } from '../ai/orchestrator.service';
import { AppError } from '../../utils/apiError';

export interface VoiceProcessResult extends OrchestratorResult {
  transcript: string;
  spokenText: string;
  voiceSettings: {
    rate: number;
    pitch: number;
    volume: number;
  };
}

export class SpeechService {
  /**
   * Sanitizes markdown text for smooth, natural Text-to-Speech playback for elderly users
   * Removes emojis, bold/italic markers, bullets, markdown links, and brackets.
   */
  public static cleanTextForSpeech(text: string): string {
    return text
      // Remove URLs and markdown links
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove bold and italics
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove headers and bullets
      .replace(/^#+\s+/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      // Remove emojis and special symbols
      .replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
        ''
      )
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Main voice processing pipeline:
   * Voice Input (transcript or audio) -> Orchestrator -> Tool Execution -> Sanitized Speech Output
   */
  public static async processVoiceInput(
    userId: string,
    input: { transcript?: string; audioBuffer?: Buffer; mimeType?: string }
  ): Promise<VoiceProcessResult> {
    let finalTranscript = input.transcript?.trim() || '';

    // If audio buffer provided, transcribe via speech provider
    if (!finalTranscript && input.audioBuffer) {
      const speech = SpeechFactory.getProvider();
      const transcribed = await speech.transcribeAudio(
        input.audioBuffer,
        input.mimeType || 'audio/wav'
      );
      finalTranscript = transcribed.transcript;
    }

    if (!finalTranscript) {
      throw new AppError('No voice transcript or audio data provided.', 400, 'EMPTY_VOICE_INPUT');
    }

    // Pass transcript into central AI Orchestrator
    const result = await OrchestratorService.processMessage(userId, finalTranscript);

    // Prepare speech-optimized version of assistant response
    const spokenText = this.cleanTextForSpeech(result.reply);

    return {
      ...result,
      transcript: finalTranscript,
      spokenText,
      voiceSettings: {
        rate: 0.88, // Elderly-optimized calm pace
        pitch: 1.0,
        volume: 1.0,
      },
    };
  }

  /**
   * Transcribe raw audio data
   */
  public static async transcribe(
    audioBuffer: Buffer,
    mimeType = 'audio/wav'
  ): Promise<{ transcript: string; confidence: number }> {
    const provider = SpeechFactory.getProvider();
    return provider.transcribeAudio(audioBuffer, mimeType);
  }

  /**
   * Get active speech engine status
   */
  public static getStatus(): {
    provider: string;
    sttAvailable: boolean;
    ttsAvailable: boolean;
    supportedLanguages: string[];
    sampleRateHz: number;
  } {
    const provider = SpeechFactory.getProvider();
    return {
      provider: provider.name,
      sttAvailable: true,
      ttsAvailable: true,
      supportedLanguages: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE'],
      sampleRateHz: 16000,
    };
  }
}
