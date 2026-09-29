import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: string;
  timestamp: Date;
}

export interface IConversation extends Document {
  userId: Types.ObjectId;
  title: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    intent: {
      type: String,
      default: 'CHAT',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

conversationSchema.index({ userId: 1, updatedAt: -1 });

export const Conversation = model<IConversation>('Conversation', conversationSchema);
