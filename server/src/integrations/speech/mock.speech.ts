import {
  ISpeechProvider,
  AudioTranscriptionResult,
  SpeechSynthesisResult,
} from './speech.interface';

export class MockSpeechProvider implements ISpeechProvider {
  public readonly name = 'MockSpeechProvider';

  public async transcribeAudio(
    audioBuffer: Buffer,
    _mimeType: string
  ): Promise<AudioTranscriptionResult> {
    // When raw audio buffer is passed in dev/mock, inspect length or return a standard voice test query
    const length = audioBuffer.length;
    let transcript = 'Tell me a gentle story';

    if (length > 1000 && length < 5000) {
      transcript = 'Call my daughter';
    } else if (length >= 5000 && length < 10000) {
      transcript = 'Remind me to take my medicine at 8 PM';
    } else if (length >= 10000) {
      transcript = 'Book an appointment with my doctor';
    }

    return {
      transcript,
      confidence: 0.95,
      detectedLanguage: 'en-US',
    };
  }

  public async synthesizeSpeech(
    text: string,
    rate = 0.88
  ): Promise<SpeechSynthesisResult> {
    // Generates a speech synthesis metadata block
    return {
      text,
      rate,
      mimeType: 'audio/wav',
    };
  }
}
