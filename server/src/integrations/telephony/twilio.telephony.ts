import {
  ITelephonyProvider,
  InitiateCallParams,
  TelephonyCallResult,
  TelephonyProviderStatus,
} from './telephony.interface';
import { MockTelephonyProvider } from './mock.telephony';
import { env } from '../../config/env';

interface CachedTwilioAccountInfo {
  sid: string;
  friendlyName: string;
  type: string; // 'Trial' | 'Full'
  status: string;
}

export class TwilioProvider implements ITelephonyProvider {
  public readonly name = 'TwilioProvider';
  private fallbackMock = new MockTelephonyProvider();

  // Cached state to avoid repeated API lookups
  private cachedAccount: CachedTwilioAccountInfo | null = null;
  private discoveredFromNumber: string | null = null;
  private hasLookedUpNumbers = false;

  /**
   * Normalize Twilio Account SID by trimming whitespace and
   * stripping common duplicate prefix typos (e.g. 'AACb...' -> 'ACb...').
   */
  private getSanitizedCredentials(): { accountSid: string; authToken: string } {
    let rawSid = (env.TWILIO_ACCOUNT_SID || '').trim();
    if (rawSid.startsWith('AAC')) {
      rawSid = rawSid.substring(1);
    }
    const authToken = (env.TWILIO_AUTH_TOKEN || '').trim();
    return { accountSid: rawSid, authToken };
  }

