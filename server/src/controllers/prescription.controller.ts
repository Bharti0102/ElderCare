import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { PrescriptionService } from '../services/prescription/prescription.service';
import {
  confirmPrescriptionSchema,
  createRemindersFromPrescriptionSchema,
} from '../validators/prescription.validator';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/apiError';

export class PrescriptionController {
  public static async uploadAndAnalyze(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('Please select a prescription document to upload', 400, 'FILE_MISSING');
      }

      const prescription = await PrescriptionService.uploadAndAnalyze(req.user!.id, req.file);

      sendSuccess(res, { prescription }, 'Prescription uploaded and analyzed successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async getPrescriptions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const prescriptions = await PrescriptionService.getPrescriptions(req.user!.id);
      sendSuccess(res, { prescriptions }, 'Prescriptions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getPrescriptionById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const prescription = await PrescriptionService.getPrescriptionById(req.user!.id, id);
      sendSuccess(res, { prescription }, 'Prescription details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async confirmPrescription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const validated = confirmPrescriptionSchema.parse(req.body);
      const prescription = await PrescriptionService.confirmPrescription(
        req.user!.id,
        id,
        validated
      );
      sendSuccess(res, { prescription }, 'Prescription confirmed and verified successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async bridgeToReminders(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const validated = createRemindersFromPrescriptionSchema.parse(req.body || {});
      const reminders = await PrescriptionService.bridgeToReminders(
        req.user!.id,
        id,
        validated
      );
      sendSuccess(
        res,
        { reminders, count: reminders.length },
        `Successfully created ${reminders.length} medication reminders from prescription`,
        201
      );
    } catch (error) {
      next(error);
    }
  }

  public static async deletePrescription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      await PrescriptionService.deletePrescription(req.user!.id, id);
      sendSuccess(res, null, 'Prescription deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
