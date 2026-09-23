import mongoose, { Document, Schema, Types } from 'mongoose';

export type PrescriptionStatus = 'UPLOADED' | 'ANALYZED' | 'CONFIRMED' | 'REJECTED';

export interface IPrescriptionMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
  duration?: string;
  purpose?: string;            // Why it is prescribed
  timingInstructions?: string; // When/how to take it
  precautions?: string;        // Common precautions
  interactions?: string;       // Food/drug interactions
  whatToAvoid?: string;        // What to avoid
  warnings?: string;           // Important warnings
  simplifiedExplanation?: string; // AI explains in simple language
}

export interface IPrescription extends Document {
  userId: Types.ObjectId;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
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
  medicines: IPrescriptionMedicine[];
  rawText?: string;
  confidence: number;
  status: PrescriptionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionMedicineSchema = new Schema<IPrescriptionMedicine>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: {
      type: String,
      trim: true,
    },
    frequency: {
      type: String,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
    duration: {
      type: String,
      trim: true,
    },
    purpose: {
      type: String,
      trim: true,
    },
    timingInstructions: {
      type: String,
      trim: true,
    },
    precautions: {
      type: String,
      trim: true,
    },
    interactions: {
      type: String,
      trim: true,
    },
    whatToAvoid: {
      type: String,
      trim: true,
    },
    warnings: {
      type: String,
      trim: true,
    },
    simplifiedExplanation: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

const PrescriptionSchema = new Schema<IPrescription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    doctor: {
      name: { type: String, trim: true },
      specialty: { type: String, trim: true },
    },
    hospital: {
      name: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    receptionPhone: {
      type: String,
      trim: true,
    },
    prescriptionDate: {
      type: Date,
    },
    medicines: {
      type: [PrescriptionMedicineSchema],
      default: [],
    },
    rawText: {
      type: String,
    },
    confidence: {
      type: Number,
      default: 0.95,
      min: 0,
      max: 1,
    },
    status: {
      type: String,
      enum: ['UPLOADED', 'ANALYZED', 'CONFIRMED', 'REJECTED'],
      default: 'ANALYZED',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PrescriptionSchema.index({ userId: 1, createdAt: -1 });

export const Prescription = mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