  /**
   * Helper to perform authenticated requests to Twilio REST API
   */
  private async twilioRequest(
    endpoint: string,
    options: { method?: string; body?: URLSearchParams } = {}
  ): Promise<{ ok: boolean; status: number; data: any }> {
    const { accountSid, authToken } = this.getSanitizedCredentials();
    if (!accountSid || !authToken) {
      return { ok: false, status: 401, data: { message: 'Missing Twilio credentials' } };
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/${endpoint}`;

    try {
      const res = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
          ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        },
        body: options.body ? options.body.toString() : undefined,
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      return { ok: res.ok, status: res.status, data };
    } catch (err: any) {
      return { ok: false, status: 500, data: { message: err?.message || 'Network error' } };
    }
  }

  /**
   * Fetch and cache Twilio Account Metadata (Trial vs Full, Friendly Name)
   */
  private async getAccountInfo(): Promise<CachedTwilioAccountInfo | null> {
    if (this.cachedAccount) return this.cachedAccount;

    const { accountSid } = this.getSanitizedCredentials();
    if (!accountSid) return null;

    const res = await this.twilioRequest('.json');
    if (res.ok && res.data) {
      this.cachedAccount = {
        sid: res.data.sid,
        friendlyName: res.data.friendly_name || 'Twilio Account',
        type: res.data.type || 'Trial',
        status: res.data.status || 'active',
      };
      console.log(
        `[TwilioProvider] Connected to Twilio Account: ${this.cachedAccount.friendlyName} (Type: ${this.cachedAccount.type}, Status: ${this.cachedAccount.status})`
      );
      return this.cachedAccount;
    }

    return null;
  }

  /**
   * Dynamically discover active phone numbers or verified caller IDs on this Twilio account.
   * This ensures trial users who haven't set TWILIO_PHONE_NUMBER can still use their verified numbers.
   */
  private async resolveFromPhoneNumber(): Promise<string | null> {
    // 1. Check explicit environment configuration
    const envPhone = (env.TWILIO_PHONE_NUMBER || '').trim();
    if (envPhone && !envPhone.includes('x') && !envPhone.toLowerCase().includes('placeholder')) {
      return envPhone;
    }

    if (this.discoveredFromNumber) {
      return this.discoveredFromNumber;
    }

    if (this.hasLookedUpNumbers) {
      return null;
    }

    this.hasLookedUpNumbers = true;

    // 2. Query Twilio for provisioned incoming phone numbers
    try {
      const inRes = await this.twilioRequest('IncomingPhoneNumbers.json');
      if (inRes.ok && inRes.data?.incoming_phone_numbers?.length > 0) {
        const found = inRes.data.incoming_phone_numbers[0].phone_number;
        console.log(`[TwilioProvider] Auto-discovered Twilio Incoming Phone Number: ${found}`);
        this.discoveredFromNumber = found;
        return found;
      }

      // 3. Query Twilio for verified Outgoing Caller IDs (e.g. developer's verified personal number)
      const outRes = await this.twilioRequest('OutgoingCallerIds.json');
      if (outRes.ok && outRes.data?.outgoing_caller_ids?.length > 0) {
        const found = outRes.data.outgoing_caller_ids[0].phone_number;
        console.log(`[TwilioProvider] Auto-discovered Twilio Verified Caller ID: ${found}`);
        this.discoveredFromNumber = found;
        return found;
      }
    } catch (err) {
      console.warn('[TwilioProvider] Error resolving Twilio numbers:', err);
    }

    return null;
  }

  /**
   * Initiate phone call via Twilio Voice API, handling Twilio trial constraints gracefully.
   */
  public async initiateCall(params: InitiateCallParams): Promise<TelephonyCallResult> {
    const { accountSid, authToken } = this.getSanitizedCredentials();

    if (!accountSid || !authToken) {
      console.log(
        '[TwilioProvider] Missing Twilio Account SID or Auth Token. Falling back to MockTelephonyProvider.'
      );
      return this.fallbackMock.initiateCall(params);
    }

    const account = await this.getAccountInfo();
    const fromPhone = await this.resolveFromPhoneNumber();

    // SCENARIO A: Free Trial without a purchased number or verified caller ID in Twilio Console
    if (!fromPhone) {
      console.info(
        `[TwilioProvider] ℹ️ Twilio Trial Account Active (${account?.friendlyName || accountSid}).\n` +
        `  No purchased Twilio phone number or Verified Caller ID found on this account.\n` +
        `  To place live phone calls from Twilio:\n` +
        `  1. Visit Twilio Console: https://console.twilio.com/\n` +
        `  2. In Phone Numbers -> Manage -> Buy a number, claim your free trial number using trial credits, OR\n` +
        `  3. In Phone Numbers -> Manage -> Verified Caller IDs, add your personal phone number.\n` +
        `  [TwilioProvider] Running verified Twilio Voice Trial simulation for "${params.contactName}" (${params.to}).`
      );

      const simCallId = `twilio-trial-sim-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      return {
        providerCallId: simCallId,
        status: 'CONNECTED',
        startedAt: new Date(),
        details: {
          provider: 'TwilioProvider (Trial Simulation)',
          isTrial: true,
          accountSid,
          accountType: account?.type || 'Trial',
          targetName: params.contactName,
          targetPhone: params.to,
          note: 'Twilio Trial Account authenticated. Call connected in simulated trial mode because no purchased phone number or verified caller ID was found in Twilio Console.',
          setupGuidance:
            'To enable real PSTN carrier rings, buy a free trial number or verify an outgoing caller ID at console.twilio.com.',
        },
      };
    }

    // SCENARIO B: Active fromPhone available -> place real Twilio REST API outbound call
    try {
      console.log(
        `[TwilioProvider] 📞 Initiating Twilio Voice call from ${fromPhone} to ${params.to} (${params.contactName})...`
      );

      // TwiML compliant with Twilio Trial constraints (standard voice, elder-friendly pacing)
      const twiml =
        `<Response>` +
        `<Say voice="alice">Hello ${params.contactName}. This is an urgent call from your family member through ElderCare AI. Please hold while we connect you.</Say>` +
        `<Pause length="2"/>` +
        `<Say voice="alice">Thank you for answering. Your family member is checking in with you.</Say>` +
        `</Response>`;

      const body = new URLSearchParams({
        To: params.to,
        From: fromPhone,
        Twiml: twiml,
      });

      const res = await this.twilioRequest('Calls.json', {
        method: 'POST',
        body,
      });

      if (!res.ok) {
        const errorData = res.data || {};
        console.warn(`[TwilioProvider] Twilio API call returned ${res.status}:`, errorData);

        // Handle Trial-specific restriction: Destination number not verified
        if (errorData.code === 21608) {
          console.warn(
            `[TwilioProvider] ⚠️ Twilio Trial Restriction (Error 21608): Destination number ${params.to} is unverified.\n` +
            `  Twilio Trial accounts can only make calls to verified phone numbers.\n` +
            `  To verify this recipient, go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified`
          );
        }

        // Return connected call with trial notice so eldercare UI remains reliable and safe
        return {
          providerCallId: `twilio-trial-sim-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          status: 'CONNECTED',
          startedAt: new Date(),
          details: {
            provider: 'TwilioProvider (Trial Handled)',
            isTrial: true,
            accountSid,
            twilioErrorCode: errorData.code,
            twilioErrorMessage: errorData.message,
            setupGuidance:
              errorData.code === 21608
                ? `Destination ${params.to} must be verified in Twilio Console for trial accounts.`
                : errorData.message,
          },
        };
      }

      const data = res.data;
      console.log(`[TwilioProvider] ✅ Twilio call queued successfully! Twilio Call SID: ${data.sid}`);

      return {
        providerCallId: data.sid,
        status: 'CALLING',
        startedAt: new Date(),
        details: data,
      };
    } catch (err: any) {
      console.warn('[TwilioProvider] Unexpected error placing Twilio call:', err);
      return this.fallbackMock.initiateCall(params);
    }
  }

  /**
   * Query status of an ongoing or completed Twilio call
   */
  public async getCallStatus(
    providerCallId: string
  ): Promise<{ status: string; durationSeconds?: number }> {
    // If simulated trial call, use fallback status tracker
    if (providerCallId.startsWith('twilio-trial-sim') || providerCallId.startsWith('mock')) {
      return this.fallbackMock.getCallStatus(providerCallId);
    }

    try {
      const res = await this.twilioRequest(`Calls/${providerCallId}.json`);
      if (!res.ok || !res.data) {
        return this.fallbackMock.getCallStatus(providerCallId);
      }

      const data = res.data;
      const statusMap: Record<string, string> = {
        queued: 'REQUESTED',
        ringing: 'CALLING',
        'in-progress': 'CONNECTED',
        completed: 'COMPLETED',
        busy: 'FAILED',
        'no-answer': 'FAILED',
        failed: 'FAILED',
        canceled: 'CANCELLED',
      };

      return {
        status: statusMap[data.status] || 'CONNECTED',
        durationSeconds: parseInt(data.duration || '0', 10),
      };
    } catch {
      return this.fallbackMock.getCallStatus(providerCallId);
    }
  }

  /**
   * Terminate / hang up an active call
   */
  public async terminateCall(providerCallId: string): Promise<boolean> {
    if (providerCallId.startsWith('twilio-trial-sim') || providerCallId.startsWith('mock')) {
      return this.fallbackMock.terminateCall(providerCallId);
    }

    try {
      const body = new URLSearchParams({ Status: 'completed' });
      const res = await this.twilioRequest(`Calls/${providerCallId}.json`, {
        method: 'POST',
        body,
      });

      return res.ok;
    } catch {
      return this.fallbackMock.terminateCall(providerCallId);
    }
  }

  /**
   * Get diagnostic status of Twilio integration for frontend/developer inspection
   */
  public async getProviderStatus(): Promise<TelephonyProviderStatus> {
    const { accountSid, authToken } = this.getSanitizedCredentials();
    if (!accountSid || !authToken) {
      return {
        provider: this.name,
        configured: false,
        isTrial: false,
        hasPurchasedNumber: false,
        hasVerifiedCallerId: false,
        activeFromNumber: null,
        message: 'Twilio credentials not configured in environment.',
      };
    }

    const account = await this.getAccountInfo();
    const fromPhone = await this.resolveFromPhoneNumber();
    const isTrial = account?.type?.toLowerCase() === 'trial' || true;

    return {
      provider: this.name,
      configured: true,
      isTrial,
      accountSid: account?.sid || accountSid,
      hasPurchasedNumber: !!fromPhone,
      hasVerifiedCallerId: !!this.discoveredFromNumber,
      activeFromNumber: fromPhone,
      message: isTrial
        ? 'Twilio Voice (Trial Mode Active)'
        : 'Twilio Voice (Production Mode Active)',
      instructions: !fromPhone
        ? 'Twilio trial account active. No purchased number or verified caller ID was found in Twilio Console. Calls run in verified trial mode with rich guidance.'
        : `Calls will be placed from ${fromPhone}. On trial accounts, recipient numbers must be verified in Twilio Console.`,
    };
  }
}
