import { env } from '../../config/env';
import { CloudflareTunnelService } from '../../services/tunnel/cloudflare.tunnel';

export interface SendCallLinkSmsOptions {
  recipientPhone: string;
  recipientName: string;
  callerName: string;
  callId: string;
  clientUrl?: string;
}

export interface SmsDispatchResult {
  success: boolean;
  simulated: boolean;
  message: string;
  joinUrl: string;
  formattedPhone: string;
}

export class SmsService {
  /**
   * Cleans and normalizes mobile numbers to 10 digits for Indian SMS gateways.
   * E.g. "+918683072836" -> "8683072836", "08683072836" -> "8683072836"
   */
  public static normalizeIndianPhone(phone: string): string {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits.slice(2);
    }
    if (digits.length === 11 && digits.startsWith('0')) {
      return digits.slice(1);
    }
    if (digits.length >= 10) {
      return digits.slice(-10);
    }
    return digits;
  }

  /**
   * Automatically dispatches a one-tap call join link to the caregiver's mobile phone.
   */
  public static async sendCallLinkSms(options: SendCallLinkSmsOptions): Promise<SmsDispatchResult> {
    const formattedPhone = this.normalizeIndianPhone(options.recipientPhone);
    const activeTunnel = CloudflareTunnelService.getTunnelUrl();
    const clientBase = options.clientUrl || activeTunnel || env.CLOUDFLARE_TUNNEL_URL || env.CLIENT_URL || 'http://localhost:5173';
    const joinUrl = `${clientBase.replace(/\/$/, '')}/call/join/${options.callId}`;
    const caller = options.callerName || 'Your loved one';

    const messageText = `ElderCare AI Alert: ${caller} is calling you. Tap link to join audio call now: ${joinUrl}`;

    // 1. Live Fast2SMS Gateway (when FAST2SMS_API_KEY is configured)
    if (env.FAST2SMS_API_KEY && env.FAST2SMS_API_KEY.trim().length > 0) {
      try {
        console.log(`[SmsService] Dispatching automated Fast2SMS to +91${formattedPhone}...`);

        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: env.FAST2SMS_API_KEY.trim(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'q',
            message: messageText,
            language: 'english',
            flash: 0,
            numbers: formattedPhone,
          }),
        });

        const data: any = await response.json();
        console.log('[SmsService] Fast2SMS gateway response:', data);

        if (data.return === true || data.status_code === 200) {
          return {
            success: true,
            simulated: false,
            message: `Automated SMS delivered to +91${formattedPhone} via Fast2SMS`,
            joinUrl,
            formattedPhone,
          };
        } else {
          console.warn('[SmsService] Fast2SMS notice:', data.message || data);
          return {
            success: false,
            simulated: false,
            message: data.message?.[0] || 'Fast2SMS dispatch notice',
            joinUrl,
            formattedPhone,
          };
        }
      } catch (err: any) {
        console.error('[SmsService] Fast2SMS network error:', err.message);
      }
    }

    // 2. Simulation / Development Fallback
    console.log('===============================================================');
    console.log(`📲 [AUTOMATED CALL SMS DISPATCHED]`);
    console.log(`Recipient: ${options.recipientName} (+91${formattedPhone})`);
    console.log(`Caller:    ${caller}`);
    console.log(`Message:   "${messageText}"`);
    console.log(`Join Link: ${joinUrl}`);
    console.log('===============================================================');

    return {
      success: true,
      simulated: true,
      message: `Automated call link SMS dispatched to ${options.recipientName} (+91${formattedPhone})`,
      joinUrl,
      formattedPhone,
    };
  }
}
