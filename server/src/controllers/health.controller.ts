import { Request, Response } from 'express';
import { HealthService } from '../services/health.service';
import { sendSuccess } from '../utils/apiResponse';

export class HealthController {
  public static check(req: Request, res: Response): void {
    const health = HealthService.getHealth();
    sendSuccess(res, health, 'System health retrieved successfully');
  }
}
