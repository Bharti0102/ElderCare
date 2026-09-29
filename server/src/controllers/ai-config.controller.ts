import { Request, Response, NextFunction } from 'express';
import { AIConfigService, VisionProviderType } from '../services/ai/ai-config.service';
import { sendSuccess } from '../utils/apiResponse';

export class AIConfigController {
  public static async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = AIConfigService.getStatus();
      sendSuccess(res, status, 'AI Vision configuration retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { geminiApiKey, openAiApiKey, groqApiKey, preferredProvider } = req.body;

      AIConfigService.setAIConfig({
        geminiApiKey,
        openAiApiKey,
        groqApiKey,
        preferredProvider: preferredProvider as VisionProviderType,
      });

      const updated = AIConfigService.getStatus();
      sendSuccess(res, updated, 'AI Vision configuration updated successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async testKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { provider, apiKey } = req.body;
      const targetKey =
        apiKey ||
        (provider === 'groq'
          ? AIConfigService.getGroqKey()
          : provider === 'openai'
          ? AIConfigService.getOpenAIKey()
          : AIConfigService.getGeminiKey());

      if (!targetKey) {
        res.status(400).json({ success: false, error: { message: 'No API key provided to test.' } });
        return;
      }

      if (provider === 'groq') {
        const testRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${targetKey}` },
        });
        if (!testRes.ok) {
          res.status(400).json({
            success: false,
            error: { message: `Groq API returned ${testRes.status}: ${testRes.statusText}. Please verify your Groq API key.` },
          });
          return;
        }
        sendSuccess(res, { provider: 'groq', status: 'valid' }, 'Groq API key verified! Llama 3.2 Multimodal Vision & Llama 3.3 Active.');
        return;
      }

      if (provider === 'openai') {
        const testRes = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${targetKey}` },
        });
        if (!testRes.ok) {
          res.status(400).json({ success: false, error: { message: `OpenAI API returned ${testRes.status}: ${testRes.statusText}` } });
          return;
        }
        sendSuccess(res, { provider: 'openai', status: 'valid' }, 'OpenAI API key verified successfully!');
        return;
      }

      // Default: Google Gemini Test
      const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash?key=${targetKey}`);
      if (!testRes.ok) {
        res.status(400).json({ success: false, error: { message: `Gemini API returned ${testRes.status}: ${testRes.statusText}. Please verify your key at Google AI Studio.` } });
        return;
      }

      sendSuccess(res, { provider: 'gemini', status: 'valid' }, 'Google Gemini API key verified successfully!');
    } catch (err: any) {
      next(err);
    }
  }
}
