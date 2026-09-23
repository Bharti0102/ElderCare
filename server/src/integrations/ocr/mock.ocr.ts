import fs from 'fs';
import { IOCRProvider, ExtractedPrescriptionData, ExtractedMedicine } from './ocr.interface';

export class MockOCRProvider implements IOCRProvider {
  public readonly name = 'MockOCRProvider';

  public async extractPrescription(
    filePath: string,
    mimeType: string,
    originalName: string
  ): Promise<ExtractedPrescriptionData> {
    // Attempt to read text content if plain text or parseable
    let rawContent = '';
    try {
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        // If it's a text file or contains readable ASCII/UTF-8 strings
        rawContent = buffer.toString('utf-8', 0, Math.min(buffer.length, 4096));
      }
    } catch {
      rawContent = '';
    }

    const lower = (rawContent + ' ' + originalName).toLowerCase();

    // Pattern-based or realistic sample clinical extraction
    let doctor = {
      name: 'Dr. Sarah Mitchell, MD',
      specialty: 'Internal Medicine & Geriatrics',
    };
    let hospital = {
      name: 'Metropolitan Community Health Center',
      address: '742 Evergreen Terrace, Medical Suite 300',
    };
    let receptionPhone = '+1-555-019-4820';
    let prescriptionDate = new Date();

    const medicines: ExtractedMedicine[] = [];

    // Check for specific medicines in the content or filename
    if (lower.includes('atorvastatin') || lower.includes('cholesterol')) {
      medicines.push({
        name: 'Atorvastatin',
        dosage: '20mg',
        frequency: 'Once daily at bedtime',
        instructions: 'Take 1 tablet every night with water',
        duration: '30 days',
      });
    }

    if (lower.includes('metformin') || lower.includes('diabetes') || lower.includes('sugar')) {
      medicines.push({
        name: 'Metformin HCl',
        dosage: '500mg',
        frequency: 'Twice daily',
        instructions: 'Take 1 tablet with breakfast and 1 tablet with dinner',
        duration: '60 days',
      });
    }

    if (lower.includes('amlodipine') || lower.includes('blood pressure') || lower.includes('hypertension')) {
      medicines.push({
        name: 'Amlodipine Besylate',
        dosage: '5mg',
        frequency: 'Once daily in the morning',
        instructions: 'Take 1 tablet every morning after breakfast',
        duration: '90 days',
      });
    }

    if (lower.includes('lisinopril')) {
      medicines.push({
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily in the morning',
        instructions: 'Take 1 tablet daily with a full glass of water',
        duration: '30 days',
      });
    }

    // Default fallback if no specific medicine matched in test file
    if (medicines.length === 0) {
      medicines.push(
        {
          name: 'Amlodipine Besylate',
          dosage: '5mg',
          frequency: 'Once daily in the morning',
          instructions: 'Take 1 tablet every morning after breakfast',
          duration: '30 days',
        },
        {
          name: 'Metformin HCl',
          dosage: '500mg',
          frequency: 'Twice daily with meals',
          instructions: 'Take 1 tablet after breakfast and dinner',
          duration: '60 days',
        }
      );
    }

    // Clean human readable raw transcription
    const rawText =
      `PRESCRIPTION RECORD\n` +
      `Clinic: ${hospital.name}\n` +
      `Physician: ${doctor.name} (${doctor.specialty})\n` +
      `Reception Desk: ${receptionPhone}\n` +
      `Date Issued: ${prescriptionDate.toISOString().slice(0, 10)}\n\n` +
      `Rx Medications:\n` +
      medicines
        .map(
          (m, idx) =>
            `${idx + 1}. ${m.name} - ${m.dosage || 'as directed'}\n` +
            `   Sig: ${m.frequency || ''} - ${m.instructions || ''}\n` +
            `   Duration: ${m.duration || 'Ongoing'}`
        )
        .join('\n\n');

    return {
      doctor,
      hospital,
      receptionPhone,
      prescriptionDate,
      medicines,
      rawText,
      confidence: 0.94,
    };
  }
}
