import { IOCRProvider } from './ocr.interface';
import { MockOCRProvider } from './mock.ocr';
import { GeminiVisionProvider } from './gemini.vision';
import { env } from '../../config/env';

export class OCRFactory {
  private static instance: IOCRProvider | null = null;

  public static getProvider(): IOCRProvider {
    if (!this.instance) {
      if (env.GEMINI_API_KEY) {
        this.instance = new GeminiVisionProvider();
      } else {
        this.instance = new MockOCRProvider();
      }
    }
    return this.instance;
  }
}

export * from './ocr.interface';
