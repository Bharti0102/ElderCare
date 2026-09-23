import { Schema, model, Document, Types } from 'mongoose';

export type AppointmentStatus =
  | 'PROPOSED'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED';

export type AppointmentSource = 'AI_CALL' | 'HUMAN_CALL' | 'MANUAL';

export interface IAppointment extends Document {
  userId: Types.ObjectId;
  prescriptionId?: Types.ObjectId;
  callId?: Types.ObjectId;
  hospital: string;
  doctor?: string;
  department?: string;
  receptionPhone: string;
  requestedDate: Date;
  requestedTime: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  aiTranscript?: string;
  aiNotes?: string;
  patientNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    prescriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null,
    },
    callId: {
      type: Schema.Types.ObjectId,
      ref: 'Call',
      default: null,
    },
    hospital: {
      type: String,
      required: [true, 'Hospital or clinic name is required'],
      trim: true,
      maxlength: [120, 'Hospital name cannot exceed 120 characters'],
    },
    doctor: {
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
    receptionPhone: {
      type: String,
      required: [true, 'Hospital reception phone number is required'],
      trim: true,
    },
    requestedDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
    },
    requestedTime: {
      type: String,
      required: [true, 'Appointment time is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['PROPOSED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
      default: 'PENDING_CONFIRMATION',
      index: true,
    },
    source: {
      type: String,
      enum: ['AI_CALL', 'HUMAN_CALL', 'MANUAL'],
      default: 'AI_CALL',
    },
    aiTranscript: {
      type: String,
      default: '',
    },
    aiNotes: {
      type: String,
      default: '',
    },
    patientNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ userId: 1, requestedDate: 1 });
appointmentSchema.index({ userId: 1, status: 1 });

export const Appointment = model<IAppointment>('Appointment', appointmentSchema);
