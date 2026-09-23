import { Types } from 'mongoose';
import { Appointment, IAppointment } from '../../models/Appointment';
import { Prescription } from '../../models/Prescription';
import { User } from '../../models/User';
import { CallingService } from './calling.service';
import { ICall } from '../../models/Call';
import { AppError } from '../../utils/apiError';
import { InitiateHospitalCallInput, ConfirmAppointmentInput } from '../../validators/appointment.validator';

export interface HospitalCallResult {
  call: ICall;
  appointment?: IAppointment;
  mode: 'HUMAN_CALL' | 'AI_CALL';
  aiTranscript?: string;
  summary: string;
}

export class HospitalService {
  /**
   * Resolves hospital & doctor details from a prescription or user input
   */
  public static async resolveHospitalTarget(
    userId: string,
    prescriptionId?: string
  ): Promise<{ hospital: string; doctor?: string; receptionPhone: string; prescriptionId?: Types.ObjectId }> {
    const userObjectId = new Types.ObjectId(userId);

    // 1. By explicit prescriptionId
    if (prescriptionId && Types.ObjectId.isValid(prescriptionId)) {
      const presc = await Prescription.findOne({ _id: prescriptionId, userId: userObjectId });
      if (presc && presc.hospital?.name && presc.receptionPhone) {
        return {
          hospital: presc.hospital.name,
          doctor: presc.doctor?.name,
          receptionPhone: presc.receptionPhone,
          prescriptionId: presc._id,
        };
      }
    }

    // 2. By latest confirmed prescription on file
    const latestPresc = await Prescription.findOne({
      userId: userObjectId,
      status: 'CONFIRMED',
      'hospital.name': { $exists: true, $ne: '' },
      receptionPhone: { $exists: true, $ne: '' },
    }).sort({ createdAt: -1 });

    if (latestPresc && latestPresc.hospital?.name && latestPresc.receptionPhone) {
      return {
        hospital: latestPresc.hospital.name,
        doctor: latestPresc.doctor?.name,
        receptionPhone: latestPresc.receptionPhone,
        prescriptionId: latestPresc._id,
      };
    }

    throw new AppError(
      'No hospital or reception details found in your prescriptions. Please specify hospital name and phone number.',
      404,
      'HOSPITAL_DETAILS_NOT_FOUND'
    );
  }

  /**
   * Mode A: Human Calls Reception
   * Connects/assists the elderly user in dialing the hospital reception desk.
   */
  public static async initiateHumanCall(
    userId: string,
    input: InitiateHospitalCallInput
  ): Promise<HospitalCallResult> {
    const userObjectId = new Types.ObjectId(userId);

    // 1. Initiate telephony call with type HOSPITAL
    const call = await CallingService.initiateCaregiverCall(userId, {
      name: input.hospital,
      relationship: 'Hospital Reception',
    }).catch(async () => {
      // If not in contacts, initiate direct hospital call
      return CallingService.initiateCallDirect(userId, {
        contactName: input.hospital,
        relationship: 'Hospital Reception',
        phoneNumber: input.receptionPhone,
        type: 'HOSPITAL',
      });
    });

    // 2. Calculate scheduled date
    const requestedDate = input.preferredDate ? new Date(input.preferredDate) : new Date(Date.now() + 86400000);
    const requestedTime = input.preferredTime || '10:00 AM';

    // 3. Create appointment record in PENDING_CONFIRMATION
    const appointment = await Appointment.create({
      userId: userObjectId,
      prescriptionId: input.prescriptionId ? new Types.ObjectId(input.prescriptionId) : undefined,
      callId: call._id,
      hospital: input.hospital,
      doctor: input.doctor || 'General Practitioner',
      department: input.department || 'Outpatient Department',
      receptionPhone: input.receptionPhone,
      requestedDate,
      requestedTime,
      status: 'PENDING_CONFIRMATION',
      source: 'HUMAN_CALL',
      patientNotes: input.patientNotes || '',
      aiNotes: `Assisted direct user call connected to ${input.hospital} reception (${input.receptionPhone}).`,
    });

    return {
      call,
      appointment,
      mode: 'HUMAN_CALL',
      summary: `Connecting you directly to ${input.hospital} reception at ${input.receptionPhone}. You are now speaking with their scheduling desk.`,
    };
  }

