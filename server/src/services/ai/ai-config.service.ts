import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';

export type VisionProviderType = 'gemini' | 'openai' | 'groq' | 'tesseract';

export class AIConfigService {
  private static runtimeGeminiKey: string = env.GEMINI_API_KEY || '';
  private static runtimeOpenAIKey: string = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  private static runtimeGroqKey: string = env.GROQ_API_KEY || process.env.GROQ_API_KEY || '';
  private static activeVisionProvider: VisionProviderType = env.GROQ_API_KEY ? 'groq' : env.GEMINI_API_KEY ? 'gemini' : 'tesseract';

  public static getGeminiKey(): string {
    return this.runtimeGeminiKey || env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  }

  public static getOpenAIKey(): string {
    return this.runtimeOpenAIKey || env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  }

  public static getGroqKey(): string {
    return this.runtimeGroqKey || env.GROQ_API_KEY || process.env.GROQ_API_KEY || '';
  }

  public static getActiveVisionProvider(): VisionProviderType {
    if (this.activeVisionProvider === 'groq' && this.getGroqKey()) return 'groq';
    if (this.activeVisionProvider === 'gemini' && this.getGeminiKey()) return 'gemini';
    if (this.activeVisionProvider === 'openai' && this.getOpenAIKey()) return 'openai';
    if (this.getGroqKey()) return 'groq';
    if (this.getGeminiKey()) return 'gemini';
    if (this.getOpenAIKey()) return 'openai';
    return 'tesseract';
  }

  public static setAIConfig(config: {
    geminiApiKey?: string;
    openAiApiKey?: string;
    groqApiKey?: string;
    preferredProvider?: VisionProviderType;
  }): void {
    if (config.geminiApiKey !== undefined) {
      this.runtimeGeminiKey = config.geminiApiKey.trim();
      this.syncKeyToEnv('GEMINI_API_KEY', this.runtimeGeminiKey);
    }
    if (config.openAiApiKey !== undefined) {
      this.runtimeOpenAIKey = config.openAiApiKey.trim();
      this.syncKeyToEnv('OPENAI_API_KEY', this.runtimeOpenAIKey);
    }
    if (config.groqApiKey !== undefined) {
      this.runtimeGroqKey = config.groqApiKey.trim();
      this.syncKeyToEnv('GROQ_API_KEY', this.runtimeGroqKey);
    }
    if (config.preferredProvider) {
      this.activeVisionProvider = config.preferredProvider;
    }
  }

  public static getStatus() {
    const gemini = this.getGeminiKey();
    const openai = this.getOpenAIKey();
    const groq = this.getGroqKey();

    return {
      activeProvider: this.getActiveVisionProvider(),
      hasGroqKey: !!groq,
      maskedGroqKey: groq ? `${groq.slice(0, 6)}...${groq.slice(-4)}` : null,
      hasGeminiKey: !!gemini,
      maskedGeminiKey: gemini ? `${gemini.slice(0, 6)}...${gemini.slice(-4)}` : null,
      hasOpenAIKey: !!openai,
      maskedOpenAIKey: openai ? `${openai.slice(0, 4)}...${openai.slice(-4)}` : null,
      availableProviders: [
        {
          id: 'groq',
          name: 'Groq Llama 3.2 Vision (Ultra-Fast 500+ tok/s)',
          active: !!groq,
          description: 'Ultra-fast Llama-3.2-11B/90B multimodal vision and Llama-3.3 clinical reasoning on Groq LPUs.',
        },
        {
          id: 'gemini',
          name: 'Google Gemini 1.5/2.0 Vision',
          active: !!gemini,
          description: 'Multimodal vision model specialized in clinical handwriting and medical documents.',
        },
        {
          id: 'openai',
          name: 'OpenAI ChatGPT Vision (GPT-4o)',
          active: !!openai,
          description: 'ChatGPT multimodal vision analyzing uploaded prescription images.',
        },
        {
          id: 'tesseract',
          name: 'Local Tesseract OCR Engine',
          active: true,
          description: 'On-device optical character recognition engine reading actual image pixels.',
        },
      ],
    };
  }

  private static syncKeyToEnv(key: string, value: string): void {
    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf8');
        if (content.includes(`${key}=`)) {
          content = content.replace(new RegExp(`${key}=.*`, 'g'), `${key}=${value}`);
        } else {
          content += `\n${key}=${value}`;
        }
        fs.writeFileSync(envPath, content, 'utf8');
      }
    } catch {
      // Non-fatal
    }
  }
}
