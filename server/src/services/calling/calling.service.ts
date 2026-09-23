import { Call, ICall, CallStatus } from '../../models/Call';
import { CaregiverService } from './caregiver.service';
import { TelephonyFactory } from '../../integrations/telephony';
import { InitiateCaregiverCallInput } from '../../validators/calling.validator';
import { AppError } from '../../utils/apiError';

export class CallingService {
  /**
   * Initiates a phone call to the user's verified caregiver.
   * Enforces invariant: Never hardcodes phone numbers, never lets AI call directly.
   */
  public static async initiateCaregiverCall(
    userId: string,
    input?: InitiateCaregiverCallInput
  ): Promise<ICall> {
    // 1. Resolve authorized caregiver contact
    const contact = await CaregiverService.resolveCaregiver(userId, input);

    // 2. Invoke telephony provider
    const telephony = TelephonyFactory.getProvider();
    const result = await telephony.initiateCall({
      to: contact.phone,
      contactName: contact.name,
      relationship: contact.relationship,
      userMessage: input?.message,
    });

    // 3. Persist call record in MongoDB
    const call = await Call.create({
      userId,
      contactId: contact._id,
      contactName: contact.name,
      relationship: contact.relationship,
      phoneNumber: contact.phone,
      type: 'CAREGIVER',
      providerCallId: result.providerCallId,
      status: result.status,
      startedAt: result.startedAt,
      notes: input?.message || 'Caregiver direct-dial initiated',
    });

    return call;
  }

  /**
   * Initiates a direct call (e.g. to verified hospital reception)
   */
  public static async initiateCallDirect(
    userId: string,
    params: {
      contactName: string;
      relationship: string;
      phoneNumber: string;
      type: 'CAREGIVER' | 'HOSPITAL';
      notes?: string;
    }
  ): Promise<ICall> {
    const telephony = TelephonyFactory.getProvider();
    const result = await telephony.initiateCall({
      to: params.phoneNumber,
      contactName: params.contactName,
      relationship: params.relationship,
      userMessage: params.notes,
    });

    const call = await Call.create({
      userId,
      contactName: params.contactName,
      relationship: params.relationship,
      phoneNumber: params.phoneNumber,
      type: params.type,
      providerCallId: result.providerCallId,
      status: result.status,
      startedAt: result.startedAt,
      notes: params.notes || `${params.type} call initiated`,
    });

    return call;
  }

  /**
   * Get call history for user.
   */
  public static async getCalls(
    userId: string,
    filter?: { type?: string; status?: string }
  ): Promise<ICall[]> {
    const query: any = { userId };
    if (filter?.type) query.type = filter.type;
    if (filter?.status) query.status = filter.status;

    return Call.find(query).sort({ createdAt: -1 });
  }

  /**
   * Get single call record.
   */
  public static async getCallById(
    userId: string,
    callId: string
  ): Promise<ICall> {
    const call = await Call.findOne({ _id: callId, userId });
    if (!call) {
      throw new AppError('Call record not found', 404, 'NOT_FOUND');
    }

    // Refresh live status if active
    if (call.status === 'CALLING' || call.status === 'CONNECTED') {
      try {
        const telephony = TelephonyFactory.getProvider();
        const live = await telephony.getCallStatus(call.providerCallId);
        if (live.status && live.status !== call.status) {
          call.status = live.status as CallStatus;
          if (live.durationSeconds !== undefined) {
            call.durationSeconds = live.durationSeconds;
          }
          await call.save();
        }
      } catch {
        // preserve local status on error
      }
    }

    return call;
  }

  /**
   * Update call status manually or from webhook / AI service.
   */
  public static async updateCallStatus(
    callIdOrUserId: string,
    callIdOrStatus: string | CallStatus,
    statusOrOptions?: CallStatus | { durationSeconds?: number; notes?: string },
    durationSeconds?: number,
    notes?: string
  ): Promise<ICall> {
    let call: ICall | null = null;
    let newStatus: CallStatus;
    let dur = durationSeconds;
    let note = notes;

    if (typeof statusOrOptions === 'object') {
      // Called as: updateCallStatus(callId, 'COMPLETED', { notes: '...' })
      call = await Call.findById(callIdOrUserId);
      newStatus = callIdOrStatus as CallStatus;
      dur = statusOrOptions.durationSeconds;
      note = statusOrOptions.notes;
    } else if (statusOrOptions) {
      // Called as: updateCallStatus(userId, callId, status, duration, notes)
      call = await Call.findOne({ _id: callIdOrStatus, userId: callIdOrUserId });
      newStatus = statusOrOptions as CallStatus;
    } else {
      call = await Call.findById(callIdOrUserId);
      newStatus = callIdOrStatus as CallStatus;
    }

    if (!call) {
      throw new AppError('Call record not found', 404, 'NOT_FOUND');
    }

    call.status = newStatus;
    if (note) call.notes = note;
    if (dur !== undefined) {
      call.durationSeconds = dur;
    }

    if (newStatus === 'COMPLETED' || newStatus === 'FAILED' || newStatus === 'CANCELLED') {
      call.endedAt = new Date();
      if (!call.durationSeconds && call.startedAt) {
        call.durationSeconds = Math.max(
          0,
          Math.round((call.endedAt.getTime() - call.startedAt.getTime()) / 1000)
        );
      }
    }

    await call.save();
    return call;
  }

  /**
   * Terminate active phone call.
   */
  public static async hangupCall(
    userId: string,
    callId: string
  ): Promise<ICall> {
    const call = await Call.findOne({ _id: callId, userId });
    if (!call) {
      throw new AppError('Call record not found', 404, 'NOT_FOUND');
    }

    const telephony = TelephonyFactory.getProvider();
    await telephony.terminateCall(call.providerCallId);

    call.status = 'COMPLETED';
    call.endedAt = new Date();
    call.durationSeconds = Math.max(
      0,
      Math.round((call.endedAt.getTime() - call.startedAt.getTime()) / 1000)
    );

    await call.save();
    return call;
  }
}
