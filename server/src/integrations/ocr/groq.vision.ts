import fs from 'fs';
import { IOCRProvider, ExtractedPrescriptionData } from './ocr.interface';
import { TesseractOCRProvider } from './tesseract.ocr';
import { AIConfigService } from '../../services/ai/ai-config.service';

export class GroqVisionProvider implements IOCRProvider {
  public readonly name = 'GroqVisionProvider';
  private fallbackOCR = new TesseractOCRProvider();

  public async extractPrescription(
    filePath: string,
    mimeType: string,
    originalName: string
  ): Promise<ExtractedPrescriptionData> {
    const apiKey = AIConfigService.getGroqKey();
    if (!apiKey) {
      console.log('[GroqVisionProvider] No Groq API key configured. Routing to Tesseract OCR.');
      return this.fallbackOCR.extractPrescription(filePath, mimeType, originalName);
    }

    try {
      console.log(`[GroqVisionProvider] Scanning prescription image with Groq Llama 3.2 Vision (Ultra-Fast)...`);
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');
      const cleanMime = mimeType.startsWith('image') ? mimeType : 'image/jpeg';
      const dataUrl = `data:${cleanMime};base64,${base64Data}`;

      const prompt = `You are a clinical pharmacologist and medical document OCR specialist. Examine this doctor prescription image in detail.
CRITICAL INTEGRITY RULES:
1. Only extract data that is actually written and clearly visible on this document.
2. DO NOT hallucinate, guess, or invent doctor names, clinic names, or medicines.
3. If doctor name or clinic name is not clearly visible, return empty strings "" for them.
4. If a medication is partially illegible or handwriting cannot be deciphered, only extract what is genuinely legible, or return an empty medicines array [].
5. If the image is unreadable, blurry, or not a prescription document, return "medicines": [], empty doctor/hospital, and in "rawText" state: "The handwriting or image quality is unclear. Unable to reliably identify medications."

Respond ONLY with valid JSON in this exact structure:
{
  "doctor": { "name": "string", "specialty": "string" },
  "hospital": { "name": "string", "address": "string" },
  "receptionPhone": "string",
  "prescriptionDate": "YYYY-MM-DD",
  "medicines": [
    { "name": "string", "dosage": "string", "frequency": "string", "instructions": "string", "duration": "string" }
  ],
  "rawText": "string"
}`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.2-11b-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 2048,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Groq Vision API error (${res.status}): ${errBody}`);
      }

      const data: any = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq Vision');
      }

      const parsed = JSON.parse(content);
      return {
        doctor: parsed.doctor || {},
        hospital: parsed.hospital || {},
        receptionPhone: parsed.receptionPhone || '',
        prescriptionDate: parsed.prescriptionDate ? new Date(parsed.prescriptionDate) : new Date(),
        medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
        rawText: parsed.rawText || '',
        confidence: 0.98,
      };
    } catch (err: any) {
      console.warn('[GroqVisionProvider] Vision extraction error, using Tesseract OCR fallback:', err.message);
      return this.fallbackOCR.extractPrescription(filePath, mimeType, originalName);
    }
  }
}
