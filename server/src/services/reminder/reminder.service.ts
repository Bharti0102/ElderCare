import { Types } from 'mongoose';
import { Reminder, IReminder, ReminderRepeat } from '../../models/Reminder';
import { AppError } from '../../utils/apiError';
import {
  CreateReminderInput,
  UpdateReminderInput,
  SnoozeReminderInput,
} from '../../validators/reminder.validator';

export class ReminderService {
  public static calculateNextOccurrence(currentDate: Date, repeat: ReminderRepeat): Date {
    const next = new Date(currentDate);
    const now = new Date();

    // Ensure we start from at least now if the scheduled date was in the past
    const base = next.getTime() < now.getTime() ? now : next;

    switch (repeat) {
      case 'daily':
        base.setDate(base.getDate() + 1);
        return base;
      case 'weekly':
        base.setDate(base.getDate() + 7);
        return base;
      case 'monthly':
        base.setMonth(base.getMonth() + 1);
        return base;
      case 'none':
      default:
        return next;
    }
  }

  public static async createReminder(
    userId: string,
    input: CreateReminderInput
  ): Promise<IReminder> {
    const userObjectId = new Types.ObjectId(userId);

    const reminder = await Reminder.create({
      userId: userObjectId,
      title: input.title,
      description: input.description || '',
      category: input.category || 'MEDICATION',
      scheduledAt: new Date(input.scheduledAt),
      repeat: input.repeat || 'none',
      status: 'PENDING',
    });

    return reminder;
  }

  public static async getReminders(
    userId: string,
    status?: string
  ): Promise<IReminder[]> {
    const userObjectId = new Types.ObjectId(userId);
    const filter: any = { userId: userObjectId };

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    return Reminder.find(filter).sort({ scheduledAt: 1 }).exec();
  }

  public static async getReminderById(
    userId: string,
    reminderId: string
  ): Promise<IReminder> {
    if (!Types.ObjectId.isValid(reminderId)) {
      throw new AppError('Invalid reminder ID format.', 400, 'INVALID_ID');
    }

    const reminder = await Reminder.findOne({
      _id: new Types.ObjectId(reminderId),
      userId: new Types.ObjectId(userId),
    });

    if (!reminder) {
      throw new AppError('Reminder not found.', 404, 'REMINDER_NOT_FOUND');
    }

    return reminder;
  }

  public static async updateReminder(
    userId: string,
    reminderId: string,
    input: UpdateReminderInput
  ): Promise<IReminder> {
    const reminder = await this.getReminderById(userId, reminderId);

    if (input.title !== undefined) reminder.title = input.title;
    if (input.description !== undefined) reminder.description = input.description;
    if (input.category !== undefined) reminder.category = input.category;
    if (input.scheduledAt !== undefined) reminder.scheduledAt = new Date(input.scheduledAt);
    if (input.repeat !== undefined) reminder.repeat = input.repeat;
    if (input.status !== undefined) reminder.status = input.status;

    await reminder.save();
    return reminder;
  }

  public static async deleteReminder(
    userId: string,
    reminderId: string
  ): Promise<void> {
    const reminder = await this.getReminderById(userId, reminderId);
    await Reminder.deleteOne({ _id: reminder._id });
  }

  public static async completeReminder(
    userId: string,
    reminderId: string
  ): Promise<{ reminder: IReminder; recurringNextDate?: Date }> {
    const reminder = await this.getReminderById(userId, reminderId);

    if (reminder.repeat === 'none') {
      reminder.status = 'COMPLETED';
      await reminder.save();
      return { reminder };
    }

    // Advance recurring reminder to next occurrence
    const nextDate = this.calculateNextOccurrence(reminder.scheduledAt, reminder.repeat);
    reminder.scheduledAt = nextDate;
    reminder.status = 'PENDING';
    reminder.snoozedUntil = undefined;
    await reminder.save();

    return { reminder, recurringNextDate: nextDate };
  }

  public static async snoozeReminder(
    userId: string,
    reminderId: string,
    input: SnoozeReminderInput
  ): Promise<IReminder> {
    const reminder = await this.getReminderById(userId, reminderId);
    const minutes = input.minutes || 10;

    const snoozedTime = new Date(Date.now() + minutes * 60 * 1000);
    reminder.status = 'SNOOZED';
    reminder.snoozedUntil = snoozedTime;
    reminder.scheduledAt = snoozedTime;

    await reminder.save();
    return reminder;
  }

  public static async getDueReminders(userId?: string): Promise<IReminder[]> {
    const now = new Date();
    const filter: any = {
      status: { $in: ['PENDING', 'SNOOZED'] },
      scheduledAt: { $lte: now },
    };

    if (userId) {
      filter.userId = new Types.ObjectId(userId);
    }

    return Reminder.find(filter).sort({ scheduledAt: 1 }).limit(20).exec();
  }
}
