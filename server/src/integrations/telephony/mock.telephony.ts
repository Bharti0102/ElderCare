import {
  ITelephonyProvider,
  InitiateCallParams,
  TelephonyCallResult,
} from './telephony.interface';

interface MockCallRecord {
  providerCallId: string;
  to: string;
  contactName: string;
  relationship: string;
  status:
    | 'REQUESTED'
    | 'CALLING'
    | 'CONNECTED'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED';
  startedAt: Date;
  endedAt?: Date;
}

export class MockTelephonyProvider implements ITelephonyProvider {
  public readonly name = 'MockTelephonyProvider';
  private activeCalls = new Map<string, MockCallRecord>();

  public async initiateCall(
    params: InitiateCallParams
  ): Promise<TelephonyCallResult> {
    const providerCallId = `mock-call-${Date.now()}-${Math.floor(
      Math.random() * 10000
    )}`;
    const startedAt = new Date();

    const record: MockCallRecord = {
      providerCallId,
      to: params.to,
      contactName: params.contactName,
      relationship: params.relationship,
      status: 'CONNECTED',
      startedAt,
    };

    this.activeCalls.set(providerCallId, record);

    console.log(
      `[MockTelephonyProvider] 📞 Call connected to ${params.contactName} (${params.relationship}) at ${params.to}. Call ID: ${providerCallId}`
    );

    return {
      providerCallId,
      status: 'CONNECTED',
      startedAt,
      details: {
        provider: 'MockTelephony',
        to: params.to,
        contactName: params.contactName,
      },
    };
  }

  public async getCallStatus(
    providerCallId: string
  ): Promise<{ status: string; durationSeconds?: number }> {
    const call = this.activeCalls.get(providerCallId);
    if (!call) {
      return { status: 'COMPLETED', durationSeconds: 45 };
    }

    const endTime = call.endedAt ? call.endedAt.getTime() : Date.now();
    const durationSeconds = Math.max(
      0,
      Math.round((endTime - call.startedAt.getTime()) / 1000)
    );

    return {
      status: call.status,
      durationSeconds,
    };
  }

  public async terminateCall(providerCallId: string): Promise<boolean> {
    const call = this.activeCalls.get(providerCallId);
    if (call) {
      call.status = 'COMPLETED';
      call.endedAt = new Date();
      console.log(
        `[MockTelephonyProvider] 📴 Call ${providerCallId} terminated successfully.`
      );
      return true;
    }
    return true;
  }

  public async getProviderStatus() {
    return {
      provider: this.name,
      configured: true,
      isTrial: false,
      hasPurchasedNumber: false,
      hasVerifiedCallerId: false,
      activeFromNumber: null,
      message: 'Mock telephony provider active for simulation testing.',
    };
  }
}
