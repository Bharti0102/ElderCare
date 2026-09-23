import {
  ITelephonyProvider,
  InitiateCallParams,
  TelephonyCallResult,
} from './telephony.interface';
import { MockTelephonyProvider } from './mock.telephony';
import { env } from '../../config/env';

export class TwilioProvider implements ITelephonyProvider {
  public readonly name = 'TwilioProvider';
  private fallbackMock = new MockTelephonyProvider();

  public async initiateCall(
    params: InitiateCallParams
  ): Promise<TelephonyCallResult> {
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const fromPhone = env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhone) {
      console.log(
        '[TwilioProvider] Twilio credentials not configured in environment. Using MockTelephonyProvider.'
      );
      return this.fallbackMock.initiateCall(params);
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const twiml = `<Response><Say voice="Polly.Joanna">Hello ${params.contactName}. This is an urgent call from your family member through ElderCare AI. Please hold while we connect you.</Say></Response>`;

      const body = new URLSearchParams({
        To: params.to,
        From: fromPhone,
        Twiml: twiml,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        throw new Error(
          `Twilio API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      return {
        providerCallId: data.sid,
        status: 'CALLING',
        startedAt: new Date(),
        details: data,
      };
    } catch (err) {
      console.warn(
        '[TwilioProvider] Failed to initiate call with Twilio. Falling back to MockTelephonyProvider:',
        err
      );
      return this.fallbackMock.initiateCall(params);
    }
  }

  public async getCallStatus(
    providerCallId: string
  ): Promise<{ status: string; durationSeconds?: number }> {
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return this.fallbackMock.getCallStatus(providerCallId);
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${providerCallId}.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const response = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
      });

      if (!response.ok) {
        return this.fallbackMock.getCallStatus(providerCallId);
      }

      const data = await response.json();
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

  public async terminateCall(providerCallId: string): Promise<boolean> {
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return this.fallbackMock.terminateCall(providerCallId);
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${providerCallId}.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const body = new URLSearchParams({ Status: 'completed' });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      return response.ok;
    } catch {
      return this.fallbackMock.terminateCall(providerCallId);
    }
  }
}
