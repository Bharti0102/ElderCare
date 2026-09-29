import { AITool, ToolExecutionResult } from './tool.interface';
import { ReminderService } from '../../reminder/reminder.service';
import { structuredReminderToolSchema } from '../../../validators/reminder.validator';
import { ReminderRepeat, ReminderCategory } from '../../../models/Reminder';

export class ReminderTool implements AITool {
  public readonly name = 'reminder_tool';
  public readonly description = 'Creates, lists, completes, or snoozes medication and daily reminders.';

  private isHindi(text: string): boolean {
    return (
      /[\u0900-\u097F]/.test(text) ||
      /\b(dawai|yaad|paani|baje|subah|shaam|kripya|remind karo|lagao|batao)\b/i.test(text)
    );
  }

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
    if (lower.includes('list') || lower.includes('what are my') || lower.includes('show reminders') || lower.includes('dikhao') || lower.includes('batao') || lower.includes('reminders')) {
      if (lower.includes('list') || lower.includes('show') || lower.includes('kya hai') || lower.includes('dikhao')) {
        action = 'LIST';
      }
    } else if (lower.includes('complete') || lower.includes('mark done') || lower.includes('took my') || lower.includes('le li') || lower.includes('ho gaya')) {
      action = 'COMPLETE';
    } else if (lower.includes('snooze')) {
      action = 'SNOOZE';
    }

    // 2. Detect Category
    let category: ReminderCategory = 'GENERAL';
    if (lower.includes('medicine') || lower.includes('pill') || lower.includes('tablet') || lower.includes('dose') || lower.includes('dawai') || lower.includes('goli')) {
      category = 'MEDICATION';
    } else if (lower.includes('water') || lower.includes('hydrate') || lower.includes('drink') || lower.includes('paani')) {
      category = 'HYDRATION';
    } else if (lower.includes('doctor') || lower.includes('appointment') || lower.includes('clinic') || lower.includes('daktar')) {
      category = 'APPOINTMENT';
    }

    // 3. Detect Recurrence
    let repeat: ReminderRepeat = 'none';
    if (lower.includes('every day') || lower.includes('daily') || lower.includes('roz') || lower.includes('har roz')) {
      repeat = 'daily';
    } else if (lower.includes('every week') || lower.includes('weekly') || lower.includes('har hafte')) {
      repeat = 'weekly';
    } else if (lower.includes('every month') || lower.includes('monthly')) {
      repeat = 'monthly';
    }

    // 4. Calculate Scheduled Time
    const scheduledAt = new Date();

    // Check for specific hour (e.g. "8 pm", "8:00 pm", "8am", "8 am", "8 baje")
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje)?/i);
    if (timeMatch && timeMatch[1]) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = (timeMatch[3] || '').toLowerCase();

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      if (meridiem === 'baje' || !meridiem) {
        if (lower.includes('shaam') || lower.includes('evening') || lower.includes('raat') || lower.includes('night')) {
          if (hours < 12) hours += 12;
        }
      }

      scheduledAt.setHours(hours, minutes, 0, 0);

      if (scheduledAt.getTime() <= Date.now() && !lower.includes('today') && !lower.includes('aaj')) {
        scheduledAt.setDate(scheduledAt.getDate() + 1);
      }
    } else if (lower.includes('tomorrow morning') || lower.includes('kal subah')) {
      scheduledAt.setDate(scheduledAt.getDate() + 1);
      scheduledAt.setHours(9, 0, 0, 0);
    } else if (lower.includes('tomorrow evening') || lower.includes('kal shaam')) {
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
      .replace(/mujhe\s+yaad\s+dilao/i, '')
      .replace(/reminder\s+lagao/i, '')
      .replace(/at \d{1,2}(?::\d{2})?\s*(?:am|pm|baje)/i, '')
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
      title = category === 'MEDICATION' ? (this.isHindi(text) ? 'दवाई लेने का समय' : 'Take Medication') : (this.isHindi(text) ? 'दैनिक रिमाइंडर' : 'Daily Reminder');
    }

    return { action, title, scheduledAt, repeat, category };
  }

  public async execute(
    userId: string,
    parameters: { message?: string; rawAction?: any }
  ): Promise<ToolExecutionResult> {
    const rawInput = parameters.message || '';
    const isHindiText = this.isHindi(rawInput);
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
          message: isHindiText
            ? 'आपके पास इस समय कोई आगामी रिमाइंडर शेड्यूल नहीं है।'
            : 'You have no upcoming pending reminders scheduled at this moment.',
          suggestions: isHindiText
            ? ['रात 8 बजे दवाई का रिमाइंडर लगाएं', 'पानी पीने की याद दिलाएं', 'एक कहानी सुनाइए']
            : ['Remind me to take medicine at 8 PM', 'Remind me to drink water', 'Tell me a story'],
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
        message: isHindiText
          ? `यहाँ आपके आगामी रिमाइंडर हैं:\n\n${listStr}`
          : `Here are your upcoming reminders:\n\n${listStr}`,
        suggestions: isHindiText
          ? ['रिमाइंडर टैब देखें', 'कहानी सुनाएं', 'बेटी को कॉल करें']
          : ['View Reminders tab', 'Snooze reminder', 'Tell me a story'],
      };
    }

    // Default CREATE action
    const reminder = await ReminderService.createReminder(userId, {
      title: validated.title || (isHindiText ? 'दवाई लेने का समय' : 'Take Medication'),
      category: validated.category || 'MEDICATION',
      scheduledAt: validated.scheduledAt || new Date(Date.now() + 3600000),
      repeat: validated.repeat || 'none',
    });

    const timeString = reminder.scheduledAt.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const repeatString = reminder.repeat !== 'none' ? `repeating ${reminder.repeat}` : 'one-time';

    const message = isHindiText
      ? `⏰ मैंने आपका रिमाइंडर सेट कर दिया है: **"${reminder.title}"** समय **${timeString}** (${repeatString})। समय होने पर मैं आपको याद दिलाऊँगा!`
      : `⏰ I have scheduled your reminder: **"${reminder.title}"** for **${timeString}** (${repeatString}). I will notify you when it is time!`;

    return {
      success: true,
      message,
      data: { reminder },
      suggestions: isHindiText
        ? ['मेरे रिमाइंडर देखें', 'पानी पीने का रिमाइंडर लगाएं', 'एक सुंदर कहानी सुनाएं']
        : ['View my reminders', 'Remind me to drink water', 'Tell me a story'],
    };
  }
}

