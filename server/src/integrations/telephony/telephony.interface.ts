export interface InitiateCallParams {
  to: string;
  from?: string;
  contactName: string;
  relationship: string;
  userMessage?: string;
}

export interface TelephonyCallResult {
  providerCallId: string;
  status:
    | 'REQUESTED'
    | 'CALLING'
    | 'CONNECTED'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED';
  startedAt: Date;
  details?: any;
}

export interface ITelephonyProvider {
  readonly name: string;
  initiateCall(params: InitiateCallParams): Promise<TelephonyCallResult>;
  getCallStatus(
    providerCallId: string
  ): Promise<{ status: string; durationSeconds?: number }>;
  terminateCall(providerCallId: string): Promise<boolean>;
}
