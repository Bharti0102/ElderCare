export interface ExtractedMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
  duration?: string;
  purpose?: string;
  timingInstructions?: string;
  precautions?: string;
  interactions?: string;
  whatToAvoid?: string;
  warnings?: string;
  simplifiedExplanation?: string;
}

export interface ExtractedPrescriptionData {
  doctor?: {
    name?: string;
    specialty?: string;
  };
  hospital?: {
    name?: string;
    address?: string;
  };
  receptionPhone?: string;
  prescriptionDate?: Date;
  medicines: ExtractedMedicine[];
  rawText: string;
  confidence: number;
}

export interface IOCRProvider {
  readonly name: string;
  extractPrescription(
    filePath: string,
    mimeType: string,
    originalName: string
  ): Promise<ExtractedPrescriptionData>;
}
