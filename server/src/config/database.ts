import mongoose from 'mongoose';
import { env } from './env';

export interface DatabaseStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  host?: string;
  name?: string;
  error?: string;
}

let connectionError: string | null = null;

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected successfully');
      connectionError = null;
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      connectionError = err.message || 'MongoDB connection error';
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch (error: any) {
    connectionError = error.message || 'Failed to connect to MongoDB';
    console.error('Initial MongoDB connection error:', connectionError);
  }
};

export const getDatabaseStatus = (): DatabaseStatus => {
  const readyState = mongoose.connection.readyState;
  switch (readyState) {
    case 1:
      return {
        status: 'connected',
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      };
    case 2:
      return {
        status: 'connecting',
      };
    case 0:
    default:
      return {
        status: connectionError ? 'error' : 'disconnected',
        error: connectionError || undefined,
      };
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
