import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { CallingService } from '../services/calling/calling.service';
import {
  initiateCaregiverCallSchema,
  updateCallStatusSchema,
} from '../validators/calling.validator';
import { sendSuccess } from '../utils/apiResponse';

export class CallingController {
  public static async initiateCaregiverCall(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = initiateCaregiverCallSchema.parse(req.body || {});
      const call = await CallingService.initiateCaregiverCall(
        req.user!.id,
        validated
      );
      sendSuccess(
        res,
        { call },
        `Call connected to ${call.contactName} (${call.relationship})`,
        201
      );
    } catch (error) {
      next(error);
    }
  }

  public static async getCalls(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filter: { type?: string; status?: string } = {};
      if (typeof req.query.type === 'string') filter.type = req.query.type;
      if (typeof req.query.status === 'string') filter.status = req.query.status;

      const calls = await CallingService.getCalls(req.user!.id, filter);
      sendSuccess(res, { calls }, 'Call records retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getCallById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const call = await CallingService.getCallById(req.user!.id, id);
      sendSuccess(res, { call }, 'Call details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async updateCallStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const validated = updateCallStatusSchema.parse(req.body);
      const call = await CallingService.updateCallStatus(
        req.user!.id,
        id,
        validated.status,
        validated.durationSeconds,
        validated.notes
      );
      sendSuccess(res, { call }, 'Call status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async hangupCall(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const call = await CallingService.hangupCall(req.user!.id, id);
      sendSuccess(res, { call }, 'Call ended successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getTelephonyStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const status = await CallingService.getTelephonyStatus();
      sendSuccess(res, status, 'Telephony status retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getPublicCallInfo(
    req: any,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const call = await CallingService.getPublicCallInfo(id);
      sendSuccess(res, { call }, 'Call room details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
