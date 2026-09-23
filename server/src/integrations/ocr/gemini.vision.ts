import fs from 'fs';
import { IOCRProvider, ExtractedPrescriptionData } from './ocr.interface';
import { MockOCRProvider } from './mock.ocr';
import { env } from '../../config/env';

export class GeminiVisionProvider implements IOCRProvider {
  public readonly name = 'GeminiVisionProvider';
  private fallbackMock = new MockOCRProvider();

  public async extractPrescription(
    filePath: string,
    mimeType: string,
    originalName: string
  ): Promise<ExtractedPrescriptionData> {
    if (!env.GEMINI_API_KEY) {
      console.log('[GeminiVisionProvider] No GEMINI_API_KEY detected. Using MockOCRProvider fallback.');
      return this.fallbackMock.extractPrescription(filePath, mimeType, originalName);
    }

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');

      const prompt = `You are a medical document OCR specialist. Extract structured information from this doctor prescription.
Strict Medical Rules:
- DO NOT invent or hallucinate information that is not in the image.
- Return ONLY valid JSON matching this schema:
{
  "doctor": { "name": "string", "specialty": "string" },
  "hospital": { "name": "string", "address": "string" },
  "receptionPhone": "string",
  "prescriptionDate": "YYYY-MM-DD",
  "medicines": [
    { "name": "string", "dosage": "string", "frequency": "string", "instructions": "string", "duration": "string" }
  ],
  "rawText": "full plain text transcript of the document"
}`;

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType.startsWith('image') ? mimeType : 'image/jpeg',
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

      const data = await res.json();
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
        confidence: 0.95,
      };
    } catch (err) {
      console.warn('[GeminiVisionProvider] Vision extraction error, using MockOCRProvider fallback:', err);
      return this.fallbackMock.extractPrescription(filePath, mimeType, originalName);
    }
  }
}
