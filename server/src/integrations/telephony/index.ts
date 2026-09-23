import { ITelephonyProvider } from './telephony.interface';
import { MockTelephonyProvider } from './mock.telephony';
import { TwilioProvider } from './twilio.telephony';
import { env } from '../../config/env';

export class TelephonyFactory {
  private static instance: ITelephonyProvider | null = null;

  public static getProvider(): ITelephonyProvider {
    if (!this.instance) {
      if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
        this.instance = new TwilioProvider();
      } else {
        this.instance = new MockTelephonyProvider();
      }
    }
    return this.instance;
  }
}

export * from './telephony.interface';
