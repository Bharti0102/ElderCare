import { Schema, model, Document, Types } from 'mongoose';

export type ReminderCategory = 'MEDICATION' | 'APPOINTMENT' | 'HYDRATION' | 'GENERAL';
export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly';
export type ReminderStatus = 'PENDING' | 'COMPLETED' | 'SNOOZED' | 'CANCELLED';

export interface IReminder extends Document {
  userId: Types.ObjectId;
  title: string;
  description?: string;
  category: ReminderCategory;
  scheduledAt: Date;
  repeat: ReminderRepeat;
  status: ReminderStatus;
  snoozedUntil?: Date;
  lastNotifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Reminder title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      enum: ['MEDICATION', 'APPOINTMENT', 'HYDRATION', 'GENERAL'],
      default: 'MEDICATION',
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled time is required'],
      index: true,
    },
    repeat: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none',
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'SNOOZED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    snoozedUntil: {
      type: Date,
    },
    lastNotifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user-scoped queries and scheduler checks
reminderSchema.index({ userId: 1, status: 1, scheduledAt: 1 });
reminderSchema.index({ status: 1, scheduledAt: 1 });

export const Reminder = model<IReminder>('Reminder', reminderSchema);
