import { ReminderService } from './reminder.service';
import { Reminder, IReminder } from '../../models/Reminder';

export interface DueNotification {
  reminderId: string;
  userId: string;
  title: string;
  category: string;
  scheduledAt: Date;
  repeat: string;
}

export class ReminderScheduler {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isProcessing = false;
  private static activeAlerts: Map<string, DueNotification> = new Map();

  public static start(intervalMs = 30000): void {
    if (this.intervalId) return;

    console.log(`[ReminderScheduler] Background scheduler initialized (polling every ${intervalMs / 1000}s)`);

    this.intervalId = setInterval(() => {
      this.checkDueReminders().catch((err) => {
        console.error('[ReminderScheduler] Error running due check:', err);
      });
    }, intervalMs);

    // Initial check on boot
    this.checkDueReminders().catch(() => {});
  }

  public static stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[ReminderScheduler] Background scheduler stopped');
    }
  }

  public static async checkDueReminders(): Promise<DueNotification[]> {
    if (this.isProcessing) return [];
    this.isProcessing = true;

    const notified: DueNotification[] = [];

    try {
      const dueList = await ReminderService.getDueReminders();

      for (const rem of dueList) {
        // Notification payload
        const alert: DueNotification = {
          reminderId: rem._id.toString(),
          userId: rem.userId.toString(),
          title: rem.title,
          category: rem.category,
          scheduledAt: rem.scheduledAt,
          repeat: rem.repeat,
        };

        this.activeAlerts.set(rem._id.toString(), alert);
        notified.push(alert);

        console.log(
          `🔔 [Reminder Alert] User: ${rem.userId} | "${rem.title}" is due now (${rem.scheduledAt.toLocaleTimeString()})`
        );

        // Update lastNotifiedAt
        await Reminder.updateOne(
          { _id: rem._id },
          { $set: { lastNotifiedAt: new Date() } }
        );
      }
    } finally {
      this.isProcessing = false;
    }

    return notified;
  }

  public static getActiveAlertsForUser(userId: string): DueNotification[] {
    const userAlerts: DueNotification[] = [];
    this.activeAlerts.forEach((alert) => {
      if (alert.userId === userId) {
        userAlerts.push(alert);
      }
    });
    return userAlerts;
  }

  public static clearAlert(reminderId: string): void {
    this.activeAlerts.delete(reminderId);
  }
}
