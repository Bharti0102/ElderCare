import axios from 'axios';

const API_BASE = '/api/notifications';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export class PushNotificationService {
  /**
   * Checks if Push Notifications and Service Workers are supported by the browser.
   */
  public static isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /**
   * Registers the background service worker.
   */
  public static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      return registration;
    } catch (err: any) {
      console.warn('[PushService] Service worker registration notice:', err.message);
      return null;
    }
  }

  /**
   * Fetches the server VAPID public key.
   */
  public static async getVapidPublicKey(): Promise<string | null> {
    try {
      const res = await axios.get(`${API_BASE}/vapid-key`);
      return res.data?.data?.publicKey || null;
    } catch (err: any) {
      console.error('[PushService] Failed to fetch VAPID key:', err.message);
      return null;
    }
  }

  /**
   * Subscribes the current browser to Web Push notifications.
   */
  public static async subscribe(params: {
    contactId?: string;
    userId?: string;
    recipientName?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.isSupported()) {
      return { success: false, error: 'Web Push is not supported on this browser.' };
    }

    try {
      // 1. Request Notification Permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, error: 'Notification permission was denied. Please allow notifications in site settings.' };
      }

      // 2. Register Service Worker
      const registration = await this.registerServiceWorker();
      if (!registration) {
        return { success: false, error: 'Failed to initialize background service worker.' };
      }

      // 3. Fetch VAPID Public Key
      const vapidKey = await this.getVapidPublicKey();
      if (!vapidKey) {
        return { success: false, error: 'Unable to retrieve server push key.' };
      }

      // 4. Create Push Subscription with Browser Push Service
      const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as any,
        });
      }

      // 5. Send subscription to ElderCare AI backend
      const subJson = subscription.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        return { success: false, error: 'Incomplete push subscription payload.' };
      }

      await axios.post(`${API_BASE}/subscribe`, {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
        contactId: params.contactId,
        userId: params.userId,
        recipientName: params.recipientName,
        deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        userAgent: navigator.userAgent,
      });

      return { success: true };
    } catch (err: any) {
      console.error('[PushService] Subscription error:', err);
      return { success: false, error: err.message || 'Subscription failed.' };
    }
  }

  /**
   * Checks whether the current browser already has an active push subscription.
   */
  public static async hasActiveSubscription(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return false;
      const sub = await reg.pushManager.getSubscription();
      return !!sub;
    } catch {
      return false;
    }
  }

  /**
   * Sends a test call ring alert to this contact.
   */
  public static async testRing(contactId: string): Promise<boolean> {
    try {
      const res = await axios.post(`${API_BASE}/test`, { contactId });
      return res.data?.success || false;
    } catch {
      return false;
    }
  }
}
