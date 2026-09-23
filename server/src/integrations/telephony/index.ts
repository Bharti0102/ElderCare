import { ITelephonyProvider } from './telephony.interface';
import { MockTelephonyProvider } from './mock.telephony';
import { WebRTCTelephonyProvider } from './webrtc.telephony';
import { env } from '../../config/env';

export class TelephonyFactory {
  private static webrtcInstance: WebRTCTelephonyProvider | null = null;
  private static mockInstance: MockTelephonyProvider | null = null;

  /**
   * Get WebRTC provider instance (Primary Calling Engine)
   */
  public static getWebRTCProvider(): WebRTCTelephonyProvider {
    if (!this.webrtcInstance) {
      this.webrtcInstance = new WebRTCTelephonyProvider();
    }
    return this.webrtcInstance;
  }

  /**
   * Get dedicated Mock provider instance
   */
  public static getMockProvider(): MockTelephonyProvider {
    if (!this.mockInstance) {
      this.mockInstance = new MockTelephonyProvider();
    }
    return this.mockInstance;
  }

  /**
   * Primary resolver for calling tasks:
   * Defaults to WebRTCTelephonyProvider for direct in-browser audio calling.
   */
  public static getProvider(target?: 'webrtc' | 'mock'): ITelephonyProvider {
    if (target === 'mock' || env.TELEPHONY_PROVIDER === 'mock') {
      return this.getMockProvider();
    }

    return this.getWebRTCProvider();
  }

  /**
   * Status report for frontend diagnostics
   */
  public static async getCombinedStatus() {
    const provider = this.getProvider();
    if (provider.getProviderStatus) {
      return await provider.getProviderStatus();
    }
    return {
      provider: provider.name,
      configured: true,
      isTrial: false,
      hasPurchasedNumber: true,
      hasVerifiedCallerId: true,
      activeFromNumber: 'In-Browser Device Audio (WebRTC)',
      message: 'WebRTC Direct In-Browser Audio Telephony Active',
      instructions: 'Calls are conducted directly through your browser using your microphone and speakers.',
    };
  }
}

export * from './telephony.interface';
export * from './mock.telephony';
export * from './webrtc.telephony';


