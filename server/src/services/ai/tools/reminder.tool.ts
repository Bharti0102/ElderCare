import { AITool, ToolExecutionResult } from './tool.interface';
import { ReminderService } from '../../reminder/reminder.service';
import { structuredReminderToolSchema } from '../../../validators/reminder.validator';
import { ReminderRepeat, ReminderCategory } from '../../../models/Reminder';

export class ReminderTool implements AITool {
  public readonly name = 'reminder_tool';
  public readonly description = 'Creates, lists, completes, or snoozes medication and daily reminders.';

  private parseNaturalLanguage(text: string): {
    action: 'CREATE' | 'LIST' | 'COMPLETE' | 'SNOOZE' | 'DELETE';
    title: string;
    scheduledAt: Date;
    repeat: ReminderRepeat;
    category: ReminderCategory;
  } {
    const lower = text.toLowerCase();

    // 1. Detect Action
    let action: 'CREATE' | 'LIST' | 'COMPLETE' | 'SNOOZE' | 'DELETE' = 'CREATE';
    if (lower.includes('list') || lower.includes('what are my') || lower.includes('show reminders')) {
      action = 'LIST';
    } else if (lower.includes('complete') || lower.includes('mark done') || lower.includes('took my')) {
      action = 'COMPLETE';
    } else if (lower.includes('snooze')) {
      action = 'SNOOZE';
    }

    // 2. Detect Category
    let category: ReminderCategory = 'GENERAL';
    if (lower.includes('medicine') || lower.includes('pill') || lower.includes('tablet') || lower.includes('dose')) {
      category = 'MEDICATION';
    } else if (lower.includes('water') || lower.includes('hydrate') || lower.includes('drink')) {
      category = 'HYDRATION';
    } else if (lower.includes('doctor') || lower.includes('appointment') || lower.includes('clinic')) {
      category = 'APPOINTMENT';
    }

    // 3. Detect Recurrence
    let repeat: ReminderRepeat = 'none';
    if (lower.includes('every day') || lower.includes('daily')) {
      repeat = 'daily';
    } else if (lower.includes('every week') || lower.includes('weekly')) {
      repeat = 'weekly';
    } else if (lower.includes('every month') || lower.includes('monthly')) {
      repeat = 'monthly';
    }

    // 4. Calculate Scheduled Time
    const scheduledAt = new Date();

    // Check for specific hour (e.g. "8 pm", "8:00 pm", "8am", "8 am")
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3].toLowerCase();

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;

      scheduledAt.setHours(hours, minutes, 0, 0);

      // If that time has already passed today and not explicitly "tomorrow", schedule for tomorrow
      if (scheduledAt.getTime() <= Date.now() && !lower.includes('today')) {
        scheduledAt.setDate(scheduledAt.getDate() + 1);
      }
    } else if (lower.includes('tomorrow morning')) {
      scheduledAt.setDate(scheduledAt.getDate() + 1);
      scheduledAt.setHours(9, 0, 0, 0);
    } else if (lower.includes('tomorrow evening')) {
      scheduledAt.setDate(scheduledAt.getDate() + 1);
      scheduledAt.setHours(19, 0, 0, 0);
    } else {
      // Default: 1 hour from now
      scheduledAt.setHours(scheduledAt.getHours() + 1, 0, 0, 0);
    }

    // 5. Clean Title extraction
    let title = text
      .replace(/remind me to/i, '')
      .replace(/remind me/i, '')
      .replace(/please set a reminder to/i, '')
      .replace(/set a reminder for/i, '')
      .replace(/at \d{1,2}(?::\d{2})?\s*(?:am|pm)/i, '')
      .replace(/every day/i, '')
      .replace(/daily/i, '')
      .replace(/tomorrow morning/i, '')
      .replace(/tomorrow/i, '')
      .trim();

    if (title.startsWith('to ')) {
      title = title.substring(3).trim();
    }

    // Capitalize first letter
    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    } else {
      title = category === 'MEDICATION' ? 'Take Medication' : 'Daily Reminder';
    }

    return { action, title, scheduledAt, repeat, category };
  }

  public async execute(
    userId: string,
    parameters: { message?: string; rawAction?: any }
  ): Promise<ToolExecutionResult> {
    const rawInput = parameters.message || '';
    const parsed = this.parseNaturalLanguage(rawInput);

    // Validate structured tool parameters
    const validated = structuredReminderToolSchema.parse({
      action: parsed.action,
      title: parsed.title,
      scheduledAt: parsed.scheduledAt,
      repeat: parsed.repeat,
      category: parsed.category,
    });

    if (validated.action === 'LIST') {
      const reminders = await ReminderService.getReminders(userId, 'PENDING');
      if (reminders.length === 0) {
        return {
          success: true,
          message: 'You have no upcoming pending reminders scheduled at this moment.',
          suggestions: ['Remind me to take medicine at 8 PM', 'Remind me to drink water', 'Tell me a story'],
        };
      }

      const listStr = reminders
        .map(
          (r, idx) =>
            `${idx + 1}. **${r.title}** scheduled for ${r.scheduledAt.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })} (${r.repeat !== 'none' ? r.repeat : 'once'})`
        )
        .join('\n');

      return {
        success: true,
        message: `Here are your upcoming reminders:\n\n${listStr}`,
        suggestions: ['View Reminders tab', 'Snooze reminder', 'Tell me a story'],
      };
    }

    // Default CREATE action
    const reminder = await ReminderService.createReminder(userId, {
      title: validated.title || 'Take Medication',
      category: validated.category || 'MEDICATION',
      scheduledAt: validated.scheduledAt || new Date(Date.now() + 3600000),
      repeat: validated.repeat || 'none',
    });

    const timeString = reminder.scheduledAt.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const repeatString = reminder.repeat !== 'none' ? `repeating ${reminder.repeat}` : 'one-time';

    return {
      success: true,
      message: `⏰ I have scheduled your reminder: **"${reminder.title}"** for **${timeString}** (${repeatString}). I will notify you when it is time!`,
      data: { reminder },
      suggestions: ['View my reminders', 'Remind me to drink water', 'Tell me a story'],
    };
  }
}
