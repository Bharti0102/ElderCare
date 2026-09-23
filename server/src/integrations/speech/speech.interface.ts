export interface AudioTranscriptionResult {
  transcript: string;
  confidence: number;
  detectedLanguage?: string;
}

export interface SpeechSynthesisResult {
  audioBuffer?: Buffer;
  mimeType?: string;
  text: string;
  rate: number;
}

export interface ISpeechProvider {
  readonly name: string;
  transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<AudioTranscriptionResult>;
  synthesizeSpeech(text: string, rate?: number): Promise<SpeechSynthesisResult>;
}
