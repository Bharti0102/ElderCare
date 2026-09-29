import fs from 'fs';
import { IOCRProvider, ExtractedPrescriptionData } from './ocr.interface';
import { TesseractOCRProvider } from './tesseract.ocr';
import { AIConfigService } from '../../services/ai/ai-config.service';

export class GeminiVisionProvider implements IOCRProvider {
  public readonly name = 'GeminiVisionProvider';
  private fallbackOCR = new TesseractOCRProvider();

  public async extractPrescription(
    filePath: string,
    mimeType: string,
    originalName: string
  ): Promise<ExtractedPrescriptionData> {
    const apiKey = AIConfigService.getGeminiKey();
    if (!apiKey) {
      console.log('[GeminiVisionProvider] No Gemini API key detected. Routing to local Tesseract OCR engine.');
      return this.fallbackOCR.extractPrescription(filePath, mimeType, originalName);
    }

    try {
      console.log(`[GeminiVisionProvider] Scanning prescription with Gemini 1.5 Flash Multimodal Vision...`);
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');
      const cleanMime = mimeType.startsWith('image') ? mimeType : 'image/jpeg';

      const prompt = `You are a clinical pharmacologist and medical document OCR specialist. Examine this uploaded doctor prescription image in full detail.
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

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: cleanMime,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Gemini Vision API error: ${res.status} ${res.statusText}`);
      }

      const data: any = await res.json();
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) {
        throw new Error('Empty response from Gemini Vision');
      }

      const parsed = JSON.parse(rawJson);
      return {
        doctor: parsed.doctor || {},
        hospital: parsed.hospital || {},
        receptionPhone: parsed.receptionPhone || '',
        prescriptionDate: parsed.prescriptionDate ? new Date(parsed.prescriptionDate) : new Date(),
        medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
        rawText: parsed.rawText || '',
        confidence: 0.96,
      };
    } catch (err: any) {
      console.warn('[GeminiVisionProvider] Vision error, falling back to local Tesseract OCR engine:', err.message);
      return this.fallbackOCR.extractPrescription(filePath, mimeType, originalName);
    }
  }
}
