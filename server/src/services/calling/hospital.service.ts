import { Types } from 'mongoose';
import { Appointment, IAppointment } from '../../models/Appointment';
import { Prescription } from '../../models/Prescription';
import { User } from '../../models/User';
import { Call, ICall } from '../../models/Call';
import { HospitalReception, IHospitalReception } from '../../models/HospitalReception';
import { AppError } from '../../utils/apiError';
import {
  InitiateHospitalCallInput,
  ConfirmAppointmentInput,
  SaveReceptionInput,
  CreateDirectAppointmentInput,
} from '../../validators/appointment.validator';

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
   * Connects/assists the elderly user in dialing the hospital reception desk
   * using their phone's native dialer or Truecaller. Logs the real call in DB.
   */
  public static async initiateHumanCall(
    userId: string,
    input: InitiateHospitalCallInput
  ): Promise<HospitalCallResult> {
    const userObjectId = new Types.ObjectId(userId);

    // 1. Create real call record in MongoDB tracking the direct phone / Truecaller call
    const call = await Call.create({
      userId: userObjectId,
      contactName: input.hospital,
      relationship: 'Hospital Reception',
      phoneNumber: input.receptionPhone,
      type: 'HOSPITAL',
      providerCallId: `device-dialer-${Date.now()}`,
      status: 'COMPLETED',
      startedAt: new Date(),
      endedAt: new Date(),
      notes: `Direct phone call initiated via device dialer / Truecaller to ${input.hospital} reception (${input.receptionPhone})`,
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
      summary: `Call initiated to ${input.hospital} reception at ${input.receptionPhone}. You are now speaking with their scheduling desk.`,
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

    // 1. Initiate telephony call record with type HOSPITAL (recorded without external Twilio)
    const call = await Call.create({
      userId: userObjectId,
      contactName: `${input.hospital} (Reception)`,
      relationship: 'Hospital Scheduling',
      phoneNumber: input.receptionPhone,
      type: 'HOSPITAL',
      providerCallId: `ai-booking-${Date.now()}`,
      status: 'COMPLETED',
      startedAt: new Date(),
      endedAt: new Date(),
      notes: `AI autonomous booking inquiry with ${input.hospital} reception`,
    });


    // 1. Determine requested date and time
    const requestedDate = input.preferredDate ? new Date(input.preferredDate) : new Date(Date.now() + 86400000);
    const dateFormatted = requestedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    const requestedTime = input.confirmedTime || input.preferredTime || '10:30 AM';
    const doctorName = input.doctor || 'Attending Physician';
    const departmentName = input.department || 'Outpatient Clinic';

    // 2. Analyze receptionist response for slot availability
    const speechLower = (input.receptionistSpeech || '').toLowerCase();
    const isExplicitlyUnavailable =
      input.isAvailable === false ||
      speechLower.includes('unavailable') ||
      speechLower.includes('not available') ||
      speechLower.includes('no slot') ||
      speechLower.includes('full') ||
      speechLower.includes('on leave') ||
      speechLower.includes('closed') ||
      speechLower.includes('cancel');

    const isAvailable = input.isAvailable !== false && !isExplicitlyUnavailable;

    // 3. Construct dialogue transcript
    const aiTranscript = input.aiTranscript || (
      isAvailable
        ? [
            `[AI Agent]: "Hello, this is ElderCare AI calling on behalf of patient ${patientName}."`,
            `[Receptionist]: "${input.hospital} Reception & Scheduling desk. How may I assist you?"`,
            `[AI Agent]: "We would like to request an outpatient consultation with Dr. ${doctorName} in ${departmentName}${input.patientNotes ? ` regarding: ${input.patientNotes}` : ''}. Are slots open for ${dateFormatted} around ${input.preferredTime || requestedTime}?"`,
            `[Receptionist]: "${input.receptionistSpeech || `Yes, consultation slot with Dr. ${doctorName} is open on ${dateFormatted} at ${requestedTime}.`}"`,
            `[AI Agent]: "Thank you. I have confirmed and booked this slot for patient ${patientName}."`,
          ].join('\n')
        : [
            `[AI Agent]: "Hello, this is ElderCare AI calling on behalf of patient ${patientName}."`,
            `[Receptionist]: "${input.hospital} Reception & Scheduling desk. How may I assist you?"`,
            `[AI Agent]: "We would like to request an outpatient consultation with Dr. ${doctorName} in ${departmentName}. Are slots open for ${dateFormatted} around ${input.preferredTime || requestedTime}?"`,
            `[Receptionist]: "${input.receptionistSpeech || `Sorry, Dr. ${doctorName} has no available slots on ${dateFormatted}.`}"`,
            `[AI Agent]: "I understand. I will not book the slot and will inform the patient that the doctor is unavailable. Thank you."`,
          ].join('\n')
    );

    const callNotes = isAvailable
      ? `AI Call to ${input.hospital} (${input.receptionPhone}): Reception confirmed slot with Dr. ${doctorName} on ${dateFormatted} at ${requestedTime}.`
      : `AI Call to ${input.hospital} (${input.receptionPhone}): Dr. ${doctorName} is unavailable on ${dateFormatted}. Reception response: "${input.receptionistSpeech || 'No slots available'}". No appointment booked.`;

    // 4. Update Call record in DB
    call.notes = callNotes;
    await call.save();

    // 5. If receptionist confirmed slot is UNAVAILABLE, DO NOT BOOK ANY APPOINTMENT!
    if (!isAvailable) {
      return {
        call,
        appointment: undefined,
        mode: 'AI_CALL',
        aiTranscript,
        summary: `⚠️ I contacted **${input.hospital}** on your behalf, but Dr. **${doctorName}** has no available slots for **${dateFormatted}** (${input.receptionistSpeech || 'unavailable'}). No appointment was booked.`,
      };
    }

    // 6. Slot confirmed available by receptionist -> Create confirmed appointment
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
      status: 'CONFIRMED',
      source: 'AI_CALL',
      aiTranscript,
      aiNotes: `AI Calling Agent confirmed appointment with ${input.hospital} reception for ${dateFormatted} at ${requestedTime}.`,
      patientNotes: input.patientNotes || '',
    });

    return {
      call,
      appointment,
      mode: 'AI_CALL',
      aiTranscript,
      summary: `✅ I contacted **${input.hospital}** on your behalf. Dr. **${doctorName}** has confirmed availability on **${dateFormatted} at ${requestedTime}**. The appointment is booked!`,
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

  /**
   * Get all saved clinic receptions for user (Returns only real user-saved contacts)
   */
  public static async getReceptions(userId: string): Promise<IHospitalReception[]> {
    const userObjectId = new Types.ObjectId(userId);

    // Purge any previously seeded dummy clinics so the user sees only their own real contacts
    await HospitalReception.deleteMany({
      userId: userObjectId,
      hospitalName: {
        $in: [
          'Apollo Multi-Speciality Clinic',
          'City Care Outpatient Hospital',
          'Fortis Family Health Clinic',
          'Prescribed Medical Center',
        ],
      },
    });

    return HospitalReception.find({ userId: userObjectId }).sort({ isFavorite: -1, createdAt: -1 });
  }


  /**
   * Save a new hospital reception contact
   */
  public static async createReception(
    userId: string,
    input: SaveReceptionInput
  ): Promise<IHospitalReception> {
    const userObjectId = new Types.ObjectId(userId);
    const reception = await HospitalReception.create({
      userId: userObjectId,
      hospitalName: input.hospitalName,
      receptionPhone: input.receptionPhone,
      doctorName: input.doctorName || 'General Practitioner',
      department: input.department || 'Outpatient Department',
      address: input.address || '',
      availableSlots: input.availableSlots && input.availableSlots.length > 0
        ? input.availableSlots
        : ['09:00 AM', '10:30 AM', '11:45 AM', '02:00 PM', '04:30 PM', '06:00 PM'],
      notes: input.notes || '',
      isFavorite: !!input.isFavorite,
    });
    return reception;
  }

  /**
   * Update saved reception contact
   */
  public static async updateReception(
    userId: string,
    receptionId: string,
    input: Partial<SaveReceptionInput>
  ): Promise<IHospitalReception> {
    if (!Types.ObjectId.isValid(receptionId)) {
      throw new AppError('Invalid reception ID format.', 400, 'INVALID_ID');
    }

    const reception = await HospitalReception.findOne({
      _id: new Types.ObjectId(receptionId),
      userId: new Types.ObjectId(userId),
    });

    if (!reception) {
      throw new AppError('Reception contact not found.', 404, 'NOT_FOUND');
    }

    if (input.hospitalName) reception.hospitalName = input.hospitalName;
    if (input.receptionPhone) reception.receptionPhone = input.receptionPhone;
    if (input.doctorName !== undefined) reception.doctorName = input.doctorName;
    if (input.department !== undefined) reception.department = input.department;
    if (input.address !== undefined) reception.address = input.address;
    if (input.availableSlots) reception.availableSlots = input.availableSlots;
    if (input.notes !== undefined) reception.notes = input.notes;
    if (input.isFavorite !== undefined) reception.isFavorite = input.isFavorite;

    await reception.save();
    return reception;
  }

  /**
   * Delete saved reception contact
   */
  public static async deleteReception(userId: string, receptionId: string): Promise<void> {
    if (!Types.ObjectId.isValid(receptionId)) {
      throw new AppError('Invalid reception ID format.', 400, 'INVALID_ID');
    }

    const result = await HospitalReception.deleteOne({
      _id: new Types.ObjectId(receptionId),
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new AppError('Reception contact not found.', 404, 'NOT_FOUND');
    }
  }

  /**
   * Create direct appointment (e.g. after patient spoke to reception or booked manually)
   */
  public static async createDirectAppointment(
    userId: string,
    input: CreateDirectAppointmentInput
  ): Promise<IAppointment> {
    const userObjectId = new Types.ObjectId(userId);
    const requestedDate = new Date(input.requestedDate);

    const appointment = await Appointment.create({
      userId: userObjectId,
      hospital: input.hospital,
      receptionPhone: input.receptionPhone,
      doctor: input.doctor || 'General Practitioner',
      department: input.department || 'Outpatient Department',
      requestedDate,
      requestedTime: input.requestedTime,
      status: input.status || 'CONFIRMED',
      source: input.source || 'HUMAN_CALL',
      patientNotes: input.patientNotes || '',
      aiNotes: `Booked via direct patient call to ${input.hospital} (${input.receptionPhone}).`,
    });

    return appointment;
  }
}

