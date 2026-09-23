import { ISpeechProvider } from './speech.interface';
import { MockSpeechProvider } from './mock.speech';

export class SpeechFactory {
  private static instance: ISpeechProvider | null = null;

  public static getProvider(): ISpeechProvider {
    if (!this.instance) {
      this.instance = new MockSpeechProvider();
    }
    return this.instance;
  }
}

export * from './speech.interface';
