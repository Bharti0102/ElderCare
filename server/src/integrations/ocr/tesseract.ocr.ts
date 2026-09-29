import fs from 'fs';
import { createWorker } from 'tesseract.js';
import { IOCRProvider, ExtractedPrescriptionData } from './ocr.interface';
import { ClinicalNLPService } from '../../services/prescription/clinical-nlp.service';

export class TesseractOCRProvider implements IOCRProvider {
  public readonly name = 'TesseractOCRProvider';

  public async extractPrescription(
    filePath: string,
    mimeType: string,
    originalName: string
  ): Promise<ExtractedPrescriptionData> {
    console.log(`[TesseractOCR] Performing real-world optical character recognition on ${originalName}...`);

    let rawText = '';
    try {
      if (fs.existsSync(filePath)) {
        // If it's a text file or text-like document, read directly
        if (mimeType.includes('text') || filePath.endsWith('.txt')) {
          rawText = fs.readFileSync(filePath, 'utf8');
        } else {
          // Perform genuine image OCR using Tesseract WASM engine
          const worker = await createWorker('eng');
          const ret = await worker.recognize(filePath);
          rawText = ret.data.text;
          await worker.terminate();
        }
      }
    } catch (err: any) {
      console.warn('[TesseractOCR] OCR parsing error:', err.message);
      // Fallback text read
      try {
        rawText = fs.readFileSync(filePath, 'utf8');
      } catch {
        rawText = originalName;
      }
    }

    console.log(`[TesseractOCR] Optical scan complete (${rawText.length} characters extracted).`);

    // Parse extracted OCR transcript through Clinical NLP
    return ClinicalNLPService.parsePrescriptionText(rawText);
  }
}
