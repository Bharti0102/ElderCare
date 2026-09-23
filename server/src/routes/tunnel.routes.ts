import { Router, Request, Response } from 'express';
import { CloudflareTunnelService } from '../services/tunnel/cloudflare.tunnel';
import { SmsService } from '../integrations/notifications/sms.service';
import { env } from '../config/env';
import { sendSuccess, sendError } from '../utils/apiResponse';

const router = Router();

/**
 * GET /api/tunnel/status
 * Get the current status of Cloudflare Tunnel and SMS dispatcher.
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = CloudflareTunnelService.getStatus();
    const hasFast2Sms = !!(env.FAST2SMS_API_KEY && env.FAST2SMS_API_KEY.trim().length > 0);

    return sendSuccess(res, {
      tunnel: status,
      sms: {
        provider: hasFast2Sms ? 'Fast2SMS Gateway (Live India SMS)' : 'Simulation Mode',
        configured: hasFast2Sms,
        maskedApiKey: hasFast2Sms
          ? `${env.FAST2SMS_API_KEY.slice(0, 4)}...${env.FAST2SMS_API_KEY.slice(-4)}`
          : null,
      },
      effectiveClientUrl: status.url || env.CLIENT_URL,
    }, 'Tunnel and SMS status retrieved successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500, 'FAILED_TUNNEL_STATUS');
  }
});

/**
 * POST /api/tunnel/start
 * Launch the Cloudflare Tunnel.
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const port = req.body.port ? parseInt(req.body.port, 10) : 5173;
    const url = await CloudflareTunnelService.startTunnel(port);
    return sendSuccess(res, {
      url,
      active: true,
      message: 'Cloudflare Tunnel successfully launched!',
    }, 'Tunnel started successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500, 'TUNNEL_START_ERROR');
  }
});

/**
 * POST /api/tunnel/stop
 * Stop the Cloudflare Tunnel.
 */
router.post('/stop', (req: Request, res: Response) => {
  try {
    CloudflareTunnelService.stopTunnel();
    return sendSuccess(res, { active: false }, 'Tunnel stopped successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500, 'TUNNEL_STOP_ERROR');
  }
});

/**
 * POST /api/tunnel/test-sms
 * Send a test SMS to an Indian phone number with a WebRTC join link.
 */
router.post('/test-sms', async (req: Request, res: Response) => {
  try {
    const { phone, name } = req.body;
    if (!phone) {
      return sendError(res, 'Phone number is required for test SMS.', 400, 'MISSING_PHONE');
    }

    const testCallId = `test-call-${Date.now()}`;
    const result = await SmsService.sendCallLinkSms({
      recipientPhone: phone,
      recipientName: name || 'Caregiver',
      callerName: 'ElderCare AI Test',
      callId: testCallId,
    });

    return sendSuccess(res, result, 'Test SMS dispatched');
  } catch (err: any) {
    return sendError(res, err.message, 500, 'TEST_SMS_ERROR');
  }
});

export default router;