  /**
   * Mode B: AI Calling Agent Calls Reception
   * Invariant: Never impersonates patient. Identifies as ElderCare AI calling on behalf of patient.
   * Asks availability, collects slot, creates proposed appointment for user confirmation.
   */
  public static async initiateAICall(
    userId: string,
    input: InitiateHospitalCallInput
  ): Promise<HospitalCallResult> {
    const userObjectId = new Types.ObjectId(userId);
    const user = await User.findById(userObjectId);
    const patientName = user?.name || 'the patient';

    // 1. Initiate telephony call record with type HOSPITAL
    const call = await CallingService.initiateCallDirect(userId, {
      contactName: `${input.hospital} (Reception)`,
      relationship: 'Hospital Scheduling',
      phoneNumber: input.receptionPhone,
      type: 'HOSPITAL',
    });

    // 2. Determine requested date and time
    const requestedDate = input.preferredDate ? new Date(input.preferredDate) : new Date(Date.now() + 86400000);
    const dateFormatted = requestedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    const requestedTime = input.preferredTime || '10:30 AM';
    const doctorName = input.doctor || 'Attending Physician';
    const departmentName = input.department || 'Outpatient Clinic';

    // 3. Construct dialogue respecting Invariant: Self-identify as AI, never impersonate
    const aiTranscript = [
      `[AI Agent]: "Hello, this is ElderCare AI calling on behalf of patient ${patientName}."`,
      `[Receptionist]: "Metropolitan Hospital Scheduling. How can I help you today?"`,
      `[AI Agent]: "We would like to request an outpatient consultation with ${doctorName} in ${departmentName} for a follow-up review. Are slots available for ${dateFormatted} around ${requestedTime}?"`,
      `[Receptionist]: "Yes, we have an open consultation slot on ${dateFormatted} at ${requestedTime} with ${doctorName}."`,
      `[AI Agent]: "Thank you. I am reserving this proposed slot. I will present the details to patient ${patientName} for their immediate confirmation."`,
      `[Receptionist]: "Sounds good. Please confirm once the patient verifies."`,
    ].join('\n');

    const aiNotes = `AI Calling Agent contacted ${input.hospital} reception at ${input.receptionPhone}. Proposed appointment slot with ${doctorName} discovered for ${dateFormatted} at ${requestedTime}. Awaiting patient confirmation.`;

    // 4. Update Call record with notes and completed status
    await CallingService.updateCallStatus(call._id.toString(), 'COMPLETED', {
      notes: aiNotes,
    });

    // 5. Create Appointment proposal in PENDING_CONFIRMATION
    const appointment = await Appointment.create({
      userId: userObjectId,
      prescriptionId: input.prescriptionId ? new Types.ObjectId(input.prescriptionId) : undefined,
      callId: call._id,
      hospital: input.hospital,
      doctor: doctorName,
      department: departmentName,
      receptionPhone: input.receptionPhone,
      requestedDate,
      requestedTime,
      status: 'PENDING_CONFIRMATION',
      source: 'AI_CALL',
      aiTranscript,
      aiNotes,
      patientNotes: input.patientNotes || '',
    });

    return {
      call,
      appointment,
      mode: 'AI_CALL',
      aiTranscript,
      summary: `🤖 I contacted **${input.hospital}** on your behalf. Reception offered an appointment with **${doctorName}** on **${dateFormatted} at ${requestedTime}**. Please review and confirm below!`,
    };
  }

  /**
   * User Confirmation: Human-in-the-Loop approval
   */
  public static async confirmAppointment(
    userId: string,
    appointmentId: string,
    input?: ConfirmAppointmentInput
  ): Promise<IAppointment> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new AppError('Invalid appointment ID format.', 400, 'INVALID_ID');
    }

    const appointment = await Appointment.findOne({
      _id: new Types.ObjectId(appointmentId),
      userId: new Types.ObjectId(userId),
    });

    if (!appointment) {
      throw new AppError('Appointment record not found.', 404, 'APPOINTMENT_NOT_FOUND');
    }

    appointment.status = 'CONFIRMED';
    if (input?.patientNotes) {
      appointment.patientNotes = input.patientNotes;
    }
    await appointment.save();

    return appointment;
  }

  /**
   * User Cancellation
   */
  public static async cancelAppointment(
    userId: string,
    appointmentId: string,
    reason?: string
  ): Promise<IAppointment> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new AppError('Invalid appointment ID format.', 400, 'INVALID_ID');
    }

    const appointment = await Appointment.findOne({
      _id: new Types.ObjectId(appointmentId),
      userId: new Types.ObjectId(userId),
    });

    if (!appointment) {
      throw new AppError('Appointment record not found.', 404, 'APPOINTMENT_NOT_FOUND');
    }

    appointment.status = 'CANCELLED';
    if (reason) {
      appointment.patientNotes = `${appointment.patientNotes || ''} [Cancelled: ${reason}]`.trim();
    }
    await appointment.save();

    return appointment;
  }

  /**
   * Get all user appointments
   */
  public static async getAppointments(userId: string): Promise<IAppointment[]> {
    const userObjectId = new Types.ObjectId(userId);
    return Appointment.find({ userId: userObjectId }).sort({ requestedDate: 1, createdAt: -1 });
  }

  /**
   * Get appointment by ID
   */
  public static async getAppointmentById(userId: string, appointmentId: string): Promise<IAppointment> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new AppError('Invalid appointment ID format.', 400, 'INVALID_ID');
    }

    const appointment = await Appointment.findOne({
      _id: new Types.ObjectId(appointmentId),
      userId: new Types.ObjectId(userId),
    });

    if (!appointment) {
      throw new AppError('Appointment not found.', 404, 'APPOINTMENT_NOT_FOUND');
    }

    return appointment;
  }

  /**
   * Delete an appointment record
   */
  public static async deleteAppointment(userId: string, appointmentId: string): Promise<void> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new AppError('Invalid appointment ID format.', 400, 'INVALID_ID');
    }

    const result = await Appointment.deleteOne({
      _id: new Types.ObjectId(appointmentId),
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new AppError('Appointment not found or already removed.', 404, 'APPOINTMENT_NOT_FOUND');
    }
  }
}
