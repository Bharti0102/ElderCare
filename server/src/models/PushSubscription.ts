import { Schema, model, Document, Types } from 'mongoose';

export interface IPushKeys {
  p256dh: string;
  auth: string;
}

export interface IPushSubscription extends Document {
  endpoint: string;
  keys: IPushKeys;
  contactId?: Types.ObjectId;
  userId?: Types.ObjectId;
  recipientName?: string;
  deviceType?: string;
  userAgent?: string;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    endpoint: {
      type: String,
      required: [true, 'Push endpoint is required'],
      unique: true,
      trim: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: [true, 'p256dh key is required'],
        trim: true,
      },
      auth: {
        type: String,
        required: [true, 'auth key is required'],
        trim: true,
      },
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'EmergencyContact',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    recipientName: {
      type: String,
      trim: true,
    },
    deviceType: {
      type: String,
      default: 'mobile',
    },
    userAgent: {
      type: String,
      trim: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

pushSubscriptionSchema.index({ contactId: 1, updatedAt: -1 });
pushSubscriptionSchema.index({ userId: 1, updatedAt: -1 });

export const PushSubscription = model<IPushSubscription>('PushSubscription', pushSubscriptionSchema);
