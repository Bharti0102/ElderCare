import { Response, NextFunction } from 'express';
import { HospitalService } from '../services/calling/hospital.service';
import {
  initiateHospitalCallSchema,
  confirmAppointmentSchema,
  cancelAppointmentSchema,
  saveReceptionSchema,
  createDirectAppointmentSchema,
} from '../validators/appointment.validator';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../types/auth';

export class AppointmentController {
  public static async initiateHumanCall(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = initiateHospitalCallSchema.parse(req.body);
      const result = await HospitalService.initiateHumanCall(req.user!.id, validatedInput);
      sendSuccess(res, result, 'Hospital call connected successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async initiateAICall(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = initiateHospitalCallSchema.parse(req.body);
      const result = await HospitalService.initiateAICall(req.user!.id, validatedInput);
      sendSuccess(res, result, 'AI hospital booking inquiry completed', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async list(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const appointments = await HospitalService.getAppointments(req.user!.id);
      sendSuccess(res, { appointments }, 'Appointments retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const appointment = await HospitalService.getAppointmentById(req.user!.id, String(req.params.id));
      sendSuccess(res, { appointment }, 'Appointment retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async createDirect(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = createDirectAppointmentSchema.parse(req.body);
      const appointment = await HospitalService.createDirectAppointment(req.user!.id, validatedInput);
      sendSuccess(res, { appointment }, 'Appointment booked successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async confirm(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = confirmAppointmentSchema.parse(req.body);
      const appointment = await HospitalService.confirmAppointment(
        req.user!.id,
        String(req.params.id),
        validatedInput
      );
      sendSuccess(res, { appointment }, 'Appointment confirmed successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async cancel(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = cancelAppointmentSchema.parse(req.body);
      const appointment = await HospitalService.cancelAppointment(
        req.user!.id,
        String(req.params.id),
        validatedInput.reason
      );
      sendSuccess(res, { appointment }, 'Appointment cancelled successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async delete(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await HospitalService.deleteAppointment(req.user!.id, String(req.params.id));
      sendSuccess(res, null, 'Appointment deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getTarget(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const prescriptionId = req.query.prescriptionId as string | undefined;
      const target = await HospitalService.resolveHospitalTarget(req.user!.id, prescriptionId);
      sendSuccess(res, { target }, 'Hospital target resolved successfully');
    } catch (err) {
      next(err);
    }
  }

  // --- Saved Clinic & Reception Desks ---

  public static async listReceptions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const receptions = await HospitalService.getReceptions(req.user!.id);
      sendSuccess(res, { receptions }, 'Saved receptions retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async createReception(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = saveReceptionSchema.parse(req.body);
      const reception = await HospitalService.createReception(req.user!.id, validatedInput);
      sendSuccess(res, { reception }, 'Reception contact saved successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateReception(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = saveReceptionSchema.partial().parse(req.body);
      const reception = await HospitalService.updateReception(
        req.user!.id,
        String(req.params.id),
        validatedInput
      );
      sendSuccess(res, { reception }, 'Reception contact updated successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async deleteReception(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await HospitalService.deleteReception(req.user!.id, String(req.params.id));
      sendSuccess(res, null, 'Reception contact removed successfully');
    } catch (err) {
      next(err);
    }
  }
}

