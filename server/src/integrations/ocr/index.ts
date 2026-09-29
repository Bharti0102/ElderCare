import { IOCRProvider } from './ocr.interface';
import { GeminiVisionProvider } from './gemini.vision';
import { OpenAIVisionProvider } from './openai.vision';
import { GroqVisionProvider } from './groq.vision';
import { TesseractOCRProvider } from './tesseract.ocr';
import { AIConfigService } from '../../services/ai/ai-config.service';

export class OCRFactory {
  public static getProvider(): IOCRProvider {
    const active = AIConfigService.getActiveVisionProvider();

    if (active === 'groq') {
      return new GroqVisionProvider();
    }
    if (active === 'gemini') {
      return new GeminiVisionProvider();
    }
    if (active === 'openai') {
      return new OpenAIVisionProvider();
    }

    // Default to true local optical OCR engine
    return new TesseractOCRProvider();
  }
}

export * from './ocr.interface';
