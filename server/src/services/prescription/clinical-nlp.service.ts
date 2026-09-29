import { ExtractedPrescriptionData, ExtractedMedicine } from '../../integrations/ocr/ocr.interface';

export class ClinicalNLPService {
  /**
   * Parses raw OCR text extracted from an image into structured doctor, hospital, and medicine entities.
   */
  public static parsePrescriptionText(rawText: string): ExtractedPrescriptionData {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let doctorName = '';
    let doctorSpecialty = '';
    let hospitalName = '';
    let hospitalAddress = '';
    let receptionPhone = '';
    let prescriptionDate = new Date();

    const medicines: ExtractedMedicine[] = [];

    // Common medical keywords
    const docRegex = /(?:dr\.?|doctor|physician|consultant)\s+([a-zA-Z\.\s]{3,40})/i;
    const specialtyRegex = /(cardio|diabet|general|internal|geriatric|ortho|pulmon|pediatr|neurol|gastro|physician|surgeon|consultant|mbbs|md|dm|ms|m\.d\.)/i;
    const hospitalRegex = /(hospital|clinic|care|centre|center|health|dispensary|nursing|institute|medical|polyclinic)/i;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b|\b\d{11}\b/;
    const dateRegex = /(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/;

    // Known drug prefixes & forms
    const medPrefixRegex = /^(?:tab|cap|syp|inj|oint|drop|tabs|caps|syrup|tablet|capsule|rx|1\.|2\.|3\.|4\.|5\.|6\.|7\.|8\.|9\.|-|\*)\s*(.*)/i;
    const dosageRegex = /(\d+(?:\.\d+)?\s*(?:mg|mcg|gm|g|ml|iu|units|%))/i;
    const frequencyRegex = /(once daily|twice daily|thrice daily|1-0-1|1-0-0|0-0-1|1-1-1|od|bd|bid|tds|tid|qid|hs|at bedtime|in the morning|sos|as needed|q8h|q12h)/i;
    const durationRegex = /(\d+\s*(?:days|weeks|months|day|week|month))/i;

    let inInstructionsSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check section headers
      if (/^(instructions|advice|note|notes|diet|investigations|tests|review|follow\s*up)[:\s]/i.test(line)) {
        inInstructionsSection = true;
        continue;
      }
      if (/^(rx|medications?|medicines?|prescriptions?)[:\s]?$/i.test(line)) {
        inInstructionsSection = false;
        continue;
      }

      // Extract Doctor Name
      if (!doctorName && docRegex.test(line)) {
        const match = line.match(docRegex);
        if (match) {
          doctorName = 'Dr. ' + match[1].replace(/^(dr\.?|doctor)\s*/i, '').trim();
        }
      }

      // Extract Doctor Specialty / Degree
      if (!doctorSpecialty && specialtyRegex.test(line) && !hospitalRegex.test(line)) {
        doctorSpecialty = line.slice(0, 50).trim();
      }

      // Extract Hospital Name
      if (!hospitalName && hospitalRegex.test(line) && !line.toLowerCase().startsWith('dr')) {
        hospitalName = line.slice(0, 60).trim();
        if (i + 1 < lines.length && !phoneRegex.test(lines[i + 1]) && !medPrefixRegex.test(lines[i + 1])) {
          hospitalAddress = lines[i + 1].slice(0, 80).trim();
        }
      }

      // Extract Reception Phone
      if (!receptionPhone && phoneRegex.test(line)) {
        const match = line.match(phoneRegex);
        if (match) {
          receptionPhone = match[0].trim();
        }
      }

      // Extract Prescription Date
      if (dateRegex.test(line)) {
        const match = line.match(dateRegex);
        if (match) {
          const parsed = new Date(match[1]);
          if (!isNaN(parsed.getTime())) {
            prescriptionDate = parsed;
          }
        }
      }

      // If we are in instructions/advice section, do not parse as medicine
      if (inInstructionsSection) {
        continue;
      }

      // Skip non-medicine metadata lines
      if (/^(patient|name|age|gender|sex|diagnosis|history|dr\.|doctor|mci|reg|date|phone|hospital|clinic)/i.test(line)) {
        continue;
      }

      // Known pharmaceutical name keywords (strict word boundaries)
      const isKnownDrug = /\b(telma|telmisartan|augmentin|amoxicillin|clavulanate|pantocid|pan-40|pan-d|pantoprazole|glycomet|metformin|thyronorm|rosuvas|rosuvastatin|atorva|atorvastatin|calpol|paracetamol|dolo|dolo-650|ecosprin|aspirin|amlodipine|amlo|lisinopril|omeprazole|ciprofloxacin|cipro|azithral|azithromycin|levocetirizine|levothyroxine|montair|montelukast|januvia|sitagliptin|combiflam|shelcal|insulin|glimepiride|ibuprofen|gabapentin|metoprolol)\b/i.test(
        line
      );

      const hasDosage = dosageRegex.test(line);
      const hasMedPrefix = /^(?:tab\.?|cap\.?|syp\.?|inj\.?|tablet|capsule|rx)\b/i.test(line);
      const isNumberedMedLine = /^\d+[\.\)]\s*(?:tab|cap|syp|inj|[a-zA-Z]{3,})/i.test(line) && (hasDosage || isKnownDrug);

      const isMedLine = (hasMedPrefix && (hasDosage || isKnownDrug)) || isNumberedMedLine || (isKnownDrug && (hasDosage || frequencyRegex.test(line)));

      if (isMedLine) {
        let cleanName = line;
        const prefixMatch = cleanName.match(medPrefixRegex);
        if (prefixMatch && prefixMatch[1]) {
          cleanName = prefixMatch[1].trim();
        }

        // Clean prefix like 'Tab.', 'Cap.'
        cleanName = cleanName.replace(/^(tab\.?|cap\.?|syp\.?|inj\.?|tablet|capsule)\s+/i, '').trim();

        let dosage = '';
        const dosageMatch = line.match(dosageRegex);
        if (dosageMatch) {
          dosage = dosageMatch[1].trim();
        }

        let frequency = 'Once daily';
        const freqMatch = line.match(frequencyRegex);
        if (freqMatch) {
          frequency = this.normalizeFrequency(freqMatch[1].trim());
        }

        let duration = '30 days';
        const durMatch = line.match(durationRegex);
        if (durMatch) {
          duration = durMatch[1].trim();
        }

        // Clean medicine name from trailing instructions
        let namePart = cleanName
          .split(/[-–—:]/)[0]
          .replace(dosageRegex, '')
          .replace(frequencyRegex, '')
          .replace(durationRegex, '')
          .replace(/^\d+[\.\)]\s*/, '')
          .trim();

        if (namePart && namePart.length >= 3 && !/^(date|phone|hospital|doctor|patient|name|age|sex|rx|instructions|advice)$/i.test(namePart)) {
          const fullName = `${namePart}${dosage ? ' ' + dosage : ''}`.trim();
          medicines.push({
            name: fullName,
            dosage: dosage || 'Standard dose',
            frequency,
            instructions: `Take ${frequency.toLowerCase()} with water as directed`,
            duration,
          });
        }
      }
    }

    const isLegible = medicines.length > 0 || !!doctorName || !!hospitalName;

    return {
      doctor: {
        name: doctorName || '',
        specialty: doctorSpecialty || '',
      },
      hospital: {
        name: hospitalName || '',
        address: hospitalAddress || '',
      },
      receptionPhone: receptionPhone || '',
      prescriptionDate,
      medicines,
      rawText: rawText.trim() || 'No legible prescription text was detected in the uploaded image.',
      confidence: isLegible ? (medicines.length > 0 ? 0.95 : 0.6) : 0,
    };
  }

  private static normalizeFrequency(freq: string): string {
    const f = freq.toLowerCase();
    if (f === '1-0-1' || f === 'bd' || f === 'bid' || f === 'twice daily') return 'Twice daily (Morning & Night)';
    if (f === '1-0-0' || f === 'od' || f === 'once daily' || f === 'in the morning') return 'Once daily in the morning';
    if (f === '0-0-1' || f === 'hs' || f === 'at bedtime') return 'Once daily at bedtime';
    if (f === '1-1-1' || f === 'tds' || f === 'tid' || f === 'thrice daily') return 'Three times daily with meals';
    if (f === 'sos' || f === 'as needed') return 'As needed for acute symptoms (SOS)';
    return freq;
  }
}
