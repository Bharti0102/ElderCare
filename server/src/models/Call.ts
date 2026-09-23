import mongoose, { Document, Schema, Types } from 'mongoose';

export type CallType = 'CAREGIVER' | 'HOSPITAL';
export type CallStatus =
  | 'REQUESTED'
  | 'CALLING'
  | 'CONNECTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface ICall extends Document {
  userId: Types.ObjectId;
  contactId?: Types.ObjectId;
  contactName: string;
  relationship: string;
  phoneNumber: string;
  type: CallType;
  providerCallId: string;
  status: CallStatus;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema = new Schema<ICall>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'EmergencyContact',
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['CAREGIVER', 'HOSPITAL'],
      default: 'CAREGIVER',
      index: true,
    },
    providerCallId: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        'REQUESTED',
        'CALLING',
        'CONNECTED',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
      ],
      default: 'REQUESTED',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

CallSchema.index({ userId: 1, createdAt: -1 });

export const Call = mongoose.model<ICall>('Call', CallSchema);
