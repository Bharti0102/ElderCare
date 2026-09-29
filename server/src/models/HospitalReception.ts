import { Schema, model, Document, Types } from 'mongoose';

export interface IHospitalReception extends Document {
  userId: Types.ObjectId;
  hospitalName: string;
  receptionPhone: string;
  doctorName?: string;
  department?: string;
  address?: string;
  availableSlots: string[];
  notes?: string;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hospitalReceptionSchema = new Schema<IHospitalReception>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    hospitalName: {
      type: String,
      required: [true, 'Hospital or clinic name is required'],
      trim: true,
      maxlength: [120, 'Hospital name cannot exceed 120 characters'],
    },
    receptionPhone: {
      type: String,
      required: [true, 'Reception phone number is required'],
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
    },
    doctorName: {
      type: String,
      trim: true,
      default: 'General Practitioner',
      maxlength: [100, 'Doctor name cannot exceed 100 characters'],
    },
    department: {
      type: String,
      trim: true,
      default: 'Outpatient Care',
      maxlength: [80, 'Department cannot exceed 80 characters'],
    },
    address: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    availableSlots: {
      type: [String],
      default: ['09:00 AM', '10:30 AM', '11:45 AM', '02:00 PM', '04:30 PM', '06:00 PM'],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

hospitalReceptionSchema.index({ userId: 1, isFavorite: -1 });

export const HospitalReception = model<IHospitalReception>('HospitalReception', hospitalReceptionSchema);
