import { Response, NextFunction } from 'express';
import { ReminderService } from '../services/reminder/reminder.service';
import {
  createReminderSchema,
  updateReminderSchema,
  snoozeReminderSchema,
} from '../validators/reminder.validator';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../types/auth';

export class ReminderController {
  public static async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validatedInput = createReminderSchema.parse(req.body);
      const reminder = await ReminderService.createReminder(req.user!.id, validatedInput);
      sendSuccess(res, { reminder }, 'Reminder created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async list(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const reminders = await ReminderService.getReminders(req.user!.id, status);
      sendSuccess(res, { reminders }, 'Reminders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const reminderId = String(req.params.id);
      const reminder = await ReminderService.getReminderById(req.user!.id, reminderId);
      sendSuccess(res, { reminder }, 'Reminder retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async update(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const reminderId = String(req.params.id);
      const validatedInput = updateReminderSchema.parse(req.body);
      const reminder = await ReminderService.updateReminder(
        req.user!.id,
        reminderId,
        validatedInput
      );
      sendSuccess(res, { reminder }, 'Reminder updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async delete(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const reminderId = String(req.params.id);
      await ReminderService.deleteReminder(req.user!.id, reminderId);
      sendSuccess(res, null, 'Reminder deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async complete(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const reminderId = String(req.params.id);
      const result = await ReminderService.completeReminder(req.user!.id, reminderId);
      sendSuccess(
        res,
        result,
        result.recurringNextDate
          ? 'Recurring reminder completed and advanced to next occurrence'
          : 'Reminder marked as completed'
      );
    } catch (error) {
      next(error);
    }
  }

  public static async snooze(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const reminderId = String(req.params.id);
      const validatedInput = snoozeReminderSchema.parse(req.body);
      const reminder = await ReminderService.snoozeReminder(
        req.user!.id,
        reminderId,
        validatedInput
      );
      sendSuccess(res, { reminder }, 'Reminder snoozed successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getDue(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dueReminders = await ReminderService.getDueReminders(req.user!.id);
      sendSuccess(res, { reminders: dueReminders }, 'Due reminders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
