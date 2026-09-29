import { Schema, model, Document, Types } from 'mongoose';

export type ContactCategory = 'FAMILY' | 'CAREGIVER' | 'DOCTOR' | 'EMERGENCY';

export interface IEmergencyContact extends Document {
  userId: Types.ObjectId;
  name: string;
  relationship: string;
  category: ContactCategory;
  phone: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      minlength: [2, 'Contact name must be at least 2 characters long'],
      maxlength: [100, 'Contact name cannot exceed 100 characters'],
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      trim: true,
      maxlength: [50, 'Relationship cannot exceed 50 characters'],
    },
    category: {
      type: String,
      enum: ['FAMILY', 'CAREGIVER', 'DOCTOR', 'EMERGENCY'],
      default: 'FAMILY',
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user scoping
emergencyContactSchema.index({ userId: 1, category: 1, isPrimary: -1 });

export const EmergencyContact = model<IEmergencyContact>('EmergencyContact', emergencyContactSchema);

