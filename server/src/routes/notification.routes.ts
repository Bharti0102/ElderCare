import { Router, Request, Response } from 'express';
import { PushService } from '../integrations/notifications/push.service';
import { PushSubscription } from '../models/PushSubscription';
import { EmergencyContact } from '../models/EmergencyContact';

const router = Router();

/**
 * GET /api/notifications/vapid-key
 * Returns the public VAPID key for client push registration.
 */
router.get('/vapid-key', (_req: Request, res: Response) => {
  try {
    const publicKey = PushService.getPublicKey();
    return res.status(200).json({
      success: true,
      data: { publicKey },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Failed to retrieve VAPID key' },
    });
  }
});

/**
 * POST /api/notifications/subscribe
 * Registers or updates a device push subscription.
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { endpoint, keys, contactId, userId, recipientName, deviceType, userAgent } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid subscription payload. Endpoint and keys are required.' },
      });
    }

    const subscription = await PushService.registerSubscription({
      endpoint,
      keys,
      contactId,
      userId,
      recipientName,
      deviceType,
      userAgent: userAgent || req.headers['user-agent'],
    });

    return res.status(200).json({
      success: true,
      data: { subscription },
      message: 'Push subscription registered successfully',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Failed to save subscription' },
    });
  }
});

/**
 * GET /api/notifications/status/:contactId
 * Returns pairing status & subscription count for a contact.
 */
router.get('/status/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const contact = await EmergencyContact.findById(contactId).select('name relationship phone');
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: { message: 'Contact not found' },
      });
    }

    const subscriptions = await PushSubscription.find({ contactId });

    return res.status(200).json({
      success: true,
      data: {
        contact,
        isPaired: subscriptions.length > 0,
        deviceCount: subscriptions.length,
        devices: subscriptions.map((s) => ({
          id: s._id,
          deviceType: s.deviceType,
          lastActive: s.lastActive,
        })),
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Failed to fetch contact push status' },
    });
  }
});

/**
 * POST /api/notifications/test
 * Dispatches an instant test push ping to a device or contact.
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { endpoint, contactId } = req.body;

    if (endpoint) {
      const delivered = await PushService.sendTestNotification(endpoint);
      return res.status(200).json({
        success: delivered,
        message: delivered ? 'Test ping delivered to device' : 'Test ping failed',
      });
    }

    if (contactId) {
      const contact = await EmergencyContact.findById(contactId);
      const result = await PushService.sendIncomingCallPush({
        callId: 'test-call-' + Date.now(),
        callerName: 'ElderCare AI Test',
        contactName: contact?.name || 'Caregiver',
        contactId,
        callType: 'VOICE',
      });

      return res.status(200).json({
        success: result.sent > 0,
        data: result,
        message: result.sent > 0 ? `Test alert delivered to ${result.sent} device(s)` : 'No active subscriptions found',
      });
    }

    return res.status(400).json({
      success: false,
      error: { message: 'Provide either endpoint or contactId' },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Failed to send test push' },
    });
  }
});

export default router;
