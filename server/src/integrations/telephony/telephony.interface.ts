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

export interface TelephonyProviderStatus {
  provider: string;
  configured: boolean;
  isTrial: boolean;
  accountSid?: string;
  hasPurchasedNumber: boolean;
  hasVerifiedCallerId: boolean;
  activeFromNumber?: string | null;
  message: string;
  instructions?: string;
  secondaryProvider?: {
    name: string;
    configured: boolean;
    accountSid?: string;
    message?: string;
  };
}

export interface ITelephonyProvider {
  readonly name: string;
  initiateCall(params: InitiateCallParams): Promise<TelephonyCallResult>;
  getCallStatus(
    providerCallId: string
  ): Promise<{ status: string; durationSeconds?: number }>;
  terminateCall(providerCallId: string): Promise<boolean>;
  getProviderStatus?(): Promise<TelephonyProviderStatus>;
}
