import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';
import { PushSubscription } from '../../models/PushSubscription';
import { CloudflareTunnelService } from '../../services/tunnel/cloudflare.tunnel';

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  contactId?: string;
  userId?: string;
  recipientName?: string;
  deviceType?: string;
  userAgent?: string;
}

export interface IncomingCallPushPayload {
  callId: string;
  callerName: string;
  contactName: string;
  contactId?: string;
  userId?: string;
  callType?: 'VOICE' | 'VIDEO';
  joinUrl?: string;
}

export class PushService {
  private static isInitialized = false;
  private static vapidPublicKey = '';
  private static vapidPrivateKey = '';
  private static vapidSubject = '';

  /**
   * Initializes VAPID keys for W3C Web Push protocol.
   * Auto-generates and persists keys to disk if not found in environment.
   */
  public static init(): void {
    if (this.isInitialized) return;

    this.vapidSubject = env.VAPID_SUBJECT || 'mailto:support@eldercare.ai';

    let pubKey = env.VAPID_PUBLIC_KEY;
    let privKey = env.VAPID_PRIVATE_KEY;

    // Persist auto-generated keys in a local cache file if .env keys are missing
    const keyCacheFile = path.resolve(process.cwd(), '.vapid_keys.json');

    if (!pubKey || !privKey) {
      if (fs.existsSync(keyCacheFile)) {
        try {
          const cached = JSON.parse(fs.readFileSync(keyCacheFile, 'utf8'));
          pubKey = cached.publicKey;
          privKey = cached.privateKey;
        } catch {
          // ignore read error
        }
      }
    }

    if (!pubKey || !privKey) {
      const generated = webpush.generateVAPIDKeys();
      pubKey = generated.publicKey;
      privKey = generated.privateKey;
      try {
        fs.writeFileSync(keyCacheFile, JSON.stringify(generated, null, 2), 'utf8');
      } catch {
        // non-fatal
      }
    }

    this.vapidPublicKey = pubKey;
    this.vapidPrivateKey = privKey;

    try {
      webpush.setVapidDetails(this.vapidSubject, this.vapidPublicKey, this.vapidPrivateKey);
      this.isInitialized = true;
      console.log('[PushService] Web Push (VAPID) initialized successfully (Zero Cost)');
    } catch (err: any) {
      console.error('[PushService] Failed to set VAPID details:', err.message);
    }
  }

  /**
   * Returns the VAPID public key needed by client browsers to subscribe.
   */
  public static getPublicKey(): string {
    this.init();
    return this.vapidPublicKey;
  }

  /**
   * Registers or updates a device push subscription.
   */
  public static async registerSubscription(input: PushSubscriptionInput): Promise<any> {
    this.init();

    const updateData: any = {
      keys: input.keys,
      deviceType: input.deviceType || 'mobile',
      userAgent: input.userAgent,
      lastActive: new Date(),
    };

    if (input.contactId) updateData.contactId = input.contactId;
    if (input.userId) updateData.userId = input.userId;
    if (input.recipientName) updateData.recipientName = input.recipientName;

    const sub = await PushSubscription.findOneAndUpdate(
      { endpoint: input.endpoint },
      { $set: updateData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`[PushService] Registered device push subscription for contact: ${input.contactId || 'unknown'}`);
    return sub;
  }

  /**
   * Dispatches a high-priority WhatsApp-style incoming call push alert.
   */
  public static async sendIncomingCallPush(params: IncomingCallPushPayload): Promise<{ sent: number; failed: number }> {
    this.init();

    // Find all subscriptions registered for this contact or user
    const query: any = {};
    if (params.contactId) {
      query.contactId = params.contactId;
    } else if (params.userId) {
      query.userId = params.userId;
    } else {
      return { sent: 0, failed: 0 };
    }

    const subscriptions = await PushSubscription.find(query);
    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[PushService] No push subscriptions found for contact: ${params.contactId || params.userId}`);
      return { sent: 0, failed: 0 };
    }

    const activeTunnel = CloudflareTunnelService.getTunnelUrl();
    const clientBase = activeTunnel || env.CLOUDFLARE_TUNNEL_URL || env.CLIENT_URL || 'http://localhost:5173';
    const joinUrl = params.joinUrl || `${clientBase.replace(/\/$/, '')}/call/join/${params.callId}`;
    const caller = params.callerName || 'Your loved one';
    const isVideo = params.callType === 'VIDEO';

    const payload = JSON.stringify({
      title: `📞 Incoming ${isVideo ? 'Video' : 'Voice'} Call`,
      body: `${caller} is calling you right now. Tap to answer!`,
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: `incoming-call-${params.callId}`,
      requireInteraction: true,
      renotify: true,
      vibrate: [400, 200, 400, 200, 800],
      data: {
        type: 'INCOMING_CALL',
        callId: params.callId,
        callerName: caller,
        joinUrl,
        callType: params.callType || 'VOICE',
      },
      actions: [
        { action: 'answer', title: '🟢 Answer Call' },
        { action: 'decline', title: '🔴 Decline' },
      ],
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSub, payload, {
          urgency: 'high',
          TTL: 60, // 60 seconds lifetime for urgent call notifications
        });
        sent++;
        console.log(`[PushService] ✅ Push notification dispatched to device: ${sub._id}`);
      } catch (err: any) {
        failed++;
        console.warn(`[PushService] Failed to deliver push notification (${err.statusCode || err.message})`);
        // Remove expired subscriptions (HTTP 404 or 410 Gone)
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[PushService] Pruning expired subscription: ${sub._id}`);
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    }

    return { sent, failed };
  }

  /**
   * Sends a test ping notification to verify device receipt.
   */
  public static async sendTestNotification(endpoint: string): Promise<boolean> {
    this.init();
    const sub = await PushSubscription.findOne({ endpoint });
    if (!sub) return false;

    const payload = JSON.stringify({
      title: '🔔 ElderCare AI Connected!',
      body: 'Your device is ready to receive instant 1-click calls.',
      icon: '/vite.svg',
      badge: '/vite.svg',
      data: {
        type: 'TEST_PING',
      },
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        payload
      );
      return true;
    } catch (err: any) {
      console.warn('[PushService] Test ping failed:', err.message);
      return false;
    }
  }
}
